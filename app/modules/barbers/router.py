# app/modules/barbers/router.py
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.dependencies import get_current_active_user, require_role
from app.core.roles import MANAGEMENT, ADMIN_ONLY
from app.modules.users.models import User, UserRole

from app.modules.barbers.schemas import BarberCreate, BarberUpdate, BarberResponse
from app.modules.barbers.service import BarberService
from app.modules.barbers.repository import BarberRepository

router = APIRouter(prefix="/barbers", tags=["Barbers"])

def get_barber_service(session: AsyncSession = Depends(get_db_session)) -> BarberService:
    return BarberService(BarberRepository(session))

@router.post("/", response_model=BarberResponse, status_code=status.HTTP_201_CREATED)
async def create_barber(
    request: BarberCreate,
    service: BarberService = Depends(get_barber_service),
    current_user: User = Depends(require_role(MANAGEMENT))
):
    """Crea un nuevo barbero. Requiere ADMIN o MANAGER."""
    return await service.create_barber(
        request=request,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id
    )

@router.get("/", response_model=list[BarberResponse])
async def list_barbers(
    include_inactive: bool = Query(False, description="Incluir barberos desactivados"),
    service: BarberService = Depends(get_barber_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.list_barbers(tenant_id=current_user.tenant_id, include_inactive=include_inactive)

@router.get("/{barber_id}", response_model=BarberResponse)
async def get_barber(
    barber_id: uuid.UUID,
    service: BarberService = Depends(get_barber_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_barber(barber_id=barber_id, tenant_id=current_user.tenant_id)

@router.put("/{barber_id}", response_model=BarberResponse)
async def update_barber(
    barber_id: uuid.UUID,
    request: BarberUpdate,
    service: BarberService = Depends(get_barber_service),
    current_user: User = Depends(require_role(MANAGEMENT))
):
    """ADMIN o MANAGER. commission_percentage solo lo toca ADMIN."""
    if request.commission_percentage is not None and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un ADMIN puede modificar el porcentaje de comisión."
        )
    return await service.update_barber(barber_id=barber_id, data=request, tenant_id=current_user.tenant_id)

@router.delete("/{barber_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_barber(
    barber_id: uuid.UUID,
    service: BarberService = Depends(get_barber_service),
    current_user: User = Depends(require_role(ADMIN_ONLY))
):
    """Solo ADMIN. (Pendiente: convertir a soft-delete -- ver nota previa)."""
    await service.delete_barber(barber_id=barber_id, tenant_id=current_user.tenant_id)