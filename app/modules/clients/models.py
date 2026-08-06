from datetime import date
from sqlalchemy import String, Date, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import TenantBaseModel

class Client(TenantBaseModel):
    __tablename__ = "clients"

    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str | None] = mapped_column(String(100))
    
    # Contacto (Opcionales para evitar fricción en recepción)
    phone: Mapped[str | None] = mapped_column(String(50), index=True)
    email: Mapped[str | None] = mapped_column(String(255), index=True)
    
    # Datos Demográficos y Fidelización
    birthday: Mapped[date | None] = mapped_column(Date)
    
    # Particularidades del negocio de Barbería / Salón
    hair_type: Mapped[str | None] = mapped_column(String(100))
    allergies: Mapped[str | None] = mapped_column(Text)
    preferences: Mapped[str | None] = mapped_column(Text)
    observations: Mapped[str | None] = mapped_column(Text)