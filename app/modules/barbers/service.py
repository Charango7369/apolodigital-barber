#app\modules\barbers\service.py
import uuid
from fastapi import HTTPException
from app.modules.barbers.repository import BarberRepository
from app.modules.barbers.schemas import BarberCreate, BarberUpdate
from app.modules.barbers.models import Barber

class BarberService:
    def __init__(self, repo: BarberRepository):
        self.repo = repo

    async def create_barber(self, request: BarberCreate, tenant_id: uuid.UUID, user_id: uuid.UUID) -> Barber:
        new_barber = Barber(
            tenant_id=tenant_id,
            user_id=request.user_id,
            first_name=request.first_name,
            last_name=request.last_name,
            specialty=request.specialty,
            commission_percentage=request.commission_percentage,
            working_hours=request.working_hours
        )
        return await self.repo.create(new_barber)

    async def list_barbers(self, tenant_id: uuid.UUID, include_inactive: bool = False) -> list[Barber]:
        return list(await self.repo.get_all_by_tenant(tenant_id, include_inactive))

    async def get_barber(self, barber_id: uuid.UUID, tenant_id: uuid.UUID) -> Barber:
        barber = await self.repo.get_by_id_and_tenant(barber_id, tenant_id)
        if not barber:
            raise HTTPException(status_code=404, detail="Barbero no encontrado")
        return barber

    async def update_barber(self, barber_id: uuid.UUID, data: BarberUpdate, tenant_id: uuid.UUID) -> Barber:
        barber = await self.get_barber(barber_id, tenant_id)
        return await self.repo.update(barber, data)

    async def delete_barber(self, barber_id: uuid.UUID, tenant_id: uuid.UUID) -> None:
        barber = await self.get_barber(barber_id, tenant_id)
        await self.repo.deactivate(barber)