#app\modules\clients\repository.py
import uuid
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.clients.models import Client
from app.modules.clients.schemas import ClientUpdate

class ClientRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, client: Client) -> Client:
        self.session.add(client)
        await self.session.commit()
        await self.session.refresh(client)
        return client

    async def get_all_by_tenant(
        self, tenant_id: uuid.UUID, search: str | None = None, include_inactive: bool = False
    ) -> list[Client]:
        stmt = select(Client).where(Client.tenant_id == tenant_id)

        if not include_inactive:
            stmt = stmt.where(Client.is_active == True)

        if search:
            stmt = stmt.where(
                or_(
                    Client.first_name.ilike(f"%{search}%"),
                    Client.last_name.ilike(f"%{search}%"),
                    Client.phone.ilike(f"%{search}%")
                )
            )

        stmt = stmt.order_by(Client.created_at.desc())

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id_and_tenant(self, client_id: uuid.UUID, tenant_id: uuid.UUID) -> Client | None:
        stmt = select(Client).where(Client.id == client_id, Client.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update(self, client: Client, data: ClientUpdate) -> Client:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(client, key, value)

        await self.session.commit()
        await self.session.refresh(client)
        return client

    async def deactivate(self, client: Client) -> None:
        """Soft-delete: desactiva en vez de borrar. Evita perder historial de citas (CASCADE)."""
        client.is_active = False
        await self.session.commit()