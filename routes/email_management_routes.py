from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId, errors

from database import email_recipients_collection
from services.auth import get_current_user
from models.email_models import Email # Using Email for request body, EmailResponseWithId for response

router = APIRouter(prefix="/api/emails", tags=["Email Management"])

@router.get("", response_model=List[Email]) # Simplified response model for now
async def get_emails_route(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["superadmin", "alladmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    emails_cursor = email_recipients_collection.find()
    emails_list = []
    for email_doc in emails_cursor:
        emails_list.append({
            "email_id": str(email_doc["_id"]), # Use "email_id" for consistency if frontend expects it
            "team": email_doc["team"],
            "email": email_doc["email"]
        })
    return emails_list

@router.get("/{email_id}")
async def get_email_by_id_route(email_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["superadmin", "alladmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    try:
        object_id = ObjectId(email_id)
    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid email ID format")

    email = email_recipients_collection.find_one({"_id": object_id})
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return {"email_id": str(email["_id"]), "team": email["team"], "email": email["email"]}

@router.put("/{email_id}")
async def update_email_route(email_id: str, email_update: Email, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["superadmin", "alladmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    try:
        object_id = ObjectId(email_id)
    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid email ID format")

    # Only update the email field, team is part of the identifier or managed separately
    result = email_recipients_collection.update_one({"_id": object_id}, {"$set": {"email": email_update.email}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Email not found or no changes made")
    return {"message": "Email updated"}

@router.delete("/{email_id}")
async def delete_email_route(email_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["superadmin", "alladmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    try:
        object_id = ObjectId(email_id)
    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid email ID format")
    result = email_recipients_collection.delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Email not found")
    return {"message": "Email deleted"}