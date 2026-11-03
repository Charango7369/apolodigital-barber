from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import uuid
from ..database import get_db, DEFAULT_TENANT_ID
from ..models import BarberResponse, BarberCreate, BarberUpdate
from ..auth import get_current_user_optional, RequireRole

router = APIRouter(prefix="/barbers", tags=["barbers"])

@router.get("", response_model=List[BarberResponse])
def get_barbers(
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

    query = "SELECT * FROM barbers WHERE tenant_id = ?"
    params = [tid]

    if only_active:
        query += " AND is_active = 1"

    query += " ORDER BY name ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@router.post("", response_model=BarberResponse)
def create_barber(
    payload: BarberCreate,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    if user and user.get("role") not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Violación SoD: Solo Administradores o Dueños pueden dar de alta a nuevos barberos.")

    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID
    conn = get_db()
    cursor = conn.cursor()
    bid = f"bar-{uuid.uuid4().hex[:6]}"
    cursor.execute("""
        INSERT INTO barbers (
            id, tenant_id, name, nickname, photo_url, phone, specialty, commission_rate, rating, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        bid, tid, payload.name, payload.nickname or "", payload.photo_url or "",
        payload.phone or "", payload.specialty or "Barbero Profesional",
        payload.commission_rate, payload.rating, 1 if payload.is_active else 0
    ))
    conn.commit()
    cursor.execute("SELECT * FROM barbers WHERE id = ? AND tenant_id = ?", (bid, tid))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

@router.put("/{barber_id}", response_model=BarberResponse)
def update_barber(
    barber_id: str,
    payload: BarberUpdate,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    if user and user.get("role") in ["barber", "client"]:
        raise HTTPException(status_code=403, detail="Violación SoD: No autorizado para modificar perfiles de personal.")

    # SoD: Solo el Dueño puede alterar las comisiones de los barberos
    if payload.commission_rate is not None:
        if user and user.get("role") != "owner":
            raise HTTPException(status_code=403, detail="Violación SoD: Únicamente el Dueño tiene privilegios para modificar los porcentajes de comisión.")

    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM barbers WHERE id = ? AND tenant_id = ?", (barber_id, tid))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Barbero no encontrado")

    updates = []
    params = []
    if payload.name is not None:
        updates.append("name = ?")
        params.append(payload.name)
    if payload.nickname is not None:
        updates.append("nickname = ?")
        params.append(payload.nickname)
    if payload.photo_url is not None:
        updates.append("photo_url = ?")
        params.append(payload.photo_url)
    if payload.phone is not None:
        updates.append("phone = ?")
        params.append(payload.phone)
    if payload.specialty is not None:
        updates.append("specialty = ?")
        params.append(payload.specialty)
    if payload.commission_rate is not None:
        updates.append("commission_rate = ?")
        params.append(payload.commission_rate)
    if payload.rating is not None:
        updates.append("rating = ?")
        params.append(payload.rating)
    if payload.is_active is not None:
        updates.append("is_active = ?")
        params.append(1 if payload.is_active else 0)

    if updates:
        params.extend([barber_id, tid])
        cursor.execute(f"UPDATE barbers SET {', '.join(updates)} WHERE id = ? AND tenant_id = ?", params)
        conn.commit()

    cursor.execute("SELECT * FROM barbers WHERE id = ? AND tenant_id = ?", (barber_id, tid))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

@router.delete("/{barber_id}")
def delete_barber(
    barber_id: str,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    if user and user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Violación SoD: Solo el Dueño puede dar de baja a un barbero.")

    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE barbers SET is_active = 0 WHERE id = ? AND tenant_id = ?", (barber_id, tid))
    conn.commit()
    conn.close()
    return {"status": "ok", "message": "Barbero desactivado exitosamente"}
