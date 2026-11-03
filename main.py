import os
import sys
import uvicorn

# Agregar backend al path
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app

__all__ = ["app"]

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8008))
    print("=" * 65)
    print("      APOLODIGITAL BARBER - SISTEMA INTEGRAL PARA BARBERÍAS")
    print("             Inspirado en Booksy Biz + apolodigital.lat")
    print("=" * 65)
    print(f"Servidor activo en: http://localhost:{port}")
    print(f"Documentación Swagger API: http://localhost:{port}/docs")
    print("=" * 65)
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
