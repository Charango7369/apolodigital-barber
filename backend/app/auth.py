import os
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "apolodigital-barber-enterprise-super-secret-jwt-key-2026-owasp")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 horas

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with a random salt."""
    salt = secrets.token_hex(16)
    iterations = 100000
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"pbkdf2:sha256:{iterations}${salt}${dk.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a PBKDF2 hashed password."""
    try:
        parts = hashed_password.split("$")
        if len(parts) != 3:
            return False
        header, salt, original_hash = parts
        iterations = int(header.split(":")[2])
        dk = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), iterations)
        return secrets.compare_digest(dk.hex(), original_hash)
    except Exception:
        return False

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token with tenant context, role, and expiration."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "iat": now,
        "iss": "https://api.apolodigital.lat"
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], issuer="https://api.apolodigital.lat")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="El token de sesión ha expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token de sesión inválido")

def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)) -> Optional[Dict[str, Any]]:
    """Extract user payload if token is present, else None (useful for public endpoints with optional auth)."""
    if not credentials:
        return None
    return decode_access_token(credentials.credentials)

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)) -> Dict[str, Any]:
    """Enforce valid authenticated user."""
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Autenticación requerida. Proporcione Bearer Token en cabecera Authorization",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return decode_access_token(credentials.credentials)

def get_current_tenant_id(user: Dict[str, Any] = Depends(get_current_user)) -> str:
    """Enforce and extract tenant_id strictly from cryptographically validated JWT."""
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=403, detail="Contexto de organización (tenant_id) ausente en el token")
    return tenant_id

class RequireRole:
    """Enforce Role-Based Access Control (RBAC) and Segregation of Duties (SoD)."""
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = user.get("role")
        # Superadmin has full administrative bypass for multi-tenant management
        if user_role == "superadmin":
            return user
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Acceso denegado. Se requiere uno de los siguientes roles: {', '.join(self.allowed_roles)} (Tu rol actual: {user_role})"
            )
        return user
