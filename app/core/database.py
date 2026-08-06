from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings
from app.db.base import Base, TenantBaseModel

# echo=False en producción. En desarrollo podés poner True para ver el SQL generado.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,   # prueba cada conexión antes de usarla; si está muerta (reload, Docker reiniciado), la descarta y abre una nueva en vez de tirar InterfaceError
    pool_recycle=1800,    # recicla conexiones cada 30 min -- evita que Postgres o Docker las corten por estar idle demasiado tiempo
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Generador de sesiones de base de datos asíncronas.
    FastAPI se encarga de inyectar y cerrar la sesión automáticamente.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()