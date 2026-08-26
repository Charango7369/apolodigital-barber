#app\modules\tenants\service.py
import logging
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.modules.tenants.models import Tenant
from app.modules.users.models import User, UserRole
from app.modules.tenants.schemas import TenantRegistrationRequest, TenantResponse
from app.core.security import get_password_hash
from app.core.slugify import slugify

logger = logging.getLogger(__name__)


async def _generate_unique_slug(session: AsyncSession, base_text: str) -> str:
    base_slug = slugify(base_text)
    candidate = base_slug
    suffix = 2
    while True:
        result = await session.execute(select(Tenant).where(Tenant.slug == candidate))
        if result.scalar_one_or_none() is None:
            return candidate
        candidate = f"{base_slug}-{suffix}"
        suffix += 1


class TenantRegistrationService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def register_new_tenant(self, request: TenantRegistrationRequest) -> TenantResponse:
        slug = await _generate_unique_slug(self.session, request.tenant_name)

        new_tenant = Tenant(
            name=request.tenant_name,
            email=request.tenant_email,
            slug=slug,
            currency=request.currency,
            timezone=request.timezone,
        )

        self.session.add(new_tenant)

        try:
            await self.session.flush()

            hashed_pw = get_password_hash(request.admin_password)

            new_admin = User(
                tenant_id=new_tenant.id,
                email=request.admin_email,
                hashed_password=hashed_pw,
                first_name=request.admin_first_name,
                last_name=request.admin_last_name,
                role=UserRole.ADMIN
            )

            self.session.add(new_admin)

            await self.session.commit()
            await self.session.refresh(new_tenant)

            return new_tenant

        except IntegrityError:
            await self.session.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo de la empresa o del administrador ya se encuentra registrado."
            )
        except Exception:
            await self.session.rollback()
            logger.exception("Error inesperado durante el registro de tenant")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ocurrió un error inesperado durante el registro."
            )