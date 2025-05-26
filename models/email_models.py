from pydantic import BaseModel, Field
from bson import ObjectId
from .custom_types import PyObjectId

class Email(BaseModel):
    team: str
    email: str

class EmailResponseWithId(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    team: str
    email: str
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}