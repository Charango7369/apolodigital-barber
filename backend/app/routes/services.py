from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import uuid
from ..database import get_db, DEFAULT_TENANT_ID
from ..models import ServiceResponse, ServiceCreate, ServiceUpdate
from ..auth import get_current_user_optional, RequireRole

router = APIRouter(prefix="/services", tags=["services"])

@router.get("", response_model=List[ServiceResponse])
def get_services(
    category: Optional[str] = None,
    tenant_id: Optional[str] = None,
    slug: Optional[str] = None,
    only_active: bool = True,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    conn = get_db()
    cursor = conn.cursor()

    tid = None
    if tenant_id:
        tid = tenant_id
    elif slug:
        cursor.execute("SELECT id FROM organizations WHERE slug = ? AND is_active = 1", (slug,))
        row = cursor.fetchone()
        if row:
            tid = row[0]

    if not tid:
        tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID

    query = "SELECT * FROM services WHERE tenant_id = ?"
    params = [tid]

    if only_active:
        query += " AND is_active = 1"
    if category:
        query += " AND category = ?"
        params.append(category)

    query += " ORDER BY price ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@router.post("", response_model=ServiceResponse)
def create_service(
    payload: ServiceCreate,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    # SoD: Solo Dueño o Admin pueden crear servicios
    if user and user.get("role") in ["barber", "client"]:
        raise HTTPException(status_code=403, detail="Violación SoD: El personal operativo no tiene autorización para crear servicios.")

    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID
    conn = get_db()
    cursor = conn.cursor()
    sid = f"srv-{uuid.uuid4().hex[:6]}"
    cursor.execute(
        "INSERT INTO services (id, tenant_id, name, category, duration_minutes, price, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (sid, tid, payload.name, payload.category, payload.duration_minutes, payload.price, payload.description or "", 1 if payload.is_active else 0)
    )
    conn.commit()
    cursor.execute("SELECT * FROM services WHERE id = ? AND tenant_id = ?", (sid, tid))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

@router.put("/{service_id}", response_model=ServiceResponse)
def update_service(
    service_id: str,
    payload: ServiceUpdate,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    if user and user.get("role") in ["barber", "client"]:
        raise HTTPException(status_code=403, detail="Violación SoD: El personal operativo no tiene autorización para modificar servicios.")

    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM services WHERE id = ? AND tenant_id = ?", (service_id, tid))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    updates = []
    params = []
    if payload.name is not None:
        updates.append("name = ?")
        params.append(payload.name)
    if payload.category is not None:
        updates.append("category = ?")
        params.append(payload.category)
    if payload.duration_minutes is not None:
        updates.append("duration_minutes = ?")
        params.append(payload.duration_minutes)
    if payload.price is not None:
        updates.append("price = ?")
        params.append(payload.price)
    if payload.description is not None:
        updates.append("description = ?")
        params.append(payload.description)
    if payload.is_active is not None:
        updates.append("is_active = ?")
        params.append(1 if payload.is_active else 0)

    if updates:
        params.extend([service_id, tid])
        cursor.execute(f"UPDATE services SET {', '.join(updates)} WHERE id = ? AND tenant_id = ?", params)
        conn.commit()

    cursor.execute("SELECT * FROM services WHERE id = ? AND tenant_id = ?", (service_id, tid))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

@router.delete("/{service_id}")
def delete_service(
    service_id: str,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    if user and user.get("role") in ["barber", "client"]:
        raise HTTPException(status_code=403, detail="Violación SoD: No autorizado para eliminar servicios.")

    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM services WHERE id = ? AND tenant_id = ?", (service_id, tid))
    conn.commit()
    conn.close()
    return {"status": "ok", "message": "Servicio eliminado"}
