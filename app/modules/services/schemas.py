#app\modules\services\schemas.py
import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    is_active: bool = True

class ServiceCreate(ServiceBase):
    pass

# 🔥 NUEVO ESQUEMA: Para permitir actualizaciones parciales (PUT)
class ServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    duration_minutes: Optional[int] = Field(None, gt=0)
    is_active: Optional[bool] = None

class ServiceResponse(ServiceBase):
    id: uuid.UUID
    tenant_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)