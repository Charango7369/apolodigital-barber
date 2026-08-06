#app/modules/tenants/models.py
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    business_name: Mapped[str | None] = mapped_column(String(150))
    logo_url: Mapped[str | None] = mapped_column(String(255))
    
    # Contacto & Ubicación
    address: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str | None] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    
    # Configuración regional
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    
    # JSON para flexibilidad (KISS: evita crear tablas enteras para configuraciones triviales)
    settings: Mapped[dict | None] = mapped_column(JSON)
    
    # Auditoría y Estado
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )