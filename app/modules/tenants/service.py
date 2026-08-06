#app\modules\tenants\service.py
from fastapi import HTTPException, status
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.modules.tenants.models import Tenant
from app.modules.users.models import User, UserRole
from app.modules.tenants.schemas import TenantRegistrationRequest, TenantResponse
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

class TenantRegistrationService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def register_new_tenant(self, request: TenantRegistrationRequest) -> TenantResponse:
        new_tenant = Tenant(
            name=request.tenant_name,
            email=request.tenant_email,
            currency=request.currency,   # <-- antes: "USD" hardcodeado
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