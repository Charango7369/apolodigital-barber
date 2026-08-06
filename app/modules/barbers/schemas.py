# app\modules\barbers\schemas.py
import uuid
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, Field

class BarberBase(BaseModel):
    user_id: Optional[uuid.UUID] = None
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    specialty: Optional[str] = Field(None, max_length=100)
    commission_percentage: float = Field(0.0, ge=0.0, le=100.0)
    working_hours: Optional[dict[str, Any]] = None

class BarberCreate(BarberBase):
    pass

class BarberUpdate(BaseModel):
    user_id: Optional[uuid.UUID] = None
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    specialty: Optional[str] = Field(None, max_length=100)
    commission_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    working_hours: Optional[dict[str, Any]] = None
    is_active: Optional[bool] = None

class BarberResponse(BarberBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)