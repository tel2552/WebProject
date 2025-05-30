from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId, errors

from database import email_recipients_collection
from services.auth import get_current_user
from models.email_models import Email, EmailAdminResponse # Import the new response model

router = APIRouter(prefix="/api/emails", tags=["Email Management"])

@router.get("", response_model=List[EmailAdminResponse]) # Use the new, accurate response model
async def get_emails_route(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["superadmin", "alladmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    emails_cursor = email_recipients_collection.find({}) # Find all documents
    emails_list = []
    for email_doc in emails_cursor:
        # Directly create an instance of the Pydantic model.
        # This helps ensure that the structure is correct and FastAPI can validate it.
        # Pydantic will handle the conversion of ObjectId to str if configured in the model's Config.
        # However, since EmailAdminResponse expects _id as str, explicit conversion is safer here.
        try:
            # Construct the dictionary directly to ensure all fields are present as expected by EmailAdminResponse
            item_dict = {
                "_id": str(email_doc["_id"]), # Crucial: ensure this key is "_id" and value is string
                "team": email_doc.get("team", "Unknown Team"),
                "email": email_doc.get("email", "no-email@example.com"),
                "approver_email": email_doc.get("approver_email")
            }
            # Optional: Validate this dictionary against the Pydantic model if you want an extra check here
            # try:
            #     EmailAdminResponse(**item_dict) # This will raise ValidationError if item_dict is invalid
            # except ValidationError as ve:
            #     print(f"Warning: Constructed dict failed Pydantic validation for doc {email_doc.get('_id')}: {ve}")
            #     continue # Skip this item if it's invalid

            print(f"  Pydantic item as dict: {item_dict}") # DEBUG: Check this dictionary
            emails_list.append(item_dict)
        except KeyError as e:
            print(f"Warning: Document missing expected key {e}: {email_doc}")
        except Exception as e:
            print(f"Warning: Error processing document {email_doc.get('_id')}: {e}")
    
    print(f"DEBUG: Backend returning emails_list: {emails_list}") # Add this debug print
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

@router.put("/{email_id}", response_model=EmailAdminResponse) # Return the updated/current document
async def update_email_route(
    email_id: str, 
    email_update_payload: Email, # Payload from frontend
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["superadmin", "alladmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    try:
        obj_id_to_update = ObjectId(email_id)
    except errors.InvalidId: # Use the specific bson.errors.InvalidId
        raise HTTPException(status_code=400, detail="Invalid email ID format")

    # Create a dictionary of fields to update from the payload.
    # Pydantic v2: email_update_payload.model_dump(exclude_unset=True)
    # Pydantic v1: email_update_payload.dict(exclude_unset=True)
    # We'll use model_dump assuming Pydantic v2 based on previous warnings.
    # The frontend sends 'team', 'email', 'approver_email'.
    # The 'team' field is usually not updatable as it's often part of the identifier or managed differently.
    # For this update, we will allow updating 'email' and 'approver_email'.
    # If 'team' should also be updatable, include it in update_data.
    update_data = {}
    if email_update_payload.email is not None: # Check if email was provided
        update_data["email"] = email_update_payload.email
    if email_update_payload.approver_email is not None: # Check if approver_email was provided
        update_data["approver_email"] = email_update_payload.approver_email
    # If you want to allow team updates (be cautious, as team might be an identifier):
    # if email_update_payload.team is not None:
    #     update_data["team"] = email_update_payload.team

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields provided for update.")

    result = email_recipients_collection.update_one(
        {"_id": obj_id_to_update},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Email with ID {email_id} not found.")
    
    # Even if modified_count is 0 (no actual change in values), the PUT operation is successful
    # as the resource state matches the requested state. Fetch and return the document.
    updated_doc = email_recipients_collection.find_one({"_id": obj_id_to_update})

    if not updated_doc:
        # This would be an unexpected state if matched_count was 1.
        raise HTTPException(status_code=500, detail="Error retrieving email after update attempt")

    # Return using the EmailAdminResponse model to ensure consistent output with the GET all route
    return EmailAdminResponse(
        id=str(updated_doc["_id"]), # Pydantic model uses 'id' which is aliased to '_id'
        team=updated_doc.get("team"),
        email=updated_doc.get("email"),
        approver_email=updated_doc.get("approver_email")
    )

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