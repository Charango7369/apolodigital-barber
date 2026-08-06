#app\modules\services\repository.py
import uuid
from typing import Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.services.models import Service
from app.modules.services.schemas import ServiceCreate, ServiceUpdate

class ServiceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, tenant_id: uuid.UUID, data: ServiceCreate) -> Service:
        new_service = Service(
            tenant_id=tenant_id,
            **data.model_dump()
        )
        self.session.add(new_service)
        await self.session.commit()
        await self.session.refresh(new_service)
        return new_service

    async def get_all_by_tenant(self, tenant_id: uuid.UUID, include_inactive: bool = False) -> Sequence[Service]:
        stmt = select(Service).where(Service.tenant_id == tenant_id)
        if not include_inactive:
            stmt = stmt.where(Service.is_active == True)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_id_and_tenant(self, service_id: uuid.UUID, tenant_id: uuid.UUID) -> Service | None:
        result = await self.session.execute(
            select(Service).where(Service.id == service_id, Service.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def update(self, service: Service, data: ServiceUpdate) -> Service:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(service, key, value)

        await self.session.commit()
        await self.session.refresh(service)
        return service

    async def deactivate(self, service: Service) -> None:
        """Soft-delete: desactiva en vez de borrar. El RESTRICT en appointments.service_id
        impediría el hard-delete de todas formas si ya tiene citas históricas -- esto
        evita que ese caso termine en un 500 sin capturar."""
        service.is_active = False
        await self.session.commit()