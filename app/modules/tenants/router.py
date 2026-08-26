#app\modules\tenants\router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db_session
from app.core.dependencies import require_role
from app.core.roles import MANAGEMENT
from app.modules.users.models import User

from app.modules.tenants.models import Tenant
from app.modules.tenants.schemas import TenantRegistrationRequest, TenantResponse, UpdateSlugRequest
from app.modules.tenants.service import TenantRegistrationService

router = APIRouter(prefix="/tenants", tags=["Tenants"])

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
    return await service.register_new_tenant(request)


@router.get("/me", response_model=TenantResponse)
async def get_my_tenant(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_role(MANAGEMENT))
):
    """Datos del negocio actual, incluido el slug de la URL de reserva pública."""
    tenant = await db.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado.")
    return tenant


@router.patch("/me/slug", response_model=TenantResponse)
async def update_my_tenant_slug(
    request: UpdateSlugRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_role(MANAGEMENT))
):
    """Cambia el slug público del negocio (define la URL: /public/{slug}/...)."""
    tenant = await db.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado.")

    tenant.slug = request.slug

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Ese slug ya está en uso por otro negocio.")

    await db.refresh(tenant)
    return tenant