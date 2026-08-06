# app/core/dependencies.py
import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.security import SECRET_KEY, ALGORITHM
from app.modules.auth.schemas import TokenPayload
from app.modules.users.models import User, UserRole

token_bearer = HTTPBearer()


def get_token_payload(credentials: HTTPAuthorizationCredentials = Depends(token_bearer)) -> TokenPayload:
    """
    Verifica la firma del JWT y extrae el payload.
    Uso interno: solo get_current_active_user debería depender de esto directamente.
    El resto de la app depende de get_current_active_user, no de esta función.
    """
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenPayload(**payload)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token ha expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudieron validar las credenciales",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_active_user(
    payload: TokenPayload = Depends(get_token_payload),
    db: AsyncSession = Depends(get_db_session),
) -> User:
    """
    Carga el usuario real desde la BD en cada request y valida is_active.
    Esto hace que desactivar a alguien tenga efecto inmediato, en vez de
    esperar a que expire su token. También usa el ROLE real de la BD
    (no el que viene en el JWT), así que un cambio de rol también aplica
    al instante -- ver nota en el mensaje sobre por qué se agrupó esto.
    """
    user = await db.get(User, payload.sub)

    if not user or user.tenant_id != payload.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudieron validar las credenciales",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Esta cuenta está desactivada.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_current_tenant_id(user: User = Depends(get_current_active_user)) -> uuid.UUID:
    """Extrae únicamente el tenant_id, ya con is_active validado."""
    return user.tenant_id


def require_role(allowed_roles: list[UserRole]):
    """
    Fábrica de dependencias para RBAC. Ahora valida contra el rol real
    de la BD (vía get_current_active_user), no contra el rol del JWT.
    """
    def role_checker(user: User = Depends(get_current_active_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes los permisos necesarios para realizar esta acción"
            )
        return user
    return role_checker