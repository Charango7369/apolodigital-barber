# app/modules/services/router.py
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.dependencies import get_current_tenant_id, require_role
from app.core.roles import MANAGEMENT
from app.modules.users.models import User
from app.modules.services.schemas import ServiceCreate, ServiceResponse, ServiceUpdate
from app.modules.services.repository import ServiceRepository

router = APIRouter(prefix="/services", tags=["Services"])

def get_service_repo(session: AsyncSession = Depends(get_db_session)) -> ServiceRepository:
    return ServiceRepository(session)

@router.post("/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    service_in: ServiceCreate,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    repo: ServiceRepository = Depends(get_service_repo),
    _guard: User = Depends(require_role(MANAGEMENT))
):
    return await repo.create(tenant_id=tenant_id, data=service_in)

@router.get("/", response_model=List[ServiceResponse])
async def list_services(
    include_inactive: bool = Query(False, description="Incluir servicios desactivados"),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    repo: ServiceRepository = Depends(get_service_repo)
):
    return await repo.get_all_by_tenant(tenant_id=tenant_id, include_inactive=include_inactive)

@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    repo: ServiceRepository = Depends(get_service_repo)
):
    service = await repo.get_by_id_and_tenant(service_id, tenant_id)
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return service

@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: uuid.UUID,
    service_in: ServiceUpdate,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    repo: ServiceRepository = Depends(get_service_repo),
    _guard: User = Depends(require_role(MANAGEMENT))
):
    service = await repo.get_by_id_and_tenant(service_id, tenant_id)
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return await repo.update(service, service_in)

@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    repo: ServiceRepository = Depends(get_service_repo),
    _guard: User = Depends(require_role(MANAGEMENT))
):
    """Soft-delete. El RESTRICT en appointments protege el historial de todas formas."""
    service = await repo.get_by_id_and_tenant(service_id, tenant_id)
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    await repo.deactivate(service)