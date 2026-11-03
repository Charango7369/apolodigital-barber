from pydantic import BaseModel, Field
from typing import Optional, List

# Services
class ServiceBase(BaseModel):
    name: str
    category: str = "Cortes"
    duration_minutes: int = 30
    price: float
    description: Optional[str] = ""
    is_active: bool = True

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    duration_minutes: Optional[int] = None
    price: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ServiceResponse(ServiceBase):
    id: str

# Barbers
class BarberBase(BaseModel):
    name: str
    nickname: Optional[str] = ""
    photo_url: Optional[str] = ""
    phone: Optional[str] = ""
    specialty: Optional[str] = "Estilista Integral"
    commission_rate: float = 0.50
    rating: float = 5.0
    is_active: bool = True

class BarberCreate(BarberBase):
    pass

class BarberUpdate(BaseModel):
    name: Optional[str] = None
    nickname: Optional[str] = None
    photo_url: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    commission_rate: Optional[float] = None
    rating: Optional[float] = None
    is_active: Optional[bool] = None

class BarberResponse(BarberBase):
    id: str

# Clients
class ClientBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    notes: Optional[str] = ""

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None

class ClientResponse(ClientBase):
    id: str
    total_visits: int = 0
    total_spent: float = 0.0
    last_visit: Optional[str] = None
    created_at: str

# Appointments
class AppointmentBase(BaseModel):
    tenant_id: Optional[str] = None
    client_name: str
    client_phone: str
    client_id: Optional[str] = None
    barber_id: str
    barber_name: Optional[str] = None
    service_id: str
    service_name: Optional[str] = None
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    duration_minutes: Optional[int] = 30
    price: Optional[float] = 0.0
    status: str = "confirmed"  # confirmed, in_progress, completed, cancelled, no_show
    notes: Optional[str] = ""

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    barber_id: Optional[str] = None
    service_id: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    duration_minutes: Optional[int] = None
    price: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class AppointmentStatusUpdate(BaseModel):
    status: str

class AppointmentResponse(AppointmentBase):
    id: str
    created_at: str

class AvailabilityResponse(BaseModel):
    date: str
    service_id: str
    service_name: str
    duration_minutes: int
    barber_id: Optional[str] = None
    available_slots: List[str]

# Checkout & Sales
class CheckoutCreate(BaseModel):
    appointment_id: Optional[str] = None
    client_name: str
    barber_id: str
    barber_name: str
    services_total: float
    products_total: float = 0.0
    tip: float = 0.0
    total: float
    payment_method: str = "cash"  # cash, qr_simple, card
    qr_reference_code: Optional[str] = None
    notes: Optional[str] = ""

class SaleResponse(BaseModel):
    id: str
    tenant_id: Optional[str] = "org_apolo_sopocachi"
    cash_shift_id: Optional[str] = None
    appointment_id: Optional[str]
    client_name: str
    barber_id: str
    barber_name: str
    subtotal: float
    tip: float
    total: float
    payment_method: str
    qr_reference_code: Optional[str] = None
    service_price_snapshot: Optional[float] = 0.0
    commission_percentage_snapshot: Optional[float] = 0.50
    commission_amount: Optional[float] = 0.0
    notes: Optional[str]
    created_at: str

# Business Profile
class BusinessInfo(BaseModel):
    name: str = "ApoloDigital Barber"
    slogan: str = "Tecnología para barberías desde la Bolivia real"
    phone: str = "+591 70000000"
    address: str = "Av. Principal #1024, Edificio Apolo"
    currency: str = "Bs."
    website: str = "apolodigital.lat"
    schedule_start: str = "08:00"
    schedule_end: str = "21:00"
    slot_interval_minutes: int = 30

# Organizations / Barberías (Multi-Tenant SaaS)
class OrganizationBase(BaseModel):
    name: str
    slug: Optional[str] = None
    address: Optional[str] = ""
    phone: Optional[str] = ""
    currency: Optional[str] = "Bs."
    is_active: Optional[bool] = True

class OrganizationCreate(OrganizationBase):
    admin_name: Optional[str] = "Dueño de Barbería"
    admin_email: Optional[str] = None
    admin_password: Optional[str] = "Apolo2026!"
    clone_default_services: Optional[bool] = True

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None

class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    address: Optional[str] = ""
    phone: Optional[str] = ""
    currency: str = "Bs."
    is_active: bool = True
    created_at: str
    barbers_count: int = 0
    appointments_count: int = 0
    clients_count: int = 0
    admin_email: Optional[str] = None

