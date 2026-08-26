# app/modules/dashboard/schemas.py
import uuid
from datetime import date
from decimal import Decimal
from pydantic import BaseModel

class AppointmentStatusCounts(BaseModel):
    pending: int = 0
    confirmed: int = 0
    completed: int = 0
    canceled: int = 0
    no_show: int = 0

class BarberBreakdown(BaseModel):
    barber_id: uuid.UUID
    barber_name: str
    revenue: Decimal
    commission: Decimal
    completed_count: int

class ServiceBreakdown(BaseModel):
    service_id: uuid.UUID
    service_name: str
    revenue: Decimal
    completed_count: int

class DashboardSummaryResponse(BaseModel):
    start_date: date
    end_date: date
    currency: str
    total_revenue: Decimal
    total_commissions: Decimal
    net_revenue: Decimal
    appointment_counts: AppointmentStatusCounts
    by_barber: list[BarberBreakdown]
    by_service: list[ServiceBreakdown]

class MyStatsResponse(BaseModel):
    start_date: date
    end_date: date
    currency: str
    total_commission_earned: Decimal
    completed_count: int
    
class PeakHour(BaseModel):
    hour: int
    count: int

class DayBreakdown(BaseModel):
    day: date
    appointment_count: int
    revenue: Decimal

class DashboardSummaryResponse(BaseModel):
    start_date: date
    end_date: date
    currency: str
    total_revenue: Decimal
    total_commissions: Decimal
    net_revenue: Decimal
    average_ticket: Decimal  # NUEVO
    appointment_counts: AppointmentStatusCounts
    by_barber: list[BarberBreakdown]
    by_service: list[ServiceBreakdown]
    peak_hours: list[PeakHour]  # NUEVO
    top_payment_method: str | None  # NUEVO
    new_clients: int  # NUEVO
    returning_clients: int  # NUEVO
    appointments_by_day: list[DayBreakdown]  # NUEVO