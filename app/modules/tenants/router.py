#app\modules\tenants\router.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session

from app.modules.tenants.schemas import TenantRegistrationRequest, TenantResponse
from app.modules.tenants.service import TenantRegistrationService

router = APIRouter(prefix="/tenants", tags=["Tenants Registration"])

def get_tenant_registration_service(session: AsyncSession = Depends(get_db_session)) -> TenantRegistrationService:
    return TenantRegistrationService(session)

@router.post(
    "/register", 
    response_model=TenantResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Registra una nueva empresa y su usuario administrador"
)
async def register_tenant(
    request: TenantRegistrationRequest,
    service: TenantRegistrationService = Depends(get_tenant_registration_service)
):
    """
    Endpoint público para dar de alta una nueva Barbería en el SaaS.
    Crea el Tenant y asigna un usuario con rol ADMIN de manera transaccional.
    """
    return await service.register_new_tenant(request)