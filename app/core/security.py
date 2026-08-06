# app/core/security.py
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.core.config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24h como defensa adicional

pwd_context = CryptContext(schemes=["argon2", "bcrypt"], default="argon2", deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si la contraseña en texto plano coincide con el hash (argon2 o bcrypt)."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Genera el hash argon2 de una contraseña."""
    return pwd_context.hash(password)


def create_access_token(
    subject: uuid.UUID,
    tenant_id: uuid.UUID,
    role: str,
    expires_delta: timedelta | None = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "tenant_id": str(tenant_id),
        "role": role
    }

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_and_update_password(plain_password: str, hashed_password: str) -> tuple[bool, str | None]:
    """
    Verifica la contraseña. Si el hash guardado usa un esquema deprecado (bcrypt),
    devuelve además un hash nuevo en argon2 -- el caller decide si lo persiste.
    Si el hash ya es argon2, new_hash viene en None (nada que migrar).
    """
    return pwd_context.verify_and_update(plain_password, hashed_password)