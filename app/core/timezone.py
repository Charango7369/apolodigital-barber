# app/core/timezone.py
"""
Punto único de resolución de timezone por Tenant.
Cualquier lógica de "inicio/fin de día", turnos, cierres de caja o reportes
DEBE pasar por get_tenant_timezone() — no hardcodear ZoneInfo en otro módulo.
"""
import uuid
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tenants.models import Tenant


async def get_tenant_timezone(db: AsyncSession, tenant_id: uuid.UUID) -> ZoneInfo:
    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado.")

    try:
        return ZoneInfo(tenant.timezone)
    except ZoneInfoNotFoundError:
        # No debería ocurrir si el validator del schema funciona,
        # pero si pasa, mejor un 500 explícito que un crash críptico más abajo.
        raise HTTPException(
            status_code=500,
            detail=f"Timezone inválido configurado en el tenant: '{tenant.timezone}'"
        )