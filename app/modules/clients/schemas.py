#app\modules\clients\schemas.py
import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class ClientBase(BaseModel):
    first_name: str = Field(..., max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = None
    birthday: Optional[date] = None
    hair_type: Optional[str] = Field(None, max_length=100)
    allergies: Optional[str] = None
    preferences: Optional[str] = None
    observations: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = None
    birthday: Optional[date] = None
    hair_type: Optional[str] = Field(None, max_length=100)
    allergies: Optional[str] = None
    preferences: Optional[str] = None
    observations: Optional[str] = None
    is_active: Optional[bool] = None

class ClientResponse(ClientBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)