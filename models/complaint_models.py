from pydantic import BaseModel
from typing import List, Dict, Any

class Complaint(BaseModel):
    title: str
    details: str
    name: str
    date: str # Consider using datetime or date type
    contact: str
    team: str

class ComplaintUpdate(BaseModel):
    status: str

# Define a Pydantic model for the expected JSON payload
class ForwardComplaintPayload(BaseModel):
    severity_level: str
    recipients: List[Dict[str, Any]]
    correction1: str
    inspector_name1: str
    inspection_date1: str
    correction2: str
    inspector_name2: str
    inspection_date2: str
    correction3: str
    inspector_name3: str
    inspection_date3: str
    correction4: str
    inspector_name4: str
    inspection_date4: str
    correction5: str
    inspector_name5: str
    inspection_date5: str
    # approver_recommendation: str # This was commented out