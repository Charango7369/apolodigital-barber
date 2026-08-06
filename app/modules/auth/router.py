#app\modules\auth\router.py
import uuid
from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session 

from app.modules.auth.schemas import Token, LoginRequest
from app.modules.auth.service import AuthService
from app.modules.users.repository import UserRepository

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_auth_service(session: AsyncSession = Depends(get_db_session)) -> AuthService:
    user_repo = UserRepository(session)
    return AuthService(user_repo)

@router.post("/login", response_model=Token)
async def login(
    # Pedimos los datos sueltos con tipos nativos para evadir el bug de Swagger en Python 3.14
    email: str = Body(..., description="Correo del administrador"),
    password: str = Body(..., description="Contraseña"),
    tenant_id: uuid.UUID = Body(..., description="ID de la barbería"),
    
    auth_service = Depends(get_auth_service)
):
    """
    Autentica a un usuario dentro de un Tenant y devuelve un JWT.
    """
    # Construimos el modelo internamente para mantener nuestra lógica y validación intactas
    login_data = LoginRequest(
        email=email,
        password=password,
        tenant_id=tenant_id
    )
    
    return await auth_service.login(login_data)