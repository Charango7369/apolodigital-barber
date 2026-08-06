#app\modules\clients\service.py
import uuid
from fastapi import HTTPException
from app.modules.clients.repository import ClientRepository
from app.modules.clients.schemas import ClientCreate, ClientUpdate
from app.modules.clients.models import Client

class ClientService:
    def __init__(self, repository: ClientRepository):
        self.repository = repository

    async def create_client(self, request: ClientCreate, tenant_id: uuid.UUID, user_id: uuid.UUID) -> Client:
        new_client = Client(
            **request.model_dump(),
            tenant_id=tenant_id,
            created_by=user_id
        )
        return await self.repository.create(new_client)

    async def list_clients(
        self, tenant_id: uuid.UUID, search: str | None = None, include_inactive: bool = False
    ) -> list[Client]:
        return await self.repository.get_all_by_tenant(tenant_id, search, include_inactive)

    async def get_client(self, client_id: uuid.UUID, tenant_id: uuid.UUID) -> Client:
        client = await self.repository.get_by_id_and_tenant(client_id, tenant_id)
        if not client:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        return client

    async def update_client(self, client_id: uuid.UUID, data: ClientUpdate, tenant_id: uuid.UUID) -> Client:
        client = await self.get_client(client_id, tenant_id)
        return await self.repository.update(client, data)

    async def delete_client(self, client_id: uuid.UUID, tenant_id: uuid.UUID) -> None:
        client = await self.get_client(client_id, tenant_id)
        await self.repository.deactivate(client)