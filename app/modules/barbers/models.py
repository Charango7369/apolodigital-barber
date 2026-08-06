import uuid
from sqlalchemy import Column, String, ForeignKey, Float, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.core.models import TimestampMixin

from app.modules.tenants.models import Tenant
from app.modules.users.models import User

class Barber(Base, TimestampMixin):
    __tablename__ = "barbers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)

    specialty: Mapped[str | None] = mapped_column(String(100))
    commission_percentage: Mapped[float] = mapped_column(Float, default=0.0)

    working_hours: Mapped[dict | None] = mapped_column(JSONB)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default="true")