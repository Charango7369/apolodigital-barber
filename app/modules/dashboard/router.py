# app/modules/dashboard/router.py
import uuid
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.dependencies import get_current_active_user, require_role
from app.core.roles import MANAGEMENT
from app.core.timezone import get_tenant_timezone
from app.modules.users.models import User
from app.modules.barbers.models import Barber
from app.modules.tenants.models import Tenant
from app.modules.appointments.models import AppointmentStatus

from app.modules.dashboard.repository import DashboardRepository
from app.modules.dashboard.schemas import (
    DashboardSummaryResponse, MyStatsResponse, AppointmentStatusCounts,
    BarberBreakdown, ServiceBreakdown
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def get_dashboard_repo(session: AsyncSession = Depends(get_db_session)) -> DashboardRepository:
    return DashboardRepository(session)


def _validate_date_range(start_date: date, end_date: date):
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date debe ser anterior o igual a end_date.")


@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    start_date: date = Query(..., description="Fecha inicial (YYYY-MM-DD), inclusive"),
    end_date: date = Query(..., description="Fecha final (YYYY-MM-DD), inclusive"),
    db: AsyncSession = Depends(get_db_session),
    repo: DashboardRepository = Depends(get_dashboard_repo),
    current_user: User = Depends(require_role(MANAGEMENT))
):
    """Ingresos totales, comisiones y desglose por barbero/servicio. Solo ADMIN/MANAGER."""
    _validate_date_range(start_date, end_date)
    tenant_id = current_user.tenant_id
    tenant_tz = await get_tenant_timezone(db, tenant_id)
    tenant = await db.get(Tenant, tenant_id)  # ya cacheado por identity map -- get_tenant_timezone lo trajo primero

    counts_raw = await repo.get_appointment_counts(tenant_id, start_date, end_date, tenant_tz)
    revenue, commissions, _ = await repo.get_revenue_totals(tenant_id, start_date, end_date, tenant_tz)
    by_barber_raw = await repo.get_by_barber(tenant_id, start_date, end_date, tenant_tz)
    by_service_raw = await repo.get_by_service(tenant_id, start_date, end_date, tenant_tz)

    appointment_counts = AppointmentStatusCounts(
        pending=counts_raw.get(AppointmentStatus.PENDING.value, 0),
        confirmed=counts_raw.get(AppointmentStatus.CONFIRMED.value, 0),
        completed=counts_raw.get(AppointmentStatus.COMPLETED.value, 0),
        canceled=counts_raw.get(AppointmentStatus.CANCELED.value, 0),
        no_show=counts_raw.get(AppointmentStatus.NO_SHOW.value, 0),
    )

    by_barber = [
        BarberBreakdown(
            barber_id=row[0], barber_name=f"{row[1]} {row[2]}",
            revenue=Decimal(str(row[3])), commission=Decimal(str(row[4])), completed_count=row[5]
        )
        for row in by_barber_raw
    ]

    by_service = [
        ServiceBreakdown(
            service_id=row[0], service_name=row[1],
            revenue=Decimal(str(row[2])), completed_count=row[3]
        )
        for row in by_service_raw
    ]

    return DashboardSummaryResponse(
        start_date=start_date, end_date=end_date, currency=tenant.currency,
        total_revenue=revenue, total_commissions=commissions, net_revenue=revenue - commissions,
        appointment_counts=appointment_counts, by_barber=by_barber, by_service=by_service,
    )


@router.get("/me", response_model=MyStatsResponse)
async def get_my_stats(
    start_date: date = Query(..., description="Fecha inicial (YYYY-MM-DD), inclusive"),
    end_date: date = Query(..., description="Fecha final (YYYY-MM-DD), inclusive"),
    db: AsyncSession = Depends(get_db_session),
    repo: DashboardRepository = Depends(get_dashboard_repo),
    current_user: User = Depends(get_current_active_user)
):
    """Comisión propia ganada en el rango. Cualquier usuario con un perfil de barbero vinculado."""
    _validate_date_range(start_date, end_date)
    tenant_id = current_user.tenant_id

    stmt = select(Barber).where(Barber.user_id == current_user.id, Barber.tenant_id == tenant_id)
    result = await db.execute(stmt)
    barber = result.scalar_one_or_none()

    if not barber:
        raise HTTPException(status_code=404, detail="No tenés un perfil de barbero vinculado a tu cuenta.")

    tenant_tz = await get_tenant_timezone(db, tenant_id)
    tenant = await db.get(Tenant, tenant_id)

    revenue, commission, completed_count = await repo.get_revenue_totals(
        tenant_id, start_date, end_date, tenant_tz, barber_id=barber.id
    )

    return MyStatsResponse(
        start_date=start_date, end_date=end_date, currency=tenant.currency,
        total_commission_earned=commission, completed_count=completed_count,
    )
    