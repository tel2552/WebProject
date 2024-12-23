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
    type: str = Form(...),
    otherType: str = Form(None)  # สำหรับกรณีที่เลือก "อื่นๆ"
):
    # กำหนดประเภทข้อร้องเรียนที่ใช้งาน
    complaint_type = otherType if type == "อื่นๆ" else type
    
    # เพิ่มข้อมูลลง MongoDB
    complaint = {
        "title": title,
        "details": details,
        "name": name,
        "date": date,
        "contact": contact,
        "type": complaint_type,
        "status": "Pending"
    }
    result = complaints_collection.insert_one(complaint)
    complaint_id = str(result.inserted_id)

    # กำหนดอีเมลปลายทาง
    recipient_email = EMAIL_RECIPIENTS.get(complaint_type, "default@example.com")
    
    # ส่งอีเมล
    send_email(title, complaint_id, recipient_email)

    return {"message": "Complaint submitted successfully"}


