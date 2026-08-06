#app\modules\barbers\repository.py
import uuid
from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.barbers.models import Barber
from app.modules.barbers.schemas import BarberUpdate

class BarberRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, barber: Barber) -> Barber:
        self.session.add(barber)
        await self.session.commit()
        await self.session.refresh(barber)
        return barber

    async def get_all_by_tenant(self, tenant_id: uuid.UUID, include_inactive: bool = False) -> Sequence[Barber]:
        stmt = select(Barber).where(Barber.tenant_id == tenant_id)
        if not include_inactive:
            stmt = stmt.where(Barber.is_active == True)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_id_and_tenant(self, barber_id: uuid.UUID, tenant_id: uuid.UUID) -> Barber | None:
        stmt = select(Barber).where(Barber.id == barber_id, Barber.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update(self, barber: Barber, data: BarberUpdate) -> Barber:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(barber, key, value)

        await self.session.commit()
        await self.session.refresh(barber)
        return barber

    async def deactivate(self, barber: Barber) -> None:
        """Soft-delete: desactiva en vez de borrar. Preserva historial de citas."""
        barber.is_active = False
        await self.session.commit()