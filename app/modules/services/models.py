import uuid
from sqlalchemy import Column, String, Text, Numeric, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.core.models import TimestampMixin
from app.modules.tenants.models import Tenant

class Service(Base, TimestampMixin):
    __tablename__ = "services"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, server_default="true")

