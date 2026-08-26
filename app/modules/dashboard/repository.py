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
    
    
    async def get_average_ticket(
        self, tenant_id: uuid.UUID, start_date: date, end_date: date, tenant_tz: ZoneInfo
    ) -> Decimal:
        """Ticket promedio = revenue total / cantidad de citas completadas."""
        revenue, _, count = await self.get_revenue_totals(tenant_id, start_date, end_date, tenant_tz)
        if count == 0:
            return Decimal("0")
        return (revenue / Decimal(count)).quantize(Decimal("0.01"))

    async def get_peak_hours(
        self, tenant_id: uuid.UUID, start_date: date, end_date: date, tenant_tz: ZoneInfo
    ) -> list:
        """Retorna (hour, count) ordenado por count descendente. Muestra a qué horas hay más citas."""
        from sqlalchemy import literal, Integer
        
        start_dt, end_dt = _date_range_to_utc_bounds(start_date, end_date, tenant_tz)
        
        hour_expr = func.extract("hour", 
            Appointment.start_time.op("AT TIME ZONE")(literal(tenant_tz.key))
        ).cast(Integer)
        
        stmt = (
            select(
                hour_expr.label("hour"),
                func.count(Appointment.id).label("count"),
            )
            .where(
                Appointment.tenant_id == tenant_id,
                Appointment.status == AppointmentStatus.COMPLETED.value,
                Appointment.start_time >= start_dt,
                Appointment.start_time < end_dt,
            )
            .group_by(hour_expr)
            .order_by(func.count(Appointment.id).desc())
        )
        result = await self.session.execute(stmt)
        return result.all()

    async def get_top_payment_method(
        self, tenant_id: uuid.UUID, start_date: date, end_date: date, tenant_tz: ZoneInfo
    ) -> str | None:
        """Retorna el método de pago más usado (CASH, CARD, TRANSFER)."""
        start_dt, end_dt = _date_range_to_utc_bounds(start_date, end_date, tenant_tz)

        stmt = (
            select(
                Appointment.payment_method,
                func.count(Appointment.id).label("count"),
            )
            .where(
                Appointment.tenant_id == tenant_id,
                Appointment.status == AppointmentStatus.COMPLETED.value,
                Appointment.start_time >= start_dt,
                Appointment.start_time < end_dt,
                Appointment.payment_method.isnot(None),
            )
            .group_by(Appointment.payment_method)
            .order_by(func.count(Appointment.id).desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        row = result.one_or_none()
        return row[0] if row else None

    async def get_new_vs_returning_clients(
        self, tenant_id: uuid.UUID, start_date: date, end_date: date, tenant_tz: ZoneInfo
    ) -> tuple[int, int]:
        """Retorna (new_clients, returning_clients).
        
        Nuevo = cliente con exactamente 1 cita completada en el rango.
        Recurrente = cliente con 2+ citas completadas en el rango.
        """
        from sqlalchemy import case
        
        start_dt, end_dt = _date_range_to_utc_bounds(start_date, end_date, tenant_tz)

        # Subquery: contar citas por cliente en el rango
        client_counts = (
            select(
                Appointment.client_id,
                func.count(Appointment.id).label("appointment_count"),
            )
            .where(
                Appointment.tenant_id == tenant_id,
                Appointment.status == AppointmentStatus.COMPLETED.value,
                Appointment.start_time >= start_dt,
                Appointment.start_time < end_dt,
            )
            .group_by(Appointment.client_id)
            .subquery()
        )

        # Contar clientes nuevos (1 cita) y recurrentes (2+ citas)
        stmt = (
            select(
                func.sum(
                    case((client_counts.c.appointment_count == 1, 1), else_=0)
                ).label("new_count"),
                func.sum(
                    case((client_counts.c.appointment_count > 1, 1), else_=0)
                ).label("returning_count"),
            )
        )
        result = await self.session.execute(stmt)
        new_count, returning_count = result.one()
        return int(new_count or 0), int(returning_count or 0)

    async def get_appointments_by_day(
        self, tenant_id: uuid.UUID, start_date: date, end_date: date, tenant_tz: ZoneInfo
    ) -> list:
        """Retorna (date, appointment_count, revenue) por cada día en el rango."""
        from sqlalchemy import literal, cast as sql_cast, Date
        
        start_dt, end_dt = _date_range_to_utc_bounds(start_date, end_date, tenant_tz)
        
        day_expr = sql_cast(
            func.date(
                Appointment.start_time.op("AT TIME ZONE")(literal(tenant_tz.key))
            ),
            Date
        )
        
        stmt = (
            select(
                day_expr.label("day"),
                func.count(Appointment.id).label("appointment_count"),
                func.coalesce(func.sum(Appointment.service_price_snapshot), 0).label("revenue"),
            )
            .where(
                Appointment.tenant_id == tenant_id,
                Appointment.status == AppointmentStatus.COMPLETED.value,
                Appointment.start_time >= start_dt,
                Appointment.start_time < end_dt,
            )
            .group_by(day_expr)
            .order_by(day_expr)
        )
        result = await self.session.execute(stmt)
        return result.all()
