# app/modules/public/router.py
import uuid
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.timezone import get_tenant_timezone
from app.modules.barbers.models import Barber
from app.modules.services.models import Service

from app.modules.public.schemas import (
    PublicServiceResponse, PublicBarberResponse, AvailabilityResponse,
    PublicAppointmentCreate, PublicAppointmentResponse
)
from app.modules.public import service as public_service
from app.modules.public.schemas import PublicTenantInfoResponse


router = APIRouter(prefix="/public/{slug}", tags=["Public Booking"])


@router.get("/services", response_model=list[PublicServiceResponse])
async def get_public_services(slug: str, db: AsyncSession = Depends(get_db_session)):
    tenant = await public_service.get_tenant_by_slug(db, slug)
    return await public_service.list_public_services(db, tenant.id)


@router.get("/barbers", response_model=list[PublicBarberResponse])
async def get_public_barbers(slug: str, db: AsyncSession = Depends(get_db_session)):
    tenant = await public_service.get_tenant_by_slug(db, slug)
    return await public_service.list_public_barbers(db, tenant.id)


@router.get("/availability", response_model=AvailabilityResponse)
async def get_availability(
    slug: str,
    barber_id: uuid.UUID,
    service_id: uuid.UUID,
    date: date = Query(..., description="Fecha a consultar (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db_session)
):
    tenant = await public_service.get_tenant_by_slug(db, slug)
    tenant_tz = await get_tenant_timezone(db, tenant.id)
    slots = await public_service.compute_available_slots(
        db, tenant.id, barber_id, service_id, date, tenant_tz
    )
    return AvailabilityResponse(date=date.isoformat(), available_slots=slots)


@router.post("/appointments", response_model=PublicAppointmentResponse, status_code=201)
async def book_public_appointment(
    slug: str,
    request: PublicAppointmentCreate,
    db: AsyncSession = Depends(get_db_session)
):
    tenant = await public_service.get_tenant_by_slug(db, slug)
    tenant_tz = await get_tenant_timezone(db, tenant.id)

    appointment = await public_service.create_public_appointment(
        db, tenant, tenant_tz,
        request.barber_id, request.service_id, request.start_time,
        request.first_name, request.last_name, request.phone
    )

    barber = await db.get(Barber, appointment.barber_id)
    service_obj = await db.get(Service, appointment.service_id)

    return PublicAppointmentResponse(
        id=appointment.id,
        barber_name=f"{barber.first_name} {barber.last_name}",
        service_name=service_obj.name,
        start_time=appointment.start_time,
        end_time=appointment.end_time,
        status=appointment.status,
    )
    
@router.get("/info", response_model=PublicTenantInfoResponse)
async def get_public_tenant_info(slug: str, db: AsyncSession = Depends(get_db_session)):
    tenant = await public_service.get_tenant_by_slug(db, slug)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return PublicTenantInfoResponse(
        tenant_id=tenant.id,
        name=tenant.name,
        logo_url=tenant.logo_url,
        currency=tenant.currency,
        timezone=tenant.timezone,
    )


