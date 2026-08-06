# app/core/roles.py
"""
Grupos de roles reutilizables para Depends(require_role(...)).
Un solo lugar para ajustar quién puede hacer qué en el negocio.
"""
from app.modules.users.models import UserRole

ADMIN_ONLY: list[UserRole] = [UserRole.ADMIN]

MANAGEMENT: list[UserRole] = [UserRole.ADMIN, UserRole.MANAGER]

FRONT_DESK: list[UserRole] = [UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST]

ALL_STAFF: list[UserRole] = [
    UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.BARBER
]