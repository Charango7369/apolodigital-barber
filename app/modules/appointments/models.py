# app/modules/appointments/models.py
import uuid
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base
from app.core.models import TimestampMixin

from app.modules.tenants.models import Tenant
from app.modules.services.models import Service
from app.modules.barbers.models import Barber
from app.modules.clients.models import Client
from app.modules.users.models import User


class AppointmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELED = "CANCELED"
    NO_SHOW = "NO_SHOW"


class PaymentMethod(str, enum.Enum):
    CASH = "CASH"
    CARD = "CARD"
    TRANSFER = "TRANSFER"


class Appointment(Base, TimestampMixin):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False
    )

    service_id = Column(
        UUID(as_uuid=True),
        ForeignKey("services.id", ondelete="RESTRICT"),
        nullable=False
    )

    barber_id = Column(
        UUID(as_uuid=True),
        ForeignKey("barbers.id", ondelete="RESTRICT"),
        nullable=False
    )

    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False
    )

    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)

    status = Column(String(50), default=AppointmentStatus.PENDING.value)

    # --- Checkout: se completan solo cuando la cita pasa a COMPLETED ---
    # Snapshot inmutable -- una vez seteados, un cambio futuro al precio del
    # servicio o a la comisión del barbero NO los afecta. Mismo principio que
    # los costos históricos de Inventario.
    payment_method = Column(String(20), nullable=True)
    service_price_snapshot = Column(Numeric(10, 2), nullable=True)
    commission_percentage_snapshot = Column(Numeric(5, 2), nullable=True)
    commission_amount = Column(Numeric(10, 2), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completed_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )