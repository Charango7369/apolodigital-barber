from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import uuid
from datetime import datetime
from ..database import get_db, DEFAULT_TENANT_ID
from ..models import BarberResponse, BarberCreate, BarberUpdate
from ..auth import get_current_user_optional, RequireRole, hash_password

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

    query = """
        SELECT b.id, b.tenant_id, b.name, b.nickname, b.photo_url, b.phone, b.specialty, 
               b.commission_rate, b.rating, b.is_active, u.id as user_id, u.email as user_email
        FROM barbers b
        LEFT JOIN users u ON u.barber_id = b.id AND u.tenant_id = b.tenant_id
        WHERE b.tenant_id = ?
    """
    params = [tid]

    if only_active:
        query += " AND b.is_active = 1"

    query += " ORDER BY b.name ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@router.post("", response_model=BarberResponse)
def create_barber(
    payload: BarberCreate,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    if user and user.get("role") not in ["owner", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Violación SoD: Solo Administradores, Dueños o Superadministradores pueden dar de alta a nuevos barberos.")

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

    # Create credentials if requested
    if payload.create_credentials and payload.email and payload.password:
        clean_email = payload.email.strip().lower()
        cursor.execute("SELECT id FROM users WHERE email = ? AND tenant_id = ?", (clean_email, tid))
        if not cursor.fetchone():
            uid = f"usr-{uuid.uuid4().hex[:8]}"
            hashed_pw = hash_password(payload.password)
            now_str = datetime.now().isoformat()
            cursor.execute("""
                INSERT INTO users (id, tenant_id, email, hashed_password, full_name, role, barber_id, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (uid, tid, clean_email, hashed_pw, payload.name, "barber", bid, 1, now_str))
            conn.commit()

    cursor.execute("""
        SELECT b.id, b.tenant_id, b.name, b.nickname, b.photo_url, b.phone, b.specialty, 
               b.commission_rate, b.rating, b.is_active, u.id as user_id, u.email as user_email
        FROM barbers b
        LEFT JOIN users u ON u.barber_id = b.id AND u.tenant_id = b.tenant_id
        WHERE b.id = ? AND b.tenant_id = ?
    """, (bid, tid))
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

    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, tenant_id, name, nickname, photo_url, phone, specialty, commission_rate, rating, is_active 
        FROM barbers WHERE id = ? AND tenant_id = ?
    """, (barber_id, tid))
    current_barber = cursor.fetchone()
    if not current_barber:
        conn.close()
        raise HTTPException(status_code=404, detail="Barbero no encontrado")

    # SoD: Solo el Dueño o Superadministrador puede alterar los porcentajes de comisiones
    if payload.commission_rate is not None:
        try:
            current_rate = float(current_barber["commission_rate"])
        except Exception:
            current_rate = float(current_barber[7])

        # Solo validamos si realmente hay un cambio en el porcentaje de comisión
        if abs(current_rate - float(payload.commission_rate)) > 0.001:
            if user and user.get("role") not in ["owner", "superadmin"]:
                conn.close()
                raise HTTPException(
                    status_code=403, 
                    detail="Violación SoD: Únicamente el Dueño o Superadministrador tiene privilegios para modificar los porcentajes de comisión."
                )

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

    # Update or create credentials if requested
    if payload.update_credentials and payload.email:
        clean_email = payload.email.strip().lower()
        cursor.execute("SELECT id FROM users WHERE barber_id = ? AND tenant_id = ?", (barber_id, tid))
        existing_user = cursor.fetchone()
        if existing_user:
            user_updates = ["email = ?"]
            user_params = [clean_email]
            if payload.password and payload.password.strip():
                user_updates.append("hashed_password = ?")
                user_params.append(hash_password(payload.password.strip()))
            user_params.append(existing_user[0])
            cursor.execute(f"UPDATE users SET {', '.join(user_updates)} WHERE id = ?", user_params)
            conn.commit()
        else:
            uid = f"usr-{uuid.uuid4().hex[:8]}"
            initial_pw = payload.password.strip() if payload.password else "Apolo2026!"
            hashed_pw = hash_password(initial_pw)
            now_str = datetime.now().isoformat()
            cursor.execute("""
                INSERT INTO users (id, tenant_id, email, hashed_password, full_name, role, barber_id, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (uid, tid, clean_email, hashed_pw, payload.name or "Barbero", "barber", barber_id, 1, now_str))
            conn.commit()

    cursor.execute("""
        SELECT b.id, b.tenant_id, b.name, b.nickname, b.photo_url, b.phone, b.specialty, 
               b.commission_rate, b.rating, b.is_active, u.id as user_id, u.email as user_email
        FROM barbers b
        LEFT JOIN users u ON u.barber_id = b.id AND u.tenant_id = b.tenant_id
        WHERE b.id = ? AND b.tenant_id = ?
    """, (barber_id, tid))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

@router.delete("/{barber_id}")
def delete_barber(
    barber_id: str,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    if user and user.get("role") not in ["owner", "superadmin"]:
        raise HTTPException(status_code=403, detail="Violación SoD: Solo el Dueño o Superadministrador puede dar de baja a un barbero.")

    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE barbers SET is_active = 0 WHERE id = ? AND tenant_id = ?", (barber_id, tid))
    conn.commit()
    conn.close()
    return {"status": "ok", "message": "Barbero desactivado exitosamente"}
