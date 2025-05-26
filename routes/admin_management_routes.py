from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId, errors

from database import users_collection
from services.auth import get_current_user, get_password_hash
from models.user_models import User # For request body and response (excluding password)

router = APIRouter(prefix="/api/admins", tags=["Admin User Management"])

class AdminResponse(User): # Exclude password for responses
    id: str
    class Config:
        fields = {'password': {'exclude': True}}

@router.get("", response_model=List[AdminResponse])
async def get_admins_route(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["superadmin", "alladmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    admins_cursor = users_collection.find({"role": {"$in": ["admin", "superadmin", "alladmin"]}})
    admin_list = []
    for admin in admins_cursor:
        admin_list.append(AdminResponse(id=str(admin["_id"]), **admin))
    return admin_list

@router.post("", response_model=AdminResponse)
async def create_admin_route(admin: User, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["superadmin", "alladmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing_admin = users_collection.find_one({"username": admin.username})
    if existing_admin:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    admin_data = admin.dict()
    admin_data["password"] = get_password_hash(admin.password)
    result = users_collection.insert_one(admin_data)
    created_admin = users_collection.find_one({"_id": result.inserted_id})
    return AdminResponse(id=str(created_admin["_id"]), **created_admin)

@router.put("/{admin_id}", response_model=AdminResponse)
async def update_admin_route(admin_id: str, admin_update: User, current_user: dict = Depends(get_current_user)):
    # Implementation similar to create, but with update_one and ObjectId(admin_id)
    # Ensure password hashing if password is part of admin_update
    raise HTTPException(status_code=501, detail="Not Implemented") # Placeholder

@router.delete("/{admin_id}")
async def delete_admin_route(admin_id: str, current_user: dict = Depends(get_current_user)):
    # Implementation similar to delete_email_route
    raise HTTPException(status_code=501, detail="Not Implemented") # Placeholder