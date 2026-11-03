from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import uuid
from datetime import datetime
from ..database import get_db, DEFAULT_TENANT_ID
from ..models import ClientResponse, ClientCreate, ClientUpdate
from ..auth import get_current_user_optional

router = APIRouter(prefix="/clients", tags=["clients"])

@router.get("", response_model=List[ClientResponse])
def get_clients(
    search: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM clients WHERE tenant_id = ?"
    params = [tid]

    if search:
        query += " AND (name LIKE ? OR phone LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    query += " ORDER BY total_visits DESC, name ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@router.post("", response_model=ClientResponse)
def create_client(
    payload: ClientCreate,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID
    conn = get_db()
    cursor = conn.cursor()
    cid = f"cli-{uuid.uuid4().hex[:6]}"
    now_str = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO clients (
            id, tenant_id, name, phone, email, notes, total_visits, total_spent, last_visit, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0.0, NULL, ?)
    """, (cid, tid, payload.name, payload.phone, payload.email or "", payload.notes or "", now_str))
    conn.commit()
    cursor.execute("SELECT * FROM clients WHERE id = ? AND tenant_id = ?", (cid, tid))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: str,
    payload: ClientUpdate,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clients WHERE id = ? AND tenant_id = ?", (client_id, tid))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    updates = []
    params = []
    if payload.name is not None:
        updates.append("name = ?")
        params.append(payload.name)
    if payload.phone is not None:
        updates.append("phone = ?")
        params.append(payload.phone)
    if payload.email is not None:
        updates.append("email = ?")
        params.append(payload.email)
    if payload.notes is not None:
        updates.append("notes = ?")
        params.append(payload.notes)

    if updates:
        params.extend([client_id, tid])
        cursor.execute(f"UPDATE clients SET {', '.join(updates)} WHERE id = ? AND tenant_id = ?", params)
        conn.commit()

    cursor.execute("SELECT * FROM clients WHERE id = ? AND tenant_id = ?", (client_id, tid))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

@router.delete("/{client_id}")
def delete_client(
    client_id: str,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    if user and user.get("role") in ["barber", "client"]:
        raise HTTPException(status_code=403, detail="Violación SoD: Solo Administradores pueden dar de baja fichas de clientes.")

    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM clients WHERE id = ? AND tenant_id = ?", (client_id, tid))
    conn.commit()
    conn.close()
    return {"status": "ok", "message": "Cliente eliminado"}
