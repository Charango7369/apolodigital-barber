from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import uuid
from datetime import datetime
from ..database import get_db, DEFAULT_TENANT_ID
from ..models import CheckoutCreate, SaleResponse
from ..auth import get_current_user_optional

router = APIRouter(prefix="/checkout", tags=["checkout"])

@router.get("/sales", response_model=List[SaleResponse])
def get_sales(
    date: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    tenant_id = user.get("tenant_id") if user else DEFAULT_TENANT_ID

    # SoD: Barberos solo pueden ver sus propias ventas
    barber_filter = None
    if user and user.get("role") == "barber":
        barber_filter = user.get("barber_id")

    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM sales WHERE tenant_id = ?"
    params = [tenant_id]

    if barber_filter:
        query += " AND barber_id = ?"
        params.append(barber_filter)

    if date:
        query += " AND created_at LIKE ?"
        params.append(f"{date}%")

    query += " ORDER BY created_at DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@router.post("", response_model=SaleResponse)
def process_checkout(
    payload: CheckoutCreate,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    # 1. Segregación de Funciones (SoD)
    if user:
        if user.get("role") in ["barber", "client"]:
            raise HTTPException(
                status_code=403,
                detail="Violación de Segregación de Funciones (SoD): El personal operativo (barberos/clientes) no puede cobrar directamente en caja. El cobro debe ser procesado por el Administrador o Dueño."
            )
        tenant_id = user.get("tenant_id") or DEFAULT_TENANT_ID
    else:
        tenant_id = DEFAULT_TENANT_ID

    conn = get_db()
    cursor = conn.cursor()

    # 2. Control de Turno de Caja Abierto
    cursor.execute("""
        SELECT id FROM cash_shifts 
        WHERE tenant_id = ? AND status = 'open' 
        ORDER BY opened_at DESC LIMIT 1
    """, (tenant_id,))
    active_shift = cursor.fetchone()

    if not active_shift:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="Caja Cerrada: No existe un turno de caja abierto para registrar ventas. Inicie la jornada con la apertura de caja."
        )

    cash_shift_id = active_shift["id"]

    # 3. Prevención de Fraude con Comprobantes QR Simple
    qr_ref = payload.qr_reference_code.strip() if payload.qr_reference_code else None
    if payload.payment_method == "qr_simple":
        if not qr_ref:
            conn.close()
            raise HTTPException(
                status_code=400,
                detail="Comprobante Requerido: Para transacciones con QR Simple es obligatorio registrar el Código de Referencia/Autorización bancario."
            )
        # Verificar no-duplicidad del comprobante en este tenant
        cursor.execute("SELECT id FROM sales WHERE tenant_id = ? AND qr_reference_code = ?", (tenant_id, qr_ref))
        existing_qr = cursor.fetchone()
        if existing_qr:
            conn.close()
            raise HTTPException(
                status_code=409,
                detail=f"Fraude Detectado: El comprobante QR con referencia '{qr_ref}' ya fue registrado en la venta {existing_qr['id']}. No se admiten comprobantes reutilizados."
            )

    sale_id = f"sal-{uuid.uuid4().hex[:6]}"
    now_str = datetime.now().isoformat()

    # 4. Snapshot de comisión del barbero (Inmutabilidad financiera)
    cursor.execute("SELECT commission_rate FROM barbers WHERE id = ? AND tenant_id = ?", (payload.barber_id, tenant_id))
    barber_row = cursor.fetchone()
    commission_rate = barber_row["commission_rate"] if barber_row else 0.50

    service_price_snapshot = float(payload.services_total)
    commission_percentage_snapshot = float(commission_rate)
    commission_amount = round(service_price_snapshot * commission_percentage_snapshot, 2)

    subtotal = payload.services_total + payload.products_total
    total = subtotal + payload.tip

    cursor.execute("""
        INSERT INTO sales (
            id, tenant_id, cash_shift_id, appointment_id, client_name, barber_id, barber_name,
            subtotal, tip, total, payment_method, qr_reference_code, service_price_snapshot,
            commission_percentage_snapshot, commission_amount, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        sale_id, tenant_id, cash_shift_id, payload.appointment_id, payload.client_name,
        payload.barber_id, payload.barber_name, subtotal,
        payload.tip, total, payload.payment_method, qr_ref,
        service_price_snapshot, commission_percentage_snapshot, commission_amount,
        payload.notes or "", now_str
    ))

    # 5. Si proviene de una cita, congelar y marcar como 'completed'
    if payload.appointment_id:
        cursor.execute("SELECT client_id, date FROM appointments WHERE id = ? AND tenant_id = ?", (payload.appointment_id, tenant_id))
        apt = cursor.fetchone()
        if apt:
            cursor.execute("UPDATE appointments SET status = 'completed' WHERE id = ? AND tenant_id = ?", (payload.appointment_id, tenant_id))
            if apt["client_id"]:
                cursor.execute("""
                    UPDATE clients 
                    SET total_visits = total_visits + 1,
                        total_spent = total_spent + ?,
                        last_visit = ?
                    WHERE id = ? AND tenant_id = ?
                """, (total, apt["date"], apt["client_id"], tenant_id))

    conn.commit()
    cursor.execute("SELECT * FROM sales WHERE id = ?", (sale_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)
