from pydantic import BaseModel, Field
from bson import ObjectId
from .custom_types import PyObjectId
from typing import Optional

class Email(BaseModel):
    team: str
    email: str
    approver_email: Optional[str] = None # Make it explicitly Optional

class EmailResponseWithId(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    team: str
    email: str
    approver_email: Optional[str] = None # Make it explicitly Optional
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class EmailAdminResponse(BaseModel):
    id: str = Field(..., alias="_id") # Use 'id' as Python attribute, alias to '_id' for JSON
    team: str
    email: str
    approver_email: Optional[str] = None

    class Config:
        populate_by_name = True # Allows using alias '_id' for population from data
        # For Pydantic v1, this was allow_population_by_field_name = True