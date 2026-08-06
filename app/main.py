from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.modules.auth.router import router as auth_router
from app.modules.tenants.router import router as tenants_router
from app.modules.users.router import router as users_router
from app.modules.barbers.router import router as barbers_router
from app.modules.clients.router import router as clients_router
from app.modules.services.router import router as services_router
from app.modules.appointments.router import router as appointments_router
from app.modules.dashboard.router import router as dashboard_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API Backend para SaaS de Barberías y Servicios Personales",
    version="1.0.0"
)

# Configuración básica de CORS (Ajustar en producción -- ver nota sobre allow_origins + credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # sin cookies de sesión -- todo pasa por Authorization: Bearer 
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de Rutas
app.include_router(auth_router)
app.include_router(tenants_router)
app.include_router(users_router)
app.include_router(barbers_router)
app.include_router(clients_router)
app.include_router(services_router)
app.include_router(appointments_router)
app.include_router(dashboard_router)

@app.get("/health", tags=["Health"])
async def health_check():
    """Endpoint básico para verificar que la API está viva."""
    return {"status": "ok", "message": "Maestro SaaS is running"}