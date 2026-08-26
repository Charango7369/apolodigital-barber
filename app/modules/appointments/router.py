# app/modules/appointments/router.py
import uuid
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db_session
from app.core.dependencies import get_current_active_user, require_role
from app.core.roles import ALL_STAFF, FRONT_DESK, ADMIN_ONLY
from app.core.timezone import get_tenant_timezone
from app.modules.users.models import User

from app.modules.appointments.models import Appointment, AppointmentStatus
from app.modules.appointments.schemas import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse,
    CompleteAppointmentRequest
)
from app.modules.barbers.models import Barber
from app.modules.services.models import Service
from app.modules.clients.models import Client

from app.modules.tenants.models import Tenant
from app.modules.appointments.schemas import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse,
    CompleteAppointmentRequest,
    AvailableSlot,
    AvailabilityResponse  # <-- AGREGAR
)

router = APIRouter(prefix="/appointments", tags=["Appointments"])

DAYS_EN = {0: "monday", 1: "tuesday", 2: "wednesday", 3: "thursday",
           4: "friday", 5: "saturday", 6: "sunday"}

RESCHEDULE_FIELDS = {"start_time", "end_time", "barber_id"}


def validate_minimum_notice(start_time: datetime, tenant_tz: ZoneInfo, minutes: int = 30):
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=tenant_tz)
    now = datetime.now(tenant_tz)
    if start_time < (now + timedelta(minutes=minutes)):
        raise HTTPException(
            status_code=400,
            detail=f"La reserva debe realizarse con al menos {minutes} minutos de anticipación. Por favor, selecciona un horario más lejano."
        )


async def validate_related_entities(
    db: AsyncSession, tenant_id: uuid.UUID,
    barber_id: uuid.UUID, service_id: uuid.UUID, client_id: uuid.UUID
) -> Barber:
    barber = await db.get(Barber, barber_id)
    if not barber or barber.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Barbero no encontrado en este negocio.")
    if not barber.is_active:
        raise HTTPException(status_code=400, detail="Este barbero está desactivado y no puede recibir nuevas citas.")

    service = await db.get(Service, service_id)
    if not service or service.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Servicio no encontrado en este negocio.")
    if not service.is_active:
        raise HTTPException(status_code=400, detail="Este servicio está desactivado y no puede usarse en nuevas citas.")

    client = await db.get(Client, client_id)
    if not client or client.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Cliente no encontrado en este negocio.")
    if not client.is_active:
        raise HTTPException(status_code=400, detail="Este cliente está desactivado.")

    return barber


def validate_within_working_hours(
    barber: Barber, start_time: datetime, end_time: datetime, tenant_tz: ZoneInfo
):
    if not barber.working_hours:
        return

    local_start = start_time.astimezone(tenant_tz)
    local_end = end_time.astimezone(tenant_tz)

    day_key = DAYS_EN[local_start.weekday()]
    day_range = barber.working_hours.get(day_key)

    if not day_range:
        raise HTTPException(status_code=400, detail=f"El barbero no atiende los {day_key}.")

    try:
        start_str, end_str = day_range.split("-")
        work_start = datetime.strptime(start_str.strip(), "%H:%M").time()
        work_end = datetime.strptime(end_str.strip(), "%H:%M").time()
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=500,
            detail=f"Formato de horario inválido configurado para el barbero: '{day_range}'"
        )

    if local_start.time() < work_start or local_end.time() > work_end:
        raise HTTPException(
            status_code=400,
            detail=f"Horario fuera de atención del barbero ({day_range})."
        )


async def validate_no_overlap(
    db: AsyncSession, tenant_id: uuid.UUID, barber_id: uuid.UUID,
    start: datetime, end: datetime, exclude_id: Optional[uuid.UUID] = None
):
    query = select(Appointment).where(
        Appointment.tenant_id == tenant_id,
        Appointment.barber_id == barber_id,
        Appointment.status != AppointmentStatus.CANCELED.value,
        Appointment.start_time < end,
        Appointment.end_time > start
    )
    if exclude_id:
        query = query.where(Appointment.id != exclude_id)

    result = await db.execute(query)
    overlapping = result.scalars().first()

    if overlapping:
        raise HTTPException(
            status_code=400,
            detail="El barbero ya tiene una cita programada en este horario."
        )

@router.get("/availability", response_model=AvailabilityResponse)
async def get_availability(
    service_id: uuid.UUID,
    date: str,  # YYYY-MM-DD
    barber_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_active_user)
):
    """
    Calcula slots disponibles para una fecha y servicio.
    Si barber_id es None, devuelve disponibilidad de TODOS los barberos.
    """
    tenant_id = current_user.tenant_id
    
    # Fetch service (para duration)
    service = await db.get(Service, service_id)
    if not service or service.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    # Fetch tenant (para horarios)
    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    
    # Parse date
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Usar YYYY-MM-DD")
    
    # Timezone del tenant
    tenant_tz = ZoneInfo(tenant.timezone)
    
    # Horarios: parse HH:MM
    opening_hour, opening_min = map(int, tenant.opening_time.split(":"))
    closing_hour, closing_min = map(int, tenant.closing_time.split(":"))
    
    opening_dt = datetime(target_date.year, target_date.month, target_date.day, 
                         opening_hour, opening_min, tzinfo=tenant_tz)
    closing_dt = datetime(target_date.year, target_date.month, target_date.day, 
                         closing_hour, closing_min, tzinfo=tenant_tz)
    
    # Generar slots posibles
    duration = timedelta(minutes=service.duration_minutes)
    slots = []
    current = opening_dt
    while current + duration <= closing_dt:
        slots.append((current, current + duration))
        current += duration
    
    # Fetch citas existentes para ese día (y barber si aplica)
    query = select(Appointment).where(
        Appointment.tenant_id == tenant_id,
        Appointment.start_time >= opening_dt,
        Appointment.start_time < closing_dt,
        Appointment.status.in_([AppointmentStatus.PENDING.value, AppointmentStatus.CONFIRMED.value])
    )
    if barber_id:
        query = query.where(Appointment.barber_id == barber_id)
    
    result = await db.execute(query)
    existing_appointments = result.scalars().all()
    
    # Excluir slots que se solapan con citas
    available_slots = []
    for slot_start, slot_end in slots:
        conflict = False
        for appt in existing_appointments:
            if not (slot_end <= appt.start_time or slot_start >= appt.end_time):
                conflict = True
                break
        if not conflict:
            available_slots.append(AvailableSlot(start_time=slot_start, end_time=slot_end))
    
    return AvailabilityResponse(
        service_id=service_id,
        barber_id=barber_id,
        date=date,
        available_slots=available_slots
    )

@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    appointment_in: AppointmentCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_role(ALL_STAFF))
):
    tenant_id = current_user.tenant_id

    if appointment_in.start_time >= appointment_in.end_time:
        raise HTTPException(status_code=400, detail="start_time debe ser anterior a end_time.")

    tenant_tz = await get_tenant_timezone(db, tenant_id)
    validate_minimum_notice(appointment_in.start_time, tenant_tz, minutes=30)

    barber = await validate_related_entities(
        db, tenant_id,
        appointment_in.barber_id, appointment_in.service_id, appointment_in.client_id
    )
    validate_within_working_hours(barber, appointment_in.start_time, appointment_in.end_time, tenant_tz)

    await validate_no_overlap(
        db, tenant_id, appointment_in.barber_id,
        appointment_in.start_time, appointment_in.end_time
    )

    new_appointment = Appointment(**appointment_in.model_dump(), tenant_id=tenant_id)
    db.add(new_appointment)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Conflicto de horario detectado al guardar.")

    await db.refresh(new_appointment)
    return new_appointment


@router.get("/", response_model=List[AppointmentResponse])
async def list_appointments(
    date: Optional[str] = None,  # YYYY-MM-DD
    barber_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,  # PENDING, CONFIRMED, COMPLETED, CANCELED, NO_SHOW
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_active_user)
):
    """
    Lista citas del tenant actual.
    Filtros opcionales: date, barber_id, status
    """
    query = select(Appointment).where(Appointment.tenant_id == current_user.tenant_id)
    
    # Filtro por fecha
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
            tenant = await db.get(Tenant, current_user.tenant_id)
            tenant_tz = ZoneInfo(tenant.timezone)
            start_of_day = datetime(target_date.year, target_date.month, target_date.day, 0, 0, tzinfo=tenant_tz)
            end_of_day = datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59, tzinfo=tenant_tz)
            query = query.where(Appointment.start_time >= start_of_day, Appointment.start_time <= end_of_day)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha inválido. Usar YYYY-MM-DD")
    
    # Filtro por barbero
    if barber_id:
        query = query.where(Appointment.barber_id == barber_id)
    
    # Filtro por estado
    if status:
        if status not in ["PENDING", "CONFIRMED", "COMPLETED", "CANCELED", "NO_SHOW"]:
            raise HTTPException(status_code=400, detail="Estado inválido")
        query = query.where(Appointment.status == status)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Appointment).where(
        Appointment.id == appointment_id,
        Appointment.tenant_id == current_user.tenant_id
    )
    result = await db.execute(query)
    appointment = result.scalar_one_or_none()

    if not appointment:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    return appointment


@router.patch("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: uuid.UUID,
    appointment_in: AppointmentUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_role(ALL_STAFF))
):
    tenant_id = current_user.tenant_id

    query = select(Appointment).where(
        Appointment.id == appointment_id,
        Appointment.tenant_id == tenant_id
    )
    result = await db.execute(query)
    appointment = result.scalar_one_or_none()

    if not appointment:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    update_data = appointment_in.model_dump(exclude_unset=True)

    if not appointment:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    # Una cita completada es inmutable por esta vía -- cualquier cambio (no solo
    # status) debe pasar primero por /revert. Evita que se reagende el barbero/horario
    # de una cita cuya comisión ya quedó congelada con datos del barbero original.
    if appointment.status == AppointmentStatus.COMPLETED.value:
        raise HTTPException(
            status_code=400,
            detail="Esta cita ya fue completada. Para modificarla, primero revertila con PATCH /appointments/{id}/revert."
        )

    update_data = appointment_in.model_dump(exclude_unset=True)

    if "status" in update_data and update_data["status"] == AppointmentStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Usá PATCH /appointments/{id}/complete para completar una cita (calcula la comisión)."
        )

    is_reschedule = any(k in update_data for k in RESCHEDULE_FIELDS)
    if is_reschedule and current_user.role not in FRONT_DESK:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo ADMIN, MANAGER o RECEPTIONIST pueden reagendar una cita."
        )

    if "service_id" in update_data:
        service = await db.get(Service, update_data["service_id"])
        if not service or service.tenant_id != tenant_id:
            raise HTTPException(status_code=404, detail="Servicio no encontrado en este negocio.")

    if "client_id" in update_data:
        client = await db.get(Client, update_data["client_id"])
        if not client or client.tenant_id != tenant_id:
            raise HTTPException(status_code=404, detail="Cliente no encontrado en este negocio.")

    if is_reschedule:
        tenant_tz = await get_tenant_timezone(db, tenant_id)

        new_start = update_data.get("start_time", appointment.start_time)
        new_end = update_data.get("end_time", appointment.end_time)
        new_barber_id = update_data.get("barber_id", appointment.barber_id)

        if new_start >= new_end:
            raise HTTPException(status_code=400, detail="start_time debe ser anterior a end_time.")

        validate_minimum_notice(new_start, tenant_tz, minutes=30)

        barber = await db.get(Barber, new_barber_id)
        if not barber or barber.tenant_id != tenant_id:
            raise HTTPException(status_code=404, detail="Barbero no encontrado en este negocio.")
        if not barber.is_active:
            raise HTTPException(status_code=400, detail="Este barbero está desactivado y no puede recibir nuevas citas.")

        validate_within_working_hours(barber, new_start, new_end, tenant_tz)

        await validate_no_overlap(
            db, tenant_id, new_barber_id, new_start, new_end, exclude_id=appointment_id
        )

    for field, value in update_data.items():
        setattr(appointment, field, value)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Conflicto de horario detectado al guardar.")

    await db.refresh(appointment)
    return appointment


@router.patch("/{appointment_id}/complete", response_model=AppointmentResponse)
async def complete_appointment(
    appointment_id: uuid.UUID,
    request: CompleteAppointmentRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_role(FRONT_DESK))
):
    """Marca la cita como completada. Congela (snapshot) el precio del servicio
    y la comisión del barbero en este momento -- cambios futuros a esos valores
    no afectan citas ya completadas."""
    tenant_id = current_user.tenant_id

    query = select(Appointment).where(
        Appointment.id == appointment_id,
        Appointment.tenant_id == tenant_id
    )
    result = await db.execute(query)
    appointment = result.scalar_one_or_none()

    if not appointment:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    if appointment.status not in (AppointmentStatus.PENDING.value, AppointmentStatus.CONFIRMED.value):
        raise HTTPException(
            status_code=400,
            detail=f"No se puede completar una cita en estado '{appointment.status}'."
        )

    barber = await db.get(Barber, appointment.barber_id)
    service = await db.get(Service, appointment.service_id)

    price = service.price
    commission_pct = Decimal(str(barber.commission_percentage))
    commission_amount = (price * commission_pct / Decimal("100")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    appointment.status = AppointmentStatus.COMPLETED.value
    appointment.payment_method = request.payment_method.value
    appointment.service_price_snapshot = price
    appointment.commission_percentage_snapshot = commission_pct
    appointment.commission_amount = commission_amount
    appointment.completed_at = datetime.now(timezone.utc)
    appointment.completed_by = current_user.id

    await db.commit()
    await db.refresh(appointment)
    return appointment


@router.patch("/{appointment_id}/revert", response_model=AppointmentResponse)
async def revert_appointment(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_role(ADMIN_ONLY))
):
    """Revierte una cita completada de vuelta a CONFIRMED. Limpia el snapshot --
    si se vuelve a completar, se recalcula desde cero."""
    tenant_id = current_user.tenant_id

    query = select(Appointment).where(
        Appointment.id == appointment_id,
        Appointment.tenant_id == tenant_id
    )
    result = await db.execute(query)
    appointment = result.scalar_one_or_none()

    if not appointment:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    if appointment.status != AppointmentStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Solo se puede revertir una cita que esté completada.")

    appointment.status = AppointmentStatus.CONFIRMED.value
    appointment.payment_method = None
    appointment.service_price_snapshot = None
    appointment.commission_percentage_snapshot = None
    appointment.commission_amount = None
    appointment.completed_at = None
    appointment.completed_by = None

    await db.commit()
    await db.refresh(appointment)
    return appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_role(FRONT_DESK))
):
    query = select(Appointment).where(
        Appointment.id == appointment_id,
        Appointment.tenant_id == current_user.tenant_id
    )
    result = await db.execute(query)
    appointment = result.scalar_one_or_none()

    if not appointment:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    await db.delete(appointment)
    await db.commit()