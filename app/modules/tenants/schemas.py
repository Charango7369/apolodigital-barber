#app\modules\tenants\schemas.py
import re
import uuid
from datetime import datetime
from typing import Optional, Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.currencies import VALID_CURRENCY_CODES

SLUG_PATTERN = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')


def _validate_iana_timezone(v: str) -> str:
    try:
        ZoneInfo(v)
    except ZoneInfoNotFoundError:
        raise ValueError(
            f"'{v}' no es un timezone IANA válido. "
            f"Ejemplos: 'America/La_Paz', 'America/Mexico_City', 'America/Bogota'."
        )
    return v


def _validate_iso_currency(v: str) -> str:
    code = v.strip().upper()
    if code not in VALID_CURRENCY_CODES:
        raise ValueError(
            f"'{v}' no es un código de moneda ISO 4217 válido. "
            f"Ejemplos: 'BOB', 'USD', 'PEN', 'ARS', 'MXN'."
        )
    return code


class TenantBase(BaseModel):
    name: str = Field(..., max_length=100)
    business_name: Optional[str] = Field(None, max_length=150)
    email: str
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    currency: str = Field("USD", max_length=10)
    timezone: str = Field("UTC", max_length=50)
    logo_url: Optional[str] = None
    settings: Optional[dict[str, Any]] = None

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        return _validate_iana_timezone(v)

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return _validate_iso_currency(v)


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    business_name: Optional[str] = Field(None, max_length=150)
    email: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    currency: Optional[str] = Field(None, max_length=10)
    timezone: Optional[str] = Field(None, max_length=50)
    logo_url: Optional[str] = None
    settings: Optional[dict[str, Any]] = None
    is_active: Optional[bool] = None

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: Optional[str]) -> Optional[str]:
        return _validate_iana_timezone(v) if v is not None else v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        return _validate_iso_currency(v) if v is not None else v


class TenantResponse(TenantBase):
    id: uuid.UUID
    slug: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UpdateSlugRequest(BaseModel):
    slug: str = Field(..., min_length=3, max_length=100)

    @field_validator("slug")
    @classmethod
    def validate_slug_format(cls, v: str) -> str:
        if not SLUG_PATTERN.match(v):
            raise ValueError(
                "El slug solo puede tener minúsculas, números y guiones (ej: 'apolo-barber')."
            )
        return v


class TenantRegistrationRequest(BaseModel):
    tenant_name: str = Field(..., max_length=100)
    tenant_email: str
    timezone: str = Field(..., description="Timezone IANA del tenant, ej. 'America/La_Paz'")
    currency: str = Field(..., description="Código de moneda ISO 4217, ej. 'BOB'")

    admin_first_name: str = Field(..., max_length=100)
    admin_last_name: str = Field(..., max_length=100)
    admin_email: str
    admin_password: str = Field(..., min_length=8)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        return _validate_iana_timezone(v)

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return _validate_iso_currency(v)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "tenant_name": "Apolo Barber Shop",
                "tenant_email": "contacto@apolobarber.com",
                "timezone": "America/La_Paz",
                "currency": "BOB",
                "admin_first_name": "Edwin",
                "admin_last_name": "Admin",
                "admin_email": "edwin@apolobarber.com",
                "admin_password": "super_secure_password_123"
            }
        }
    )