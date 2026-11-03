from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from ..database import get_db
from ..auth import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str
    tenant_id: Optional[str] = None # Optional; if not provided, resolves default or by user email

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM users WHERE email = ? AND is_active = 1"
    params = [payload.email]

    if payload.tenant_id:
        query += " AND tenant_id = ?"
        params.append(payload.tenant_id)

    cursor.execute(query, params)
    user = cursor.fetchone()

    if not user:
        conn.close()
        raise HTTPException(status_code=401, detail="Credenciales incorrectas o usuario inactivo")

    user_dict = dict(user)

    if not verify_password(payload.password, user_dict["hashed_password"]):
        conn.close()
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    # Fetch organization details
    cursor.execute("SELECT name, slug, currency FROM organizations WHERE id = ?", (user_dict["tenant_id"],))
    org = cursor.fetchone()
    conn.close()

    org_dict = dict(org) if org else {}

    # Claims for JWT
    token_data = {
        "sub": user_dict["id"],
        "email": user_dict["email"],
        "role": user_dict["role"],
        "tenant_id": user_dict["tenant_id"],
        "barber_id": user_dict["barber_id"],
        "full_name": user_dict["full_name"],
        "org_name": org_dict.get("name", "Apolo Barber")
    }

    access_token = create_access_token(data=token_data)

    safe_user = {
        "id": user_dict["id"],
        "email": user_dict["email"],
        "full_name": user_dict["full_name"],
        "role": user_dict["role"],
        "tenant_id": user_dict["tenant_id"],
        "barber_id": user_dict["barber_id"],
        "organization": org_dict
    }

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": safe_user
    }

@router.get("/me")
def get_current_user_profile(user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, slug, address, phone, currency FROM organizations WHERE id = ?", (user["tenant_id"],))
    org = cursor.fetchone()
    conn.close()

    return {
        "user": user,
        "organization": dict(org) if org else None
    }
