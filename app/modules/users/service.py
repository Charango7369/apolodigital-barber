#app\modules\users\service.py
import uuid
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.core.security import get_password_hash, verify_password
from app.modules.users.models import User, UserRole
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import (
    UserCreate, UserUpdate, UserSelfUpdate,
    ChangeOwnPasswordRequest, ResetPasswordRequest
)


class UserService:
    def __init__(self, repo: UserRepository):
        self.repo = repo

    async def _get_or_404(self, user_id: uuid.UUID, tenant_id: uuid.UUID) -> User:
        user = await self.repo.get_by_id_and_tenant(user_id, tenant_id)
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        return user

    async def _is_founder_admin(self, creator_id: uuid.UUID, tenant_id: uuid.UUID) -> bool:
        creator = await self.repo.get_by_id_and_tenant(creator_id, tenant_id)
        return creator is not None and creator.created_by is None

    async def create_user(self, data: UserCreate, tenant_id: uuid.UUID, creator: User) -> User:
        if data.role == UserRole.ADMIN and not await self._is_founder_admin(creator.id, tenant_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo el ADMIN fundador del negocio puede crear otro ADMIN."
            )

        new_user = User(
            tenant_id=tenant_id,
            email=data.email,
            hashed_password=get_password_hash(data.password),
            first_name=data.first_name,
            last_name=data.last_name,
            role=data.role,
            created_by=creator.id,
            updated_by=creator.id,
        )
        self.repo.add(new_user)

        try:
            await self.repo.session.commit()
        except IntegrityError:
            await self.repo.session.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un usuario con ese correo en este negocio."
            )

        await self.repo.session.refresh(new_user)
        return new_user

    async def list_users(self, tenant_id: uuid.UUID) -> list[User]:
        return await self.repo.list_by_tenant(tenant_id)

    async def get_user(self, user_id: uuid.UUID, tenant_id: uuid.UUID) -> User:
        return await self._get_or_404(user_id, tenant_id)

    async def update_user_by_admin(
        self, user_id: uuid.UUID, data: UserUpdate, tenant_id: uuid.UUID, updater: User
    ) -> User:
        target = await self._get_or_404(user_id, tenant_id)

        if target.role == UserRole.ADMIN.value and updater.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo un ADMIN puede modificar la cuenta de otro ADMIN."
            )

        if (data.role == UserRole.ADMIN and target.role != UserRole.ADMIN.value
                and not await self._is_founder_admin(updater.id, tenant_id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo el ADMIN fundador del negocio puede asignar el rol ADMIN."
            )

        if target.id == updater.id:
            if data.is_active is False:
                raise HTTPException(status_code=400, detail="No podés desactivar tu propia cuenta.")
            if data.role is not None and data.role.value != target.role:
                raise HTTPException(status_code=400, detail="No podés cambiar tu propio rol.")

        if data.is_active is False and target.role == UserRole.ADMIN.value:
            active_admins = await self.repo.count_active_admins(tenant_id, exclude_user_id=target.id)
            if active_admins == 0:
                raise HTTPException(
                    status_code=400,
                    detail="No se puede desactivar al último ADMIN activo del negocio."
                )

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(target, field, value)
        target.updated_by = updater.id

        await self.repo.session.commit()
        await self.repo.session.refresh(target)
        return target

    async def self_update(self, user_id: uuid.UUID, data: UserSelfUpdate, tenant_id: uuid.UUID) -> User:
        user = await self._get_or_404(user_id, tenant_id)

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        user.updated_by = user.id

        await self.repo.session.commit()
        await self.repo.session.refresh(user)
        return user

    async def change_own_password(
        self, user_id: uuid.UUID, tenant_id: uuid.UUID, data: ChangeOwnPasswordRequest
    ) -> None:
        user = await self._get_or_404(user_id, tenant_id)

        if not verify_password(data.current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="La contraseña actual no es correcta.")

        user.hashed_password = get_password_hash(data.new_password)
        user.updated_by = user.id
        await self.repo.session.commit()

    async def reset_password(
        self, user_id: uuid.UUID, tenant_id: uuid.UUID,
        data: ResetPasswordRequest, admin: User
    ) -> None:
        user = await self._get_or_404(user_id, tenant_id)
        user.hashed_password = get_password_hash(data.new_password)
        user.updated_by = admin.id
        await self.repo.session.commit()

    async def deactivate_user(self, user_id: uuid.UUID, tenant_id: uuid.UUID, updater: User) -> None:
        user = await self._get_or_404(user_id, tenant_id)

        if user.id == updater.id:
            raise HTTPException(status_code=400, detail="No podés desactivar tu propia cuenta.")

        if user.role == UserRole.ADMIN.value:
            if updater.role != UserRole.ADMIN:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Solo un ADMIN puede desactivar a otro ADMIN."
                )
            active_admins = await self.repo.count_active_admins(tenant_id, exclude_user_id=user.id)
            if active_admins == 0:
                raise HTTPException(
                    status_code=400,
                    detail="No se puede desactivar al último ADMIN activo del negocio."
                )

        user.is_active = False
        user.updated_by = updater.id
        await self.repo.session.commit()