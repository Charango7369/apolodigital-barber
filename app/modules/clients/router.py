# app/modules/clients/router.py
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.dependencies import get_current_active_user, require_role
from app.core.roles import FRONT_DESK, MANAGEMENT
from app.modules.users.models import User

from app.modules.clients.schemas import ClientCreate, ClientResponse, ClientUpdate
from app.modules.clients.service import ClientService
from app.modules.clients.repository import ClientRepository

router = APIRouter(prefix="/clients", tags=["Clients"])

def get_client_service(session: AsyncSession = Depends(get_db_session)) -> ClientService:
    return ClientService(ClientRepository(session))

@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    request: ClientCreate,
    service: ClientService = Depends(get_client_service),
    current_user: User = Depends(require_role(FRONT_DESK))
):
    return await service.create_client(
        request=request,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id
    )

@router.get("/", response_model=list[ClientResponse])
async def list_clients(
    search: Optional[str] = Query(None, description="Buscar por nombre, apellido o teléfono"),
    service: ClientService = Depends(get_client_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.list_clients(tenant_id=current_user.tenant_id, search=search)

@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: uuid.UUID,
    service: ClientService = Depends(get_client_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_client(client_id=client_id, tenant_id=current_user.tenant_id)

@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: uuid.UUID,
    request: ClientUpdate,
    service: ClientService = Depends(get_client_service),
    current_user: User = Depends(require_role(FRONT_DESK))
):
    return await service.update_client(client_id=client_id, data=request, tenant_id=current_user.tenant_id)

@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: uuid.UUID,
    service: ClientService = Depends(get_client_service),
    current_user: User = Depends(require_role(MANAGEMENT))
):
    """⚠️ Hard-delete con CASCADE sobre appointments -- ver nota pendiente."""
    await service.delete_client(client_id=client_id, tenant_id=current_user.tenant_id)