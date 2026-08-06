#app\modules\auth\schemas.py
import uuid
from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: uuid.UUID
    tenant_id: uuid.UUID
    role: str
    exp: int

class LoginRequest(BaseModel):
    email: str      # <-- Asegúrate de que sea 'str' en minúscula
    password: str   # <-- Asegúrate de que sea 'str' en minúscula
    tenant_id: uuid.UUID