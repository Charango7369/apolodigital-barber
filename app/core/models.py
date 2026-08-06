from sqlalchemy import Column, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_mixin

@declarative_mixin
class TimestampMixin:
    """
    Mixin que añade columnas de auditoría de tiempo a cualquier modelo que lo herede.
    Utiliza la función func.now() para que PostgreSQL maneje la hora exacta.
    """
    created_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )
    
    updated_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )