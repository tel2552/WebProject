from fastapi import FastAPI, HTTPException, Depends, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse , JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
from datetime import timedelta
from database import users_collection, complaints_collection
from auth import get_password_hash, verify_password, create_access_token
from email_service import send_email
from auth import get_current_user
from bson import ObjectId
from bson.errors import InvalidId
import datetime

app = FastAPI()

# Static Files & Templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Models
# Mapping ระหว่างประเภทข้อร้องเรียนกับอีเมลปลายทาง
EMAIL_RECIPIENTS = {
    "ด้านบุคลากร": "telergamer@gmail.com",
    "การบริการงานวิจัย": "research@example.com",
    "การบริการวิชาการ": "academic@example.com",
    "การบริหารจัดการของ PIM": "management@example.com",
    "การบริการแก่นักศึกษา": "studentservices@example.com",
    "อื่นๆ": "other@example.com"
}

class UserCreate(BaseModel):
    username: str
    password: str
    role: str  # "user", "admin", "high_admin"

class UserLogin(BaseModel):
    username: str
    password: str

class Complaint(BaseModel):
    title: str
    details: str
    name: str
    date: str
    contact: str
    team: str

class ComplaintUpdate(BaseModel):
    status: str

# Routes

# Render Login Page
@app.get("/", response_class=HTMLResponse)
async def show_login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

# Handle Login
@app.post("/login")
async def login_user(username: str = Form(...), password: str = Form(...)):
    db_user = users_collection.find_one({"username": username})
    if not db_user or not verify_password(password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    token = create_access_token(data={"sub": db_user["username"], "role": db_user["role"]}, expires_delta=timedelta(minutes=60))
    
    if db_user["role"] in ["admin", "superadmin"]:
        return RedirectResponse(url="/admin_complaints", status_code=303)
    else:
        return RedirectResponse(url="/complaint", status_code=303)

# Render Register Page
@app.get("/register", response_class=HTMLResponse)
async def show_register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

# Handle Register
@app.post("/register")
def register_user(username: str = Form(...), password: str = Form(...), role: str = Form(...)):
    existing_user = users_collection.find_one({"username": username})
    if existing_user:
        return JSONResponse(status_code=400, content={"detail": "Username already exists"})
        # raise HTTPException(status_code=400, detail="Username already exists")
    hashed_password = get_password_hash(password)
    users_collection.insert_one({
        "username": username,
        "password": hashed_password,
        "role": role
    })
    return RedirectResponse(url="/", status_code=303)

# Render Complaint Page
@app.get("/complaint", response_class=HTMLResponse)
async def show_complaint_page(request: Request):
    return templates.TemplateResponse("complaint.html", {"request": request})

# Handle Complaint Submission
@app.post("/submit-complaint")
def submit_complaint(
    title: str = Form(...),
    details: str = Form(...),
    name: str = Form(...),
    date: str = Form(...),
    contact: str = Form(...),
    team: str = Form(...),
    otherTeam: str = Form(None)  # สำหรับกรณีที่เลือก "อื่นๆ"
):
    # กำหนดประเภทข้อร้องเรียนที่ใช้งาน
    complaint_team = otherTeam if team == "อื่นๆ" else team
    
    # เพิ่มข้อมูลลง MongoDB
    complaint = {
        "title": title,
        "details": details,
        "name": name,
        "date": date,
        "contact": contact,
        "team": complaint_team,
        "status": "Pending"
    }
    result = complaints_collection.insert_one(complaint)
    complaint_id = str(result.inserted_id)
    # กำหนดอีเมลปลายทาง
    recipient_email = EMAIL_RECIPIENTS.get(complaint_team, "default@example.com")
    
    # ส่งอีเมล
    send_email(title, complaint_id, recipient_email)

    return {"message": "Complaint submitted successfully"}

@app.get("/admin/complaints")
def get_team_complaints(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # ดึงข้อมูลคำร้องที่เกี่ยวข้องกับทีมของ admin
    complaints = complaints_collection.find({"team": current_user["team"]})
    complaints_list = []
    for complaint in complaints:
        complaints_list.append({
            "id": str(complaint["_id"]),
            "title": complaint["title"],
            "details": complaint["details"],
            "name": complaint["name"],
            "date": complaint["date"],
            "contact": complaint["contact"],
            "team": complaint["team"],
            "status": complaint["status"]
        })
    return {"complaints": complaints_list}

# ดึงข้อมูลคำร้องทั้งหมด
@app.get("/admin/get-complaints")
def get_complaints():
    complaints = list(complaints_collection.find())
    for complaint in complaints:
        complaint["_id"] = str(complaint["_id"])  # แปลง ObjectId เป็น string
    return complaints

# อัปเดตสถานะคำร้อง
@app.put("/admin/update-complaint/{id}")
def update_complaint_status(id: str, update: ComplaintUpdate):
    result = complaints_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": update.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return {"message": "Status updated successfully"}

# Render Admin Complaints Page
@app.get("/admin_complaints", response_class=HTMLResponse)
async def show_admin_complaints_page(request: Request):
    return templates.TemplateResponse("admin_complaints.html", {"request": request})

# Handle Logout
@app.get("/logout")
async def logout_user(request: Request):
    response = RedirectResponse(url="/")
    response.delete_cookie(key="access_token")
    return response

# ดึงข้อมูลคำร้องเฉพาะ ID
@app.get("/admin/get-complaint/{id}")
def get_complaint(id: str):
    complaint = complaints_collection.find_one({"_id": ObjectId(id)})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    complaint["_id"] = str(complaint["_id"])  # แปลง ObjectId เป็น string
    return complaint

# ส่งคำร้องไปยังหน่วยงาน
@app.get("/admin/forward-complaint/{id}", response_class=HTMLResponse)
async def forward_complaint(id: str, request: Request):  # เพิ่ม `request: Request`
    try:
        # ตรวจสอบว่า ID ถูกต้อง
        username = users_collection.find_one({"username": ObjectId(id)})
        complaint = complaints_collection.find_one({"_id": ObjectId(id)})
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
        
        # ส่งข้อมูลไปยัง admin_forward_complaint.html
        return templates.TemplateResponse("admin_forward_complaint.html",{
            "request": request,
            "complaint": complaint,
            "admin_name": username
        }  # ใช้ `request` จากพารามิเตอร์
        )
    except InvalidId:
        raise HTTPException(status_code=400, detail=f"Invalid complaint ID: {id}")


@app.post("/admin/resolve-complaint/{id}")
def resolve_complaint(id: str, department: str = Form(...), additional_info: str = Form(None)):
    # อัปเดตสถานะเป็น Resolved ใน MongoDB
    result = complaints_collection.update_one(
        {"_id": ObjectId(id)},
        {
            "$set": {
                "status": "Resolved",
                "resolved_department": department,
                "additional_info": additional_info,
                "resolved_date": datetime.utcnow(),
            }
        }
    )

    if result.modified_count == 1:
        return {"message": "Complaint resolved successfully"}
    else:
        return {"error": "Failed to resolve complaint"}
    
@app.get("/admin/get-complaints")
def get_complaints():
    complaints = complaints_collection.find()
    response = []
    for complaint in complaints:
        response.append({
            "id": str(complaint["_id"]),  # แปลง ObjectId เป็น String
            "title": complaint["title"],
            "details": complaint["details"],
            "name": complaint["name"],
            "date": complaint["date"],
            "contact": complaint["contact"],
            "team": complaint["team"],
            "status": complaint["status"],
        })
    return response

@app.post("/admin/update-status/{id}")
async def update_status(id: str, additional_info: str):
    try:
        # ตรวจสอบว่า ID ถูกต้อง
        object_id = ObjectId(id)
        complaint = complaints_collection.find_one({"_id": object_id})
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")

        # อัปเดตสถานะในฐานข้อมูล
        complaints_collection.update_one(
            {"_id": object_id}, 
            {"$set": {"status": "Resolved", "additional_info": additional_info}}
        )
        return {"message": "Complaint status updated to Resolved"}
    except InvalidId:
        raise HTTPException(status_code=400, detail=f"Invalid complaint ID: {id}")
    
@app.get("/admin/get-username/{id}")
def get_username(id: str):
    user = users_collection.find_one({"_id": ObjectId(id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"username": user["username"]}
