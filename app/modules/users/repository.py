#app\modules\users\repository.py
import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.users.models import User, UserRole


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_email_and_tenant(self, email: str, tenant_id: uuid.UUID) -> User | None:
        """
        Busca un usuario ACTIVO por su correo dentro de un tenant específico.
        Uso: login. Sin cambios respecto a tu versión.
        """
        stmt = select(User).where(
            User.email == email,
            User.tenant_id == tenant_id,
            User.is_active == True
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_and_tenant(self, user_id: uuid.UUID, tenant_id: uuid.UUID) -> User | None:
        """
        A diferencia del login, NO filtra is_active: necesitamos poder ver
        y gestionar usuarios desactivados (para reactivarlos, por ejemplo).
        """
        stmt = select(User).where(
            User.id == user_id,
            User.tenant_id == tenant_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_tenant(self, tenant_id: uuid.UUID) -> list[User]:
        stmt = select(User).where(User.tenant_id == tenant_id).order_by(User.created_at)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_active_admins(
        self, tenant_id: uuid.UUID, exclude_user_id: uuid.UUID | None = None
    ) -> int:
        """Usado para bloquear que se desactive/degrade al último ADMIN activo del tenant."""
        stmt = select(func.count()).select_from(User).where(
            User.tenant_id == tenant_id,
            User.role == UserRole.ADMIN.value,
            User.is_active == True
        )
        if exclude_user_id:
            stmt = stmt.where(User.id != exclude_user_id)

        result = await self.session.execute(stmt)
        return result.scalar_one()

    def add(self, user: User) -> None:
        self.session.add(user)