# app/modules/public/service.py
import uuid
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tenants.models import Tenant
from app.modules.barbers.models import Barber
from app.modules.services.models import Service
from app.modules.clients.models import Client
from app.modules.appointments.models import Appointment, AppointmentStatus

# Reuso intencional: estas reglas ya existen en appointments/router.py y no quiero
# duplicar la lógica de horarios/solapamiento en dos lugares. Ver nota en el chat.
from app.modules.appointments.router import (
    validate_minimum_notice,
    validate_within_working_hours,
    validate_no_overlap,
    DAYS_EN,
)

SLOT_GRANULARITY_MINUTES = 15
MIN_NOTICE_MINUTES = 30


async def get_tenant_by_slug(db: AsyncSession, slug: str) -> Tenant:
    stmt = select(Tenant).where(Tenant.slug == slug, Tenant.is_active == True)
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()
    if not tenant:
        # Mensaje genérico a propósito -- no revela si el slug no existe o el
        # negocio está desactivado (mismo criterio que el login con credenciales).
        raise HTTPException(status_code=404, detail="Negocio no encontrado.")
    return tenant


async def list_public_services(db: AsyncSession, tenant_id: uuid.UUID) -> list[Service]:
    stmt = select(Service).where(Service.tenant_id == tenant_id, Service.is_active == True)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def list_public_barbers(db: AsyncSession, tenant_id: uuid.UUID) -> list[Barber]:
    stmt = select(Barber).where(Barber.tenant_id == tenant_id, Barber.is_active == True)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def compute_available_slots(
    db: AsyncSession, tenant_id: uuid.UUID, barber_id: uuid.UUID, service_id: uuid.UUID,
    target_date: date, tenant_tz: ZoneInfo
) -> list[datetime]:
    barber = await db.get(Barber, barber_id)
    if not barber or barber.tenant_id != tenant_id or not barber.is_active:
        raise HTTPException(status_code=404, detail="Barbero no disponible.")

    service = await db.get(Service, service_id)
    if not service or service.tenant_id != tenant_id or not service.is_active:
        raise HTTPException(status_code=404, detail="Servicio no disponible.")

    if not barber.working_hours:
        return []

    day_key = DAYS_EN[target_date.weekday()]
    day_range = barber.working_hours.get(day_key)
    if not day_range:
        return []

    try:
        start_str, end_str = day_range.split("-")
        work_start = datetime.strptime(start_str.strip(), "%H:%M").time()
        work_end = datetime.strptime(end_str.strip(), "%H:%M").time()
    except (ValueError, AttributeError):
        return []

    duration = timedelta(minutes=service.duration_minutes)
    granularity = timedelta(minutes=SLOT_GRANULARITY_MINUTES)

    day_start_local = datetime.combine(target_date, work_start, tzinfo=tenant_tz)
    day_end_local = datetime.combine(target_date, work_end, tzinfo=tenant_tz)

    # Cualquier cita activa (incluida PENDING sin confirmar) bloquea el horario --
    # evita que dos visitantes reserven el mismo slot mientras uno espera confirmación.
    stmt = select(Appointment.start_time, Appointment.end_time).where(
        Appointment.tenant_id == tenant_id,
        Appointment.barber_id == barber_id,
        Appointment.status != AppointmentStatus.CANCELED.value,
        Appointment.start_time < day_end_local,
        Appointment.end_time > day_start_local,
    )
    result = await db.execute(stmt)
    busy_ranges = [(row[0], row[1]) for row in result.all()]

    now_local = datetime.now(tenant_tz)
    earliest_allowed = now_local + timedelta(minutes=MIN_NOTICE_MINUTES)

    slots = []
    cursor = day_start_local
    while cursor + duration <= day_end_local:
        slot_end = cursor + duration
        if cursor >= earliest_allowed:
            overlaps = any(cursor < busy_end and slot_end > busy_start for busy_start, busy_end in busy_ranges)
            if not overlaps:
                slots.append(cursor)
        cursor += granularity

    return slots


async def find_or_create_client(
    db: AsyncSession, tenant_id: uuid.UUID, first_name: str, last_name: str | None, phone: str
) -> Client:
    stmt = select(Client).where(Client.tenant_id == tenant_id, Client.phone == phone)
    result = await db.execute(stmt)
    client = result.scalar_one_or_none()

    if client:
        if not client.is_active:
            client.is_active = True  # reactivamos -- sigue siendo el mismo cliente real
        return client

    new_client = Client(
        tenant_id=tenant_id, first_name=first_name, last_name=last_name, phone=phone
    )
    db.add(new_client)
    await db.flush()  # necesitamos el id sin cerrar la transacción todavía
    return new_client


async def create_public_appointment(
    db: AsyncSession, tenant: Tenant, tenant_tz: ZoneInfo,
    barber_id: uuid.UUID, service_id: uuid.UUID, start_time: datetime,
    first_name: str, last_name: str | None, phone: str
) -> Appointment:
    barber = await db.get(Barber, barber_id)
    if not barber or barber.tenant_id != tenant.id or not barber.is_active:
        raise HTTPException(status_code=404, detail="Barbero no disponible.")

    service = await db.get(Service, service_id)
    if not service or service.tenant_id != tenant.id or not service.is_active:
        raise HTTPException(status_code=404, detail="Servicio no disponible.")

    # end_time se calcula acá, nunca se confía en un valor que mande el público
    end_time = start_time + timedelta(minutes=service.duration_minutes)

    # Re-validación server-side completa -- el cliente pudo haber consultado
    # /availability hace un rato y el slot ya no estar libre (condición de carrera).
    validate_minimum_notice(start_time, tenant_tz, minutes=MIN_NOTICE_MINUTES)
    validate_within_working_hours(barber, start_time, end_time, tenant_tz)
    await validate_no_overlap(db, tenant.id, barber_id, start_time, end_time)

    client = await find_or_create_client(db, tenant.id, first_name, last_name, phone)

    new_appointment = Appointment(
        tenant_id=tenant.id, barber_id=barber_id, service_id=service_id, client_id=client.id,
        start_time=start_time, end_time=end_time,
    )
    db.add(new_appointment)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Ese horario ya no está disponible, elegí otro.")

    await db.refresh(new_appointment)
    return new_appointment