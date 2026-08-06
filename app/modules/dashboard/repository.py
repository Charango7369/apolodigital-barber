# app/modules/dashboard/repository.py
import uuid
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.appointments.models import Appointment, AppointmentStatus
from app.modules.barbers.models import Barber
from app.modules.services.models import Service


def _date_range_to_utc_bounds(start_date: date, end_date: date, tenant_tz: ZoneInfo) -> tuple[datetime, datetime]:
    """Convierte un rango de fechas de calendario (interpretadas en la zona del tenant)
    a límites datetime aware, para comparar contra columnas TIMESTAMPTZ sin el bug
    de Bolivia UTC-4 que ya resolviste en FoodOS."""
    start_dt = datetime.combine(start_date, time.min, tzinfo=tenant_tz)
    end_dt = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=tenant_tz)
    return start_dt, end_dt


class DashboardRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_appointment_counts(
        self, tenant_id: uuid.UUID, start_date: date, end_date: date, tenant_tz: ZoneInfo
    ) -> dict[str, int]:
        start_dt, end_dt = _date_range_to_utc_bounds(start_date, end_date, tenant_tz)

        stmt = (
            select(Appointment.status, func.count(Appointment.id))
            .where(
                Appointment.tenant_id == tenant_id,
                Appointment.start_time >= start_dt,
                Appointment.start_time < end_dt,
            )
            .group_by(Appointment.status)
        )
        result = await self.session.execute(stmt)
        return {row[0]: row[1] for row in result.all()}

    async def get_revenue_totals(
        self, tenant_id: uuid.UUID, start_date: date, end_date: date, tenant_tz: ZoneInfo,
        barber_id: uuid.UUID | None = None
    ) -> tuple[Decimal, Decimal, int]:
        start_dt, end_dt = _date_range_to_utc_bounds(start_date, end_date, tenant_tz)

        stmt = select(
            func.coalesce(func.sum(Appointment.service_price_snapshot), 0),
            func.coalesce(func.sum(Appointment.commission_amount), 0),
            func.count(Appointment.id),
        ).where(
            Appointment.tenant_id == tenant_id,
            Appointment.status == AppointmentStatus.COMPLETED.value,
            Appointment.start_time >= start_dt,
            Appointment.start_time < end_dt,
        )
        if barber_id:
            stmt = stmt.where(Appointment.barber_id == barber_id)

        result = await self.session.execute(stmt)
        revenue, commission, count = result.one()
        return Decimal(str(revenue)), Decimal(str(commission)), count

    async def get_by_barber(
        self, tenant_id: uuid.UUID, start_date: date, end_date: date, tenant_tz: ZoneInfo
    ) -> list:
        start_dt, end_dt = _date_range_to_utc_bounds(start_date, end_date, tenant_tz)

        stmt = (
            select(
                Barber.id, Barber.first_name, Barber.last_name,
                func.coalesce(func.sum(Appointment.service_price_snapshot), 0),
                func.coalesce(func.sum(Appointment.commission_amount), 0),
                func.count(Appointment.id),
            )
            .join(Appointment, Appointment.barber_id == Barber.id)
            .where(
                Appointment.tenant_id == tenant_id,
                Appointment.status == AppointmentStatus.COMPLETED.value,
                Appointment.start_time >= start_dt,
                Appointment.start_time < end_dt,
            )
            .group_by(Barber.id, Barber.first_name, Barber.last_name)
            .order_by(func.sum(Appointment.service_price_snapshot).desc())
        )
        result = await self.session.execute(stmt)
        return result.all()

    async def get_by_service(
        self, tenant_id: uuid.UUID, start_date: date, end_date: date, tenant_tz: ZoneInfo
    ) -> list:
        start_dt, end_dt = _date_range_to_utc_bounds(start_date, end_date, tenant_tz)

        stmt = (
            select(
                Service.id, Service.name,
                func.coalesce(func.sum(Appointment.service_price_snapshot), 0),
                func.count(Appointment.id),
            )
            .join(Appointment, Appointment.service_id == Service.id)
            .where(
                Appointment.tenant_id == tenant_id,
                Appointment.status == AppointmentStatus.COMPLETED.value,
                Appointment.start_time >= start_dt,
                Appointment.start_time < end_dt,
            )
            .group_by(Service.id, Service.name)
            .order_by(func.sum(Appointment.service_price_snapshot).desc())
        )
        result = await self.session.execute(stmt)
        return result.all()