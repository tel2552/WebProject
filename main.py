from fastapi import FastAPI, HTTPException, Depends, Request, Form, Body , Response
from fastapi.responses import HTMLResponse, RedirectResponse , JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import timedelta
from database import users_collection, complaints_collection
from auth import get_password_hash, verify_password, create_access_token
from email_service import send_email
from auth import get_current_user
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime
from collections import OrderedDict

app = FastAPI()

# Static Files & Templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Models
# Mapping ระหว่างประเภทข้อร้องเรียนกับอีเมลปลายทาง
EMAIL_RECIPIENTS = {
    "ด้านบุคลากร": "phubasesri@pim.ac.th",
    "การบริการงานวิจัย": "nuttawutwon@pim.ac.th",
    "การบริการวิชาการ": "academic@example.com",
    "การบริหารจัดการของ PIM": "management@example.com",
    "การบริการแก่นักศึกษา": "telergamer@gmail.com",
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
    redirect_url = "/admin_complaints" if db_user["role"] in ["admin", "superadmin"] else "/complaint"
    return JSONResponse(content={"token": token, "redirect_url": redirect_url})

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

    # ส่งข้อความกลับไปยัง Frontend
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
            "status": complaint["status"],
            "additional_info": '-',
        })
    return {"complaints": complaints_list}

# ดึงข้อมูลคำร้องทั้งหมดและแปลง ObjectId เป็น String
@app.get("/admin/get-complaints")
def get_complaints():
    complaints = list(complaints_collection.find())
    for complaint in complaints:
        complaint["_id"] = str(complaint["_id"])  # แปลง ObjectId เป็น string
    return complaints

# Render Admin Complaints Page
@app.get("/admin_complaints", response_class=HTMLResponse)
async def show_admin_complaints_page(request: Request):
    return templates.TemplateResponse("admin_complaints.html", {"request": request})

@app.get("/reports", response_class=HTMLResponse)
async def show_reports_page(request: Request):
    return templates.TemplateResponse("reports.html", {"request": request})

@app.get("/forwardeds", response_class=HTMLResponse)
async def show_forwardeds_page(request: Request):
    return templates.TemplateResponse("forwardeds.html", {"request": request})

@app.get("/admin_users", response_class=HTMLResponse)
async def show_admin_users_page(request: Request):
    return templates.TemplateResponse("admin_users.html", {"request": request})

# Handle Logout
@app.get("/logout")
async def logout_user(response: Response):
    # ลบ Cookie (ถ้ามี)
    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully"}

# ดึงข้อมูลคำร้องเฉพาะ ID
@app.get("/admin/get-complaint/{id}")
def get_complaint(id: str):
    complaint = complaints_collection.find_one({"_id": ObjectId(id)})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    complaint["_id"] = str(complaint["_id"])  # แปลง ObjectId เป็น string
    return complaint

# New Route: Get Completed Complaints
@app.get("/admin/get-completed-complaints")
async def get_completed_complaints():
    complaints = complaints_collection.find({"status": "Complete"})
    complaints_list = []
    for complaint in complaints:
        complaints_list.append({
            "_id": str(complaint["_id"]),
            "title": complaint["title"],
            "details": complaint["details"],
            "name": complaint["name"],
            "date": complaint["date"],
            "contact": complaint["contact"],
            "team": complaint["team"],
            "status": complaint["status"],
            "resolved_date": complaint.get("resolved_date")
            .isoformat()
            if complaint.get("resolved_date")
            else None,
            "inspector_name2": complaint.get("inspector_name2"),
            "severity_level": complaint.get("severity_level"),
            "correction2": complaint.get("correction2")
        })
    return complaints_list

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

@app.get("/admin/admit-complaint/{id}", response_class=HTMLResponse)
async def admit_complaint(id: str, request: Request):  # เพิ่ม `request: Request`
    try:
        # ตรวจสอบว่า ID ถูกต้อง
        username = users_collection.find_one({"username": ObjectId(id)})
        complaint = complaints_collection.find_one({"_id": ObjectId(id)})
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
        
        # ส่งข้อมูลไปยัง admin_admit_complaint.html
        return templates.TemplateResponse("admin_admit_complaint.html",{
            "request": request,
            "complaint": complaint,
            "admin_name": username
        }  # ใช้ `request` จากพารามิเตอร์
        )
    except InvalidId:
        raise HTTPException(status_code=400, detail=f"Invalid complaint ID: {id}")

@app.get("/admin/complete-complaint/{id}", response_class=HTMLResponse)
async def complete_complaint(id: str, request: Request):  # เพิ่ม `request: Request`
    try:
        # ตรวจสอบว่า ID ถูกต้อง
        username = users_collection.find_one({"username": ObjectId(id)})
        complaint = complaints_collection.find_one({"_id": ObjectId(id)})
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
        
        # ส่งข้อมูลไปยัง admin_complete_complaint.html
        return templates.TemplateResponse("admin_complete_complaint.html",{
            "request": request,
            "complaint": complaint,
            "admin_name": username
        }  # ใช้ `request` จากพารามิเตอร์
        )
    except InvalidId:
        raise HTTPException(status_code=400, detail=f"Invalid complaint ID: {id}")

@app.post("/admin/admit-complaint/{id}")
def resolve_complaint(id: str, department: str = Form(...), additional_info: str = Form(...)):
    # อัปเดตสถานะเป็น Resolved ใน MongoDB
    result = complaints_collection.update_one(
        {"_id": ObjectId(id)},
        {
            "$set": {
                "team": department,
                "status": "Admit",
                "additional_info": additional_info,
                "resolved_date": datetime.utcnow(),
            }
        }
    )

    if result.modified_count == 1:
        return {"message": "Complaint Admit successfully"}
    else:
        return {"error": "Failed to Admit complaint"}
    
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

# def get_current_user_Mock():
#     return {"username": "admin_user"}

@app.get("/admin/get-username")
def get_username(current_user: dict = Depends(get_current_user)):
    # if current_user:
    #     return JSONResponse(content={"username": current_user["username"]}, status_code=200)
    # else:
    #     return JSONResponse(content={"msg": "User not found"}, status_code=404)
    return {"username": current_user["username"]}

@app.post("/admin/save-complaint/{id}")
async def admit_complaint(id: str, payload: ForwardComplaintPayload = Body(...)):
    try:
        # Access the payload data
        severity_level = payload.severity_level
        recipients_list = payload.recipients
        correction1 = payload.correction1
        inspector_name1 = payload.inspector_name1
        inspection_date1 = payload.inspection_date1
        correction2 = payload.correction2
        inspector_name2 = payload.inspector_name2
        inspection_date2 = payload.inspection_date2
        correction3 = payload.correction3
        inspector_name3 = payload.inspector_name3
        inspection_date3 = payload.inspection_date3
        correction4 = payload.correction4
        inspector_name4 = payload.inspector_name4
        inspection_date4 = payload.inspection_date4
        correction5 = payload.correction5
        inspector_name5 = payload.inspector_name5
        inspection_date5 = payload.inspection_date5

        update_data = OrderedDict([
            ("severity_level", severity_level),
            ("recipients", recipients_list),
            ("status", "Admit"),
            ("admit_date", datetime.utcnow()),
            ("correction1", correction1),
            ("inspector_name1", inspector_name1),
            ("inspection_date1", inspection_date1),
            ("correction2", correction2),
            ("inspector_name2", inspector_name2),
            ("inspection_date2", inspection_date2),
            ("correction3", correction3),
            ("inspector_name3", inspector_name3),
            ("inspection_date3", inspection_date3),
            ("correction4", correction4),
            ("inspector_name4", inspector_name4),
            ("inspection_date4", inspection_date4),
            ("correction5", correction5),
            ("inspector_name5", inspector_name5),
            ("inspection_date5", inspection_date5),
        ])



        # อัปเดตข้อมูลคำร้องใน MongoDB
        result = complaints_collection.update_one(
            {"_id": ObjectId(id)},
            {
                "$set": update_data
            }
        )

        # ตรวจสอบว่าอัปเดตสำเร็จหรือไม่
        if result.modified_count == 1:
            return {"message": "Complaint Forwarded successfully"}
        else:
            raise HTTPException(status_code=404, detail="Complaint not found or no changes made")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/forward-complaint/{id}")
async def admit_complaint(id: str, payload: ForwardComplaintPayload = Body(...)):
    try:
        # Access the payload data
        severity_level = payload.severity_level
        recipients_list = payload.recipients
        correction1 = payload.correction1
        inspector_name1 = payload.inspector_name1
        inspection_date1 = payload.inspection_date1
        correction2 = payload.correction2
        inspector_name2 = payload.inspector_name2
        inspection_date2 = payload.inspection_date2
        correction3 = payload.correction3
        inspector_name3 = payload.inspector_name3
        inspection_date3 = payload.inspection_date3
        correction4 = payload.correction4
        inspector_name4 = payload.inspector_name4
        inspection_date4 = payload.inspection_date4
        correction5 = payload.correction5
        inspector_name5 = payload.inspector_name5
        inspection_date5 = payload.inspection_date5

        update_data = OrderedDict([
            ("severity_level", severity_level),
            ("recipients", recipients_list),
            ("status", "Forwarded"),
            ("admit_date", datetime.utcnow()),
            ("correction1", correction1),
            ("inspector_name1", inspector_name1),
            ("inspection_date1", inspection_date1),
            ("correction2", correction2),
            ("inspector_name2", inspector_name2),
            ("inspection_date2", inspection_date2),
            ("correction3", correction3),
            ("inspector_name3", inspector_name3),
            ("inspection_date3", inspection_date3),
            ("correction4", correction4),
            ("inspector_name4", inspector_name4),
            ("inspection_date4", inspection_date4),
            ("correction5", correction5),
            ("inspector_name5", inspector_name5),
            ("inspection_date5", inspection_date5),
        ])



        # อัปเดตข้อมูลคำร้องใน MongoDB
        result = complaints_collection.update_one(
            {"_id": ObjectId(id)},
            {
                "$set": update_data
            }
        )

        # ตรวจสอบว่าอัปเดตสำเร็จหรือไม่
        if result.modified_count == 1:
            return {"message": "Complaint Forwarded successfully"}
        else:
            raise HTTPException(status_code=404, detail="Complaint not found or no changes made")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/admin/complete-complaint/{id}")
def complete_complaint(id: str):
    # อัปเดตสถานะเป็น complete ใน MongoDB
    result = complaints_collection.update_one(
        {"_id": ObjectId(id)},
        {
            "$set": {
                "status": "Complete",
                "complete_date": datetime.utcnow(),
            }
        }
    )

    if result.modified_count == 1:
        return {"message": "Complaint complete successfully"}
    else:
        return {"error": "Failed to complete complaint"}
