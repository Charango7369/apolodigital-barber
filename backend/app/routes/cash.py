from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime
from ..database import get_db
from ..auth import get_current_user, get_current_tenant_id, RequireRole

router = APIRouter(prefix="/cash", tags=["cash"])

class OpenShiftRequest(BaseModel):
    initial_cash: float
    notes: Optional[str] = ""

class CloseShiftRequest(BaseModel):
    actual_cash_counted: float
    notes: Optional[str] = ""

@router.get("/current")
def get_current_shift(
    user: dict = Depends(RequireRole(["owner", "admin"])),
    tenant_id: str = Depends(get_current_tenant_id)
):
    """Retrieve the active open cash shift with real-time totals."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM cash_shifts 
        WHERE tenant_id = ? AND status = 'open' 
        ORDER BY opened_at DESC LIMIT 1
    """, (tenant_id,))
    shift = cursor.fetchone()

    if not shift:
        conn.close()
        return {"is_open": False, "shift": None}

    shift_dict = dict(shift)
    shift_id = shift_dict["id"]

    # Calculate real-time sales for this shift
    cursor.execute("""
        SELECT 
            COUNT(*) as total_sales_count,
            COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0.0) as real_cash,
            COALESCE(SUM(CASE WHEN payment_method != 'cash' THEN total ELSE 0 END), 0.0) as real_qr,
            COALESCE(SUM(total), 0.0) as real_total
        FROM sales 
        WHERE cash_shift_id = ? AND tenant_id = ?
    """, (shift_id, tenant_id))
    totals = cursor.fetchone()

    system_cash = totals["real_cash"]
    system_qr = totals["real_qr"]
    system_total = totals["real_total"]
    expected_drawer = shift_dict["initial_cash"] + system_cash

    # Update theoretical totals in database
    cursor.execute("""
        UPDATE cash_shifts
        SET system_cash_sales = ?, system_qr_sales = ?, system_total_sales = ?, expected_cash_in_drawer = ?
        WHERE id = ?
    """, (system_cash, system_qr, system_total, expected_drawer, shift_id))
    conn.commit()

    shift_dict.update({
        "system_cash_sales": system_cash,
        "system_qr_sales": system_qr,
        "system_total_sales": system_total,
        "expected_cash_in_drawer": expected_drawer,
        "sales_count": totals["total_sales_count"]
    })

    conn.close()
    return {"is_open": True, "shift": shift_dict}

@router.post("/open")
def open_cash_shift(
    payload: OpenShiftRequest,
    user: dict = Depends(RequireRole(["owner", "admin"])),
    tenant_id: str = Depends(get_current_tenant_id)
):
    """Open a new cash shift. Fails if an open shift already exists."""
    if payload.initial_cash < 0:
        raise HTTPException(status_code=400, detail="El fondo inicial de caja no puede ser negativo")

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM cash_shifts WHERE tenant_id = ? AND status = 'open'", (tenant_id,))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Ya existe un turno de caja abierto. Ciérrelo antes de abrir uno nuevo.")

    shift_id = f"shift-{uuid.uuid4().hex[:8]}"
    now_str = datetime.now().isoformat()

    cursor.execute("""
        INSERT INTO cash_shifts (
            id, tenant_id, opened_by_user_id, opened_by_name, opened_at,
            initial_cash, status, system_cash_sales, system_qr_sales, system_total_sales,
            expected_cash_in_drawer, actual_cash_counted, difference, notes
        ) VALUES (?, ?, ?, ?, ?, ?, 'open', 0.0, 0.0, 0.0, ?, 0.0, 0.0, ?)
    """, (
        shift_id, tenant_id, user["sub"], user.get("full_name", "Usuario"),
        now_str, payload.initial_cash, payload.initial_cash, payload.notes or ""
    ))

    conn.commit()
    cursor.execute("SELECT * FROM cash_shifts WHERE id = ?", (shift_id,))
    row = cursor.fetchone()
    conn.close()

    return {"message": "Turno de caja abierto exitosamente", "shift": dict(row)}

@router.post("/close")
def close_cash_shift(
    payload: CloseShiftRequest,
    user: dict = Depends(RequireRole(["owner", "admin"])),
    tenant_id: str = Depends(get_current_tenant_id)
):
    """
    Blind Reconciliation (Cierre Ciego):
    The cashier declares the counted cash ('actual_cash_counted').
    The system computes the difference, seals the shift as 'closed', and locks all financial transactions.
    """
    if payload.actual_cash_counted < 0:
        raise HTTPException(status_code=400, detail="El conteo físico de efectivo no puede ser negativo")

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM cash_shifts 
        WHERE tenant_id = ? AND status = 'open' 
        ORDER BY opened_at DESC LIMIT 1
    """, (tenant_id,))
    shift = cursor.fetchone()

    if not shift:
        conn.close()
        raise HTTPException(status_code=400, detail="No hay ningún turno de caja abierto para cerrar")

    shift_dict = dict(shift)
    shift_id = shift_dict["id"]
    now_str = datetime.now().isoformat()

    # Recalculate definitive figures
    cursor.execute("""
        SELECT 
            COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0.0) as real_cash,
            COALESCE(SUM(CASE WHEN payment_method != 'cash' THEN total ELSE 0 END), 0.0) as real_qr,
            COALESCE(SUM(total), 0.0) as real_total
        FROM sales 
        WHERE cash_shift_id = ? AND tenant_id = ?
    """, (shift_id, tenant_id))
    totals = cursor.fetchone()

    system_cash = totals["real_cash"]
    system_qr = totals["real_qr"]
    system_total = totals["real_total"]
    expected_drawer = shift_dict["initial_cash"] + system_cash
    difference = round(payload.actual_cash_counted - expected_drawer, 2)

    status_verdict = "Cuadre exacto"
    if difference < 0:
        status_verdict = f"FALTANTE de Bs. {abs(difference):.2f}"
    elif difference > 0:
        status_verdict = f"SOBRANTE de Bs. {difference:.2f}"

    cursor.execute("""
        UPDATE cash_shifts
        SET closed_by_user_id = ?,
            closed_by_name = ?,
            closed_at = ?,
            status = 'closed',
            system_cash_sales = ?,
            system_qr_sales = ?,
            system_total_sales = ?,
            expected_cash_in_drawer = ?,
            actual_cash_counted = ?,
            difference = ?,
            notes = ?
        WHERE id = ?
    """, (
        user["sub"], user.get("full_name", "Usuario"), now_str,
        system_cash, system_qr, system_total, expected_drawer,
        payload.actual_cash_counted, difference,
        f"{payload.notes or ''} | Veredicto: {status_verdict}".strip(" |"),
        shift_id
    ))

    conn.commit()
    cursor.execute("SELECT * FROM cash_shifts WHERE id = ?", (shift_id,))
    closed_row = cursor.fetchone()
    conn.close()

    return {
        "message": f"Turno de caja cerrado exitosamente. {status_verdict}",
        "verdict": status_verdict,
        "difference": difference,
        "shift": dict(closed_row)
    }

@router.get("/shifts")
def get_shifts_history(
    user: dict = Depends(RequireRole(["owner", "admin"])),
    tenant_id: str = Depends(get_current_tenant_id)
):
    """View past shifts history."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM cash_shifts 
        WHERE tenant_id = ? 
        ORDER BY opened_at DESC LIMIT 30
    """, (tenant_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
