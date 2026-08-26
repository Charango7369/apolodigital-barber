#app\modules\appointments\schemas.py
import uuid
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from app.modules.appointments.models import AppointmentStatus, PaymentMethod

class AppointmentBase(BaseModel):
    service_id: uuid.UUID
    barber_id: uuid.UUID
    client_id: uuid.UUID
    start_time: datetime
    end_time: datetime

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    service_id: Optional[uuid.UUID] = None
    barber_id: Optional[uuid.UUID] = None
    client_id: Optional[uuid.UUID] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[AppointmentStatus] = None

class CompleteAppointmentRequest(BaseModel):
    payment_method: PaymentMethod

class AppointmentResponse(AppointmentBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    status: AppointmentStatus
    created_at: datetime
    updated_at: datetime

    payment_method: Optional[PaymentMethod] = None
    service_price_snapshot: Optional[Decimal] = None
    commission_percentage_snapshot: Optional[Decimal] = None
    commission_amount: Optional[Decimal] = None
    completed_at: Optional[datetime] = None
    completed_by: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)
    
class AvailableSlot(BaseModel):
    start_time: datetime
    end_time: datetime

class AvailabilityResponse(BaseModel):
    service_id: uuid.UUID
    barber_id: Optional[uuid.UUID]
    date: str  # YYYY-MM-DD
    available_slots: List[AvailableSlot]