from fastapi import APIRouter, Request, HTTPException, Cookie
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from typing import Optional
from jose import JWTError, jwt

from database import users_collection, complaints_collection
from services.auth import SECRET_KEY, ALGORITHM # For manual token decoding
from bson import ObjectId
from bson.errors import InvalidId

router = APIRouter()
templates = Jinja2Templates(directory="templates")

# Render first Page
@router.get("/", response_class=HTMLResponse)
async def show_first_page(request: Request):
    return templates.TemplateResponse("complaint.html", {"request": request})

# Render login Page
@router.get("/login", response_class=HTMLResponse)
async def show_login_page(request: Request, access_token: Optional[str] = Cookie(None)):
    if access_token:
        try:
            payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            # role: str = payload.get("role") # Not strictly needed for this redirect logic

            user = users_collection.find_one({"username": username})
            if user is not None:
                # Redirect based on role if necessary, or just to a default authed page
                return RedirectResponse(url="/admin_complaints", status_code=303)
            else:
                return templates.TemplateResponse("login.html", {"request": request, "error": "User not found"})
        except JWTError:
            return templates.TemplateResponse("login.html", {"request": request, "error": "Invalid token"})
    return templates.TemplateResponse("login.html", {"request": request})

# Render Register Page
@router.get("/register", response_class=HTMLResponse)
async def show_register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

# Render Complaint Page
@router.get("/complaint", response_class=HTMLResponse)
async def show_complaint_page(request: Request):
    return templates.TemplateResponse("complaint.html", {"request": request})

# Render Admin Complaints Page
@router.get("/admin_complaints", response_class=HTMLResponse)
async def show_admin_complaints_page(request: Request):
    return templates.TemplateResponse("admin_complaints.html", {"request": request})

@router.get("/reports", response_class=HTMLResponse)
async def show_reports_page(request: Request):
    return templates.TemplateResponse("reports.html", {"request": request})

@router.get("/forwardeds", response_class=HTMLResponse)
async def show_forwardeds_page(request: Request):
    return templates.TemplateResponse("forwardeds.html", {"request": request})

@router.get("/admin_download", response_class=HTMLResponse)
async def show_admin_download_page(request: Request):
    return templates.TemplateResponse("admin_download.html", {"request": request})

@router.get("/cancelled_complaints", response_class=HTMLResponse)
async def show_cancelled_complaints_page(request: Request):
    return templates.TemplateResponse("cancelled_complaints.html", {"request": request})

@router.get("/admin_control", response_class=HTMLResponse)
async def show_admin_control_page(request: Request):
    return templates.TemplateResponse("admin_control.html", {"request": request})

async def _get_complaint_for_template(id: str, template_name: str, request: Request):
    try:
        complaint = complaints_collection.find_one({"_id": ObjectId(id)})
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
        # username = users_collection.find_one({"username": ObjectId(id)}) # This seems incorrect, username is not an ObjectId
        # For now, passing admin_name as None or a placeholder
        return templates.TemplateResponse(template_name, {"request": request, "complaint": complaint, "admin_name": "Admin"})
    except InvalidId:
        raise HTTPException(status_code=400, detail=f"Invalid complaint ID: {id}")

@router.get("/admin/admit-complaint/{id}", response_class=HTMLResponse)
async def show_admit_complaint_page(id: str, request: Request):
    return await _get_complaint_for_template(id, "admin_admit_complaint.html", request)

@router.get("/admin/forward-complaint/{id}", response_class=HTMLResponse)
async def show_forward_complaint_page(id: str, request: Request):
    return await _get_complaint_for_template(id, "admin_forward_complaint.html", request)

@router.get("/admin/complete-complaint/{id}", response_class=HTMLResponse)
async def show_complete_complaint_page(id: str, request: Request):
    return await _get_complaint_for_template(id, "admin_complete_complaint.html", request)

@router.get("/admin/view-complete-complaint/{id}", response_class=HTMLResponse)
async def show_view_complete_complaint_page(id: str, request: Request):
    return await _get_complaint_for_template(id, "admin_view_complete_complaint.html", request)