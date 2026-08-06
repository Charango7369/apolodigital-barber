#app\modules\users\models.py
import uuid
import enum
from sqlalchemy import String, UniqueConstraint, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import TimestampMixin

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    RECEPTIONIST = "RECEPTIONIST"
    BARBER = "BARBER"

class User(Base, TimestampMixin):
    __tablename__ = "users"

    __table_args__ = (
        UniqueConstraint('tenant_id', 'email', name='uq_user_tenant_email'),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )

    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)

    role: Mapped[UserRole] = mapped_column(
        String(50), nullable=False, default=UserRole.RECEPTIONIST
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Trazabilidad. created_by = NULL significa "usuario fundador del tenant"
    # (creado por /tenants/register, no por otro usuario autenticado del sistema).
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )