from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import uuid
from datetime import datetime
from ..database import get_db, DEFAULT_TENANT_ID
from ..models import UserResponse, UserCreate, UserUpdate
from ..auth import get_current_user, hash_password

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=List[UserResponse])
def get_users(
    tenant_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    role = current_user.get("role")
    if role not in ["superadmin", "owner", "admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para gestionar credenciales de personal.")

    tid = current_user.get("tenant_id")
    if role == "superadmin" and tenant_id:
        tid = tenant_id

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.tenant_id, u.email, u.full_name, u.role, u.barber_id, u.is_active, u.created_at, b.name as barber_name
        FROM users u
        LEFT JOIN barbers b ON u.barber_id = b.id
        WHERE u.tenant_id = ?
        ORDER BY u.created_at DESC
    """, (tid,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@router.post("", response_model=UserResponse)
def create_user(
    payload: UserCreate,
    current_user: dict = Depends(get_current_user)
):
    caller_role = current_user.get("role")
    if caller_role not in ["superadmin", "owner", "admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para crear credenciales.")

    # SoD: Only superadmin or owner can create an owner
    if payload.role == "owner" and caller_role not in ["superadmin", "owner"]:
        raise HTTPException(status_code=403, detail="Violación SoD: Solo un Dueño o Superadmin puede otorgar el rol de Dueño.")

    if not payload.password or len(payload.password) < 4:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 4 caracteres.")

    tid = current_user.get("tenant_id")
    if caller_role == "superadmin" and payload.tenant_id:
        tid = payload.tenant_id

    conn = get_db()
    cursor = conn.cursor()

    # Check email duplicate within tenant
    clean_email = payload.email.strip().lower()
    cursor.execute("SELECT id FROM users WHERE email = ? AND tenant_id = ?", (clean_email, tid))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Ya existe una cuenta con este correo electrónico en la barbería.")

    uid = f"usr-{uuid.uuid4().hex[:8]}"
    now_str = datetime.now().isoformat()
    hashed_pw = hash_password(payload.password)

    cursor.execute("""
        INSERT INTO users (id, tenant_id, email, hashed_password, full_name, role, barber_id, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        uid, tid, clean_email, hashed_pw, payload.full_name.strip(),
        payload.role, payload.barber_id or None, 1 if payload.is_active else 0, now_str
    ))
    conn.commit()

    cursor.execute("""
        SELECT u.id, u.tenant_id, u.email, u.full_name, u.role, u.barber_id, u.is_active, u.created_at, b.name as barber_name
        FROM users u
        LEFT JOIN barbers b ON u.barber_id = b.id
        WHERE u.id = ?
    """, (uid,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    caller_role = current_user.get("role")
    if caller_role not in ["superadmin", "owner", "admin"]:
        raise HTTPException(status_code=403, detail="No autorizado para editar credenciales.")

    tid = current_user.get("tenant_id")
    conn = get_db()
    cursor = conn.cursor()

    if caller_role == "superadmin":
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    else:
        cursor.execute("SELECT * FROM users WHERE id = ? AND tenant_id = ?", (user_id, tid))
    
    target_user = cursor.fetchone()
    if not target_user:
        conn.close()
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    target_dict = dict(target_user)

    # SoD: Admin cannot edit an owner or superadmin
    if caller_role == "admin" and target_dict["role"] in ["owner", "superadmin"] and target_dict["id"] != current_user.get("id"):
        conn.close()
        raise HTTPException(status_code=403, detail="Violación SoD: Un Administrador no puede modificar la cuenta del Dueño.")

    # SoD: Admin cannot promote anyone to owner
    if payload.role == "owner" and caller_role not in ["superadmin", "owner"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Violación SoD: Solo un Dueño puede asignar el rol de Dueño.")

    updates = []
    params = []

    if payload.email is not None and payload.email.strip():
        new_email = payload.email.strip().lower()
        if new_email != target_dict["email"]:
            cursor.execute("SELECT id FROM users WHERE email = ? AND tenant_id = ? AND id != ?", (new_email, target_dict["tenant_id"], user_id))
            if cursor.fetchone():
                conn.close()
                raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado por otro usuario.")
            updates.append("email = ?")
            params.append(new_email)

    if payload.full_name is not None and payload.full_name.strip():
        updates.append("full_name = ?")
        params.append(payload.full_name.strip())

    if payload.role is not None:
        updates.append("role = ?")
        params.append(payload.role)

    if payload.barber_id is not None:
        updates.append("barber_id = ?")
        params.append(payload.barber_id if payload.barber_id != "" else None)

    if payload.is_active is not None:
        updates.append("is_active = ?")
        params.append(1 if payload.is_active else 0)

    if payload.password is not None and payload.password.strip():
        if len(payload.password.strip()) < 4:
            conn.close()
            raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 4 caracteres.")
        updates.append("hashed_password = ?")
        params.append(hash_password(payload.password.strip()))

    if updates:
        params.append(user_id)
        cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

    cursor.execute("""
        SELECT u.id, u.tenant_id, u.email, u.full_name, u.role, u.barber_id, u.is_active, u.created_at, b.name as barber_name
        FROM users u
        LEFT JOIN barbers b ON u.barber_id = b.id
        WHERE u.id = ?
    """, (user_id,))
    updated_row = cursor.fetchone()
    conn.close()
    return dict(updated_row)

@router.delete("/{user_id}")
def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    caller_role = current_user.get("role")
    if caller_role not in ["superadmin", "owner", "admin"]:
        raise HTTPException(status_code=403, detail="No autorizado.")

    if user_id == current_user.get("id"):
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta activa de sesión.")

    tid = current_user.get("tenant_id")
    conn = get_db()
    cursor = conn.cursor()

    if caller_role == "superadmin":
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    else:
        cursor.execute("SELECT * FROM users WHERE id = ? AND tenant_id = ?", (user_id, tid))
    
    target = cursor.fetchone()
    if not target:
        conn.close()
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    target_dict = dict(target)
    if target_dict["role"] in ["owner", "superadmin"] and caller_role == "admin":
        conn.close()
        raise HTTPException(status_code=403, detail="Violación SoD: Administradores no pueden eliminar cuentas de Dueño.")

    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"status": "ok", "message": "Usuario y credenciales eliminadas exitosamente."}
