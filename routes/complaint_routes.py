from fastapi import APIRouter, Depends, HTTPException, Form, Body, Response, Query
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId, errors as bson_errors
from collections import OrderedDict
import io

from database import complaints_collection, email_recipients_collection, users_collection
from services.auth import get_current_user
from services.email_service import send_email
from services.pdf_service import generate_complaint_pdf_from_data
from models.complaint_models import ForwardComplaintPayload # Complaint model is not directly used as Form fields are used

router = APIRouter(prefix="/admin", tags=["Complaints Management"])
# Create a new router for public complaint submissions
public_complaint_router = APIRouter(tags=["Public Complaint Submission"])

@public_complaint_router.post("/submit-complaint") # Path is now /submit-complaint
async def submit_complaint_route(
    title: str = Form(...),
    details: str = Form(...),
    name: str = Form(...),
    date: str = Form(...),
    contact: str = Form(...),
    team: str = Form(...),
):
    complaint_data = {
        "title": title, "details": details, "name": name,
        "date": date, "contact": contact, "team": team,
        "status": "Pending", "created_at": datetime.utcnow()
    }
    result = complaints_collection.insert_one(complaint_data)
    complaint_id = str(result.inserted_id)

    email_recipient_doc = email_recipients_collection.find_one({"team": team})
    recipient_email = email_recipient_doc["email"] if email_recipient_doc else "default@example.com"

    try:
        send_email(f"New Complaint: {title}", complaint_id, recipient_email)
    except Exception as e:
        print(f"Failed to send submission email for {complaint_id}: {e}") # Log error

    return {"message": "Complaint submitted successfully", "complaint_id": complaint_id}
# Handle Complaint Submission (this was at /submit-complaint, moving under /admin for consistency or keep global)
@router.post("/submit-complaint-global", tags=["Public"]) # Or keep @app.post("/submit-complaint") in main.py if truly global
async def submit_complaint_route(
    title: str = Form(...),
    details: str = Form(...),
    name: str = Form(...),
    date: str = Form(...), # Consider converting to datetime
    contact: str = Form(...),
    team: str = Form(...),
    # otherTeam: str = Form(None) # Logic for otherTeam was commented out
):
    complaint_data = {
        "title": title, "details": details, "name": name,
        "date": date, "contact": contact, "team": team,
        "status": "Pending", "created_at": datetime.utcnow()
    }
    result = complaints_collection.insert_one(complaint_data)
    complaint_id = str(result.inserted_id)

    email_recipient_doc = email_recipients_collection.find_one({"team": team})
    recipient_email = email_recipient_doc["email"] if email_recipient_doc else "default@example.com"
    
    try:
        send_email(f"New Complaint: {title}", complaint_id, recipient_email)
    except Exception as e:
        print(f"Failed to send submission email for {complaint_id}: {e}") # Log error

    return {"message": "Complaint submitted successfully", "complaint_id": complaint_id}

@router.get("/complaints") # Corresponds to original /admin/complaints for team-specific view
async def get_team_complaints_route(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin": # This role check might need adjustment based on overall role strategy
        raise HTTPException(status_code=403, detail="Not authorized for this team view")
    
    query = {"team": current_user["team"]}
    complaints_cursor = complaints_collection.find(query)
    complaints_list = []
    for complaint in complaints_cursor:
        complaint["id"] = str(complaint["_id"])
        complaint.pop("_id")
        complaint["additional_info"] = complaint.get("additional_info", "-")
        complaints_list.append(complaint)
    return {"complaints": complaints_list}

@router.get("/get-complaints") # Corresponds to the more detailed /admin/get-complaints
async def get_all_complaints_route(): # Add pagination, filtering, sorting as needed
    complaints_cursor = complaints_collection.find() # Add filters if necessary
    response_list = []
    for complaint in complaints_cursor:
        response_list.append({
            "_id": str(complaint["_id"]),  # เพิ่ม key นี้เพื่อให้ JavaScript (complaint._id) ใช้งานได้
            "id": str(complaint["_id"]),   # คง key 'id' ไว้เผื่อมีส่วนอื่นใช้งาน
            "title": complaint.get("title"),
            "details": complaint.get("details"),
            "name": complaint.get("name"),
            "date": complaint.get("date"),
            "contact": complaint.get("contact"),
            "team": complaint.get("team"),
            "status": complaint.get("status"),
            "cancellation_reason": complaint.get("cancellation_reason"),
            "approver_recommendation": complaint.get("approver_recommendation"),
            # Add other relevant fields from the second get_complaints definition
        })
    return response_list

@router.get("/get-complaint/{complaint_id}")
async def get_complaint_by_id_route(complaint_id: str):
    try:
        obj_id = ObjectId(complaint_id)
    except bson_errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid complaint ID format")
    
    complaint = complaints_collection.find_one({"_id": obj_id})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    complaint["_id"] = str(complaint["_id"]) # Convert ObjectId for JSON response
    return complaint

@router.get("/get-completed-complaints")
async def get_completed_complaints_route():
    complaints = complaints_collection.find()
    complaints_list = []
    for complaint in complaints:
        complaint_data = {
            "_id": str(complaint["_id"]),
            "title": complaint.get("title"),
            "details": complaint.get("details"),
            "name": complaint.get("name"),
            "date": complaint.get("date"),
            "contact": complaint.get("contact"),
            "team": complaint.get("team"),
            "status": complaint.get("status"),
            "resolved_date": complaint.get("resolved_date").isoformat() if complaint.get("resolved_date") else None,
            "inspector_name2": complaint.get("inspector_name2"), # Example of specific fields
            "severity_level": complaint.get("severity_level"),
            "correction2": complaint.get("correction2"),
            "complete_date": complaint.get("complete_date").isoformat() if complaint.get("complete_date") else None,
        }
        complaints_list.append(complaint_data)
    return complaints_list

@router.post("/export-pdf/{complaint_id}")
async def export_complaint_to_pdf_route(complaint_id: str, current_user: dict = Depends(get_current_user)):
    try:
        obj_complaint_id = ObjectId(complaint_id)
    except bson_errors.InvalidId:
        raise HTTPException(status_code=400, detail=f"Invalid complaint ID format: {complaint_id}")

    complaint_data = complaints_collection.find_one({"_id": obj_complaint_id})
    if not complaint_data:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint_data["_id"] = str(complaint_data["_id"]) # For template if it uses _id as string
    complaint_data["processed_by_admin"] = current_user.get("username", "N/A")
    complaint_data["export_date"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    try:
        pdf_bytes = generate_complaint_pdf_from_data(complaint_data)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"Could not generate PDF: {e}")
    except Exception as e:
        print(f"Unexpected error during PDF generation: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while generating the PDF: {str(e)}")

    return StreamingResponse(io.BytesIO(pdf_bytes),
                            media_type="application/pdf",
                            headers={"Content-Disposition": f"attachment; filename=complaint_report_{complaint_id}.pdf"})

@router.post("/admit-complaint/{complaint_id}") # This was resolve_complaint
async def admit_complaint_action_route(complaint_id: str, department: str = Form(...), additional_info: str = Form(None)):
    try:
        obj_id = ObjectId(complaint_id)
    except bson_errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid complaint ID format")

    update_data = {
        "team": department, # Assuming 'department' means re-assigning to a new team
        "status": "Admit",
        "additional_info": additional_info if additional_info else '-',
        "resolved_date": datetime.utcnow(), # Or "admitted_date"
    }
    result = complaints_collection.update_one({"_id": obj_id}, {"$set": update_data})
    if result.modified_count == 1:
        return {"message": "Complaint Admitted successfully"}
    raise HTTPException(status_code=404, detail="Complaint not found or failed to admit")


def _common_payload_update(complaint_id: str, payload: ForwardComplaintPayload, new_status: str, date_field_name: str):
    try:
        obj_id = ObjectId(complaint_id)
    except bson_errors.InvalidId:
        raise HTTPException(status_code=400, detail=f"Invalid complaint ID format: {complaint_id}")

    update_data = OrderedDict(payload.dict()) # Use OrderedDict if field order matters for DB
    update_data["status"] = new_status
    update_data[date_field_name] = datetime.utcnow()
    
    # Remove fields from payload that are not part of the direct update or handled by ForwardComplaintPayload
    # For example, if 'recipients' is complex and needs specific handling

    result = complaints_collection.update_one({"_id": obj_id}, {"$set": dict(update_data)}) # Convert OrderedDict to dict for $set

    if result.modified_count == 1:
        return True, complaints_collection.find_one({"_id": obj_id})
    elif result.matched_count == 1 and result.modified_count == 0:
        raise HTTPException(status_code=304, detail="Complaint found but no changes were made.")
    else:
        raise HTTPException(status_code=404, detail="Complaint not found.")

@router.post("/save-complaint/{complaint_id}") # This was the second admit_complaint
async def save_complaint_details_route(complaint_id: str, payload: ForwardComplaintPayload = Body(...)):
    success, _ = await _common_payload_update(complaint_id, payload, "Admit", "admit_date")
    if success:
        return {"message": "Complaint details saved and status set to Admit successfully"}

@router.post("/forward-complaint/{complaint_id}")
async def forward_complaint_action_route(complaint_id: str, payload: ForwardComplaintPayload = Body(...)):
    success, updated_complaint = await _common_payload_update(complaint_id, payload, "Forwarded", "forwarded_date") # or "admit_date"
    if success and updated_complaint:
        try:
            complaint_title = updated_complaint.get("title", "N/A")
            # Determine recipient email for forwarding, e.g., from payload or a fixed address
            recipient_email = "janramsae@pim.ac.th" # Example
            send_email(
                title=f"Forwarded: {complaint_title}",
                complaint_id=complaint_id,
                recipient_email=recipient_email
            )
            print(f"Forwarded email sent for complaint {complaint_id}")
        except Exception as email_error:
            print(f"Error sending forwarded email for complaint {complaint_id}: {email_error}")
        return {"message": "Complaint Forwarded successfully"}

@router.post("/complete-complaint/{complaint_id}")
async def complete_complaint_action_route(complaint_id: str, approver_recommendation: str = Form(...)):
    try:
        obj_id = ObjectId(complaint_id)
    except bson_errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid complaint ID format")

    result = complaints_collection.update_one(
        {"_id": obj_id},
        {"$set": {"status": "Complete", "complete_date": datetime.utcnow(), "approver_recommendation": approver_recommendation}}
    )
    if result.modified_count == 1:
        return {"message": "Complaint completed successfully"}
    raise HTTPException(status_code=404, detail="Complaint not found or failed to complete")

@router.post("/undo-complaint/{complaint_id}") # To revert from Complete/Forwarded to Admit
async def undo_complaint_status_route(complaint_id: str, approver_recommendation: str = Form(...)): # approver_recommendation might be for logging the undo reason
    try:
        obj_id = ObjectId(complaint_id)
    except bson_errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid complaint ID format")

    result = complaints_collection.update_one(
        {"_id": obj_id},
        {"$set": {"status": "Admit", "approver_recommendation": f"Undo: {approver_recommendation}", "complete_date": None, "forwarded_date": None}} # Clear relevant dates
    )
    if result.modified_count == 1:
        return {"message": "Complaint status reverted to Admit successfully"}
    raise HTTPException(status_code=404, detail="Complaint not found or failed to undo")