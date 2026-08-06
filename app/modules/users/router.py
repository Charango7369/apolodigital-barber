#app\modules\users\router.py
import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.dependencies import get_current_active_user, require_role
from app.core.roles import MANAGEMENT, ADMIN_ONLY
from app.modules.users.models import User

from app.modules.users.schemas import (
    UserCreate, UserUpdate, UserSelfUpdate, UserResponse,
    ChangeOwnPasswordRequest, ResetPasswordRequest
)
from app.modules.users.service import UserService
from app.modules.users.repository import UserRepository

router = APIRouter(prefix="/users", tags=["Users"])


def get_user_service(session: AsyncSession = Depends(get_db_session)) -> UserService:
    return UserService(UserRepository(session))


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: UserCreate,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(require_role(MANAGEMENT))
):
    return await service.create_user(data=request, tenant_id=current_user.tenant_id, creator=current_user)


@router.get("/", response_model=list[UserResponse])
async def list_users(
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(require_role(MANAGEMENT))
):
    return await service.list_users(tenant_id=current_user.tenant_id)


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_user(user_id=current_user.id, tenant_id=current_user.tenant_id)


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    request: UserSelfUpdate,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.self_update(user_id=current_user.id, data=request, tenant_id=current_user.tenant_id)


@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_my_password(
    request: ChangeOwnPasswordRequest,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_active_user)
):
    await service.change_own_password(user_id=current_user.id, tenant_id=current_user.tenant_id, data=request)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(require_role(MANAGEMENT))
):
    return await service.get_user(user_id=user_id, tenant_id=current_user.tenant_id)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    request: UserUpdate,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(require_role(MANAGEMENT))
):
    return await service.update_user_by_admin(
        user_id=user_id, data=request, tenant_id=current_user.tenant_id, updater=current_user
    )


@router.post("/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_user_password(
    user_id: uuid.UUID,
    request: ResetPasswordRequest,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(require_role(ADMIN_ONLY))
):
    await service.reset_password(user_id=user_id, tenant_id=current_user.tenant_id, data=request, admin=current_user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: uuid.UUID,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(require_role(MANAGEMENT))
):
    await service.deactivate_user(user_id=user_id, tenant_id=current_user.tenant_id, updater=current_user)