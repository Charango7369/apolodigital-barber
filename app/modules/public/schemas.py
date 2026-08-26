# app/modules/public/schemas.py
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class PublicServiceResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    price: Decimal
    duration_minutes: int

    model_config = ConfigDict(from_attributes=True)

class PublicBarberResponse(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    specialty: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class AvailabilityResponse(BaseModel):
    date: str
    available_slots: list[datetime]

class PublicAppointmentCreate(BaseModel):
    barber_id: uuid.UUID
    service_id: uuid.UUID
    start_time: datetime
    first_name: str = Field(..., max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: str = Field(..., max_length=50)

class PublicAppointmentResponse(BaseModel):
    id: uuid.UUID
    barber_name: str
    service_name: str
    start_time: datetime
    end_time: datetime
    status: str
    
class PublicTenantInfoResponse(BaseModel):
    tenant_id: uuid.UUID
    name: str
    logo_url: Optional[str] = None
    currency: str
    timezone: str

    model_config = ConfigDict(from_attributes=True)