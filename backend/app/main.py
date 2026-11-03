import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database import init_db
from .routes import auth, cash, services, barbers, clients, appointments, checkout, stats, organizations, users

app = FastAPI(
    title="ApoloDigital Barber API",
    description="Backend oficial multi-tenant de gestión para barberías al estilo Booksy Biz con blindaje OWASP y apolodigital.lat",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup
@app.on_event("startup")
def on_startup():
    init_db()

# Include API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(cash.router, prefix="/api")
app.include_router(services.router, prefix="/api")
app.include_router(barbers.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(appointments.router, prefix="/api")
app.include_router(checkout.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(organizations.router, prefix="/api")
app.include_router(users.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "app": "ApoloDigital Barber (OWASP Multi-Tenant Edition)",
        "security": "JWT + RBAC + SoD + Cash Shifts + Anti-Overlap",
        "website": "https://apolodigital.lat",
        "region": "Bolivia"
    }

# Serve frontend build if exists
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist")

if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="Endpoint API no encontrado")
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Not Found")
