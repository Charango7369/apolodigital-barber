#app\modules\users\schemas.py
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.users.models import UserRole


class UserBase(BaseModel):
    email: str
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    role: UserRole


class UserCreate(UserBase):
    """ADMIN o MANAGER da de alta un usuario nuevo del staff."""
    password: str = Field(..., min_length=8)


class UserSelfUpdate(BaseModel):
    """
    Auto-actualización de datos personales. A propósito NO incluye
    role, is_active ni password -- evita auto-escalamiento de privilegios.
    """
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)


class UserUpdate(BaseModel):
    """ADMIN o MANAGER actualiza a OTRO usuario del staff."""
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class ChangeOwnPasswordRequest(BaseModel):
    """Cambio de contraseña propia -- requiere la actual."""
    current_password: str
    new_password: str = Field(..., min_length=8)


class ResetPasswordRequest(BaseModel):
    """ADMIN resetea la contraseña de otro usuario -- no requiere la actual."""
    new_password: str = Field(..., min_length=8)


class UserResponse(UserBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    created_by: Optional[uuid.UUID] = None
    updated_by: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)