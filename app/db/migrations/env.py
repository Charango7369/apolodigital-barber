import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

# ==========================================
# 1. CONFIGURACIÓN Y BASE UNIFICADA
# ==========================================
from app.core.config import settings
from app.db.base import Base


# ==========================================
# 2. IMPORTACIÓN DE MODELOS (Orden estricto)
# ==========================================
# Tablas raíz (No dependen de otras)
from app.modules.tenants.models import Tenant
from app.modules.users.models import User
from app.modules.clients.models import Client

# Tablas intermedias y finales (Tienen Foreign Keys a las tablas superiores)
from app.modules.barbers.models import Barber
from app.modules.services.models import Service
from app.modules.appointments.models import Appointment

# ==========================================
# 3. CONFIGURACIÓN DE ALEMBIC
# ==========================================
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


target_metadata = Base.metadata
print("TABLAS QUE ALEMBIC PUEDE VER:", target_metadata.tables.keys()) # <-- AGREGA ESTO

def get_url() -> str:
    """Usar SIEMPRE la URL del .env"""
    return settings.DATABASE_URL


def run_migrations_offline() -> None:
    """Modo offline."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Ejecutar migraciones en modo síncrono dentro del engine async."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Modo online usando AsyncEngine."""
    connectable = create_async_engine(
        get_url(),
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())