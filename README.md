# WebProject - ระบบจัดการข้อร้องเรียน (Complaint Management System)

โปรเจกต์นี้เป็นระบบจัดการข้อร้องเรียนที่พัฒนาด้วย FastAPI (Python) สำหรับ Backend และ HTML, CSS, JavaScript สำหรับ Frontend โดยมีการเชื่อมต่อกับ MongoDB เป็นฐานข้อมูล

## สารบัญ

- [คุณสมบัติหลัก](#คุณสมบัติหลัก)
- [เทคโนโลยีที่ใช้](#เทคโนโลยีที่ใช้)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [การติดตั้ง](#การติดตั้ง)
- [การตั้งค่า Environment Variables](#การตั้งค่า-environment-variables)
- [การรันโปรเจกต์](#การรันโปรเจกต์)
- [การใช้งานเบื้องต้น](#การใช้งานเบื้องต้น)

## คุณสมบัติหลัก

- **การส่งข้อร้องเรียน:** ผู้ใช้ทั่วไปสามารถส่งข้อร้องเรียนผ่านหน้าเว็บได้
- **การจัดการข้อร้องเรียนโดย Admin:**
    - ดูรายการข้อร้องเรียนทั้งหมดและตามทีม
    - อัปเดตสถานะข้อร้องเรียน (Pending, Admit, Forwarded, Complete)
    - บันทึกรายละเอียดการดำเนินการ
    - ส่งต่อข้อร้องเรียนไปยังผู้บริหารเพื่ออนุมัติ
- **การจัดการผู้ใช้ (Admin):** Superadmin สามารถเพิ่ม/ลบ/แก้ไขข้อมูล Admin ได้
- **การจัดการอีเมลผู้รับผิดชอบ:** Superadmin สามารถจัดการอีเมลของผู้รับผิดชอบในแต่ละทีมได้
- **การแจ้งเตือนทางอีเมล:** ระบบจะส่งอีเมลแจ้งเตือนเมื่อมีการส่งข้อร้องเรียนใหม่ หรือเมื่อมีการส่งต่อข้อร้องเรียน
- **Export PDF:** สามารถ Export รายละเอียดข้อร้องเรียนเป็นไฟล์ PDF ได้
- **การลบข้อมูลอัตโนมัติ:** ข้อร้องเรียนที่ถูกยกเลิก (Cancelled) จะถูกลบออกจากระบบหลังจากระยะเวลาที่กำหนด
- **หน้าแสดงรายงาน:** แสดงรายงานสรุปข้อร้องเรียนสถานะต่างๆ

## เทคโนโลยีที่ใช้

- **Backend:**
    - Python 3.x
    - FastAPI
    - Uvicorn (ASGI server)
    - Gunicorn (WSGI HTTP Server - สำหรับ Production)
    - Pydantic (Data validation)
    - MongoDB (ฐานข้อมูล NoSQL)
    - PyMongo (MongoDB Python driver)
    - python-jose (JWT handling)
    - passlib (Password hashing)
    - python-dotenv (Environment variable management)
    - APScheduler (Task scheduling - สำหรับลบข้อมูลอัตโนมัติ)
    - WeasyPrint (PDF generation)
    - Jinja2 (Templating for PDF)
    - smtplib (Email sending)
- **Frontend:**
    - HTML5
    - CSS3
    - JavaScript (Vanilla JS, Fetch API)
    - SweetAlert2 (สำหรับ Pop-up สวยงาม)
    - Font Awesome (สำหรับ Icons)

## โครงสร้างโปรเจกต์

```
WebProject/
├── .git/
├── .gitignore
├── .env                 # (ต้องสร้างเอง) ไฟล์เก็บ Environment Variables
├── main.py              # ไฟล์หลักสำหรับรัน FastAPI application
├── database.py          # ตั้งค่าการเชื่อมต่อ MongoDB
├── howto.txt            # (ไฟล์ที่คุณให้มา) วิธีการรันโปรเจกต์
├── requirements.txt     # (ควรสร้าง) รายการ Dependencies ของ Python
├── models/              # Pydantic models และ Custom Types
│   ├── __init__.py
│   ├── complaint_models.py
│   ├── custom_types.py
│   ├── email_models.py
│   └── user_models.py
├── routes/              # API Endpoints และ HTML page routes
│   ├── __init__.py
│   ├── admin_management_routes.py
│   ├── auth_routes.py
│   ├── complaint_routes.py
│   ├── email_management_routes.py
│   └── ui_routes.py
├── services/            # Business logic และ Utility services
│   ├── __init__.py
│   ├── auth.py
│   ├── delete_service.py
│   ├── email_service.py
│   └── pdf_service.py
├── static/              # ไฟล์ CSS, JavaScript, รูปภาพ สำหรับ Frontend
│   ├── css/
│   └── js/
└── templates/           # HTML templates (Jinja2)
    ├── admin_admit_complaint.html
    # ... (ไฟล์ HTML อื่นๆ) ...
    └── register.html
```

## การติดตั้ง

1.  **Clone Repository:**
    ```bash
    git clone <your-repository-url>
    cd WebProject
    ```
2.  **สร้างและ Activate Virtual Environment (แนะนำ):**
    ```bash
    python -m venv venv
    # Windows
    .\venv\Scripts\activate
    # macOS/Linux
    source venv/bin/activate
    ```
3.  **ติดตั้ง Dependencies:**
    (ตรวจสอบให้แน่ใจว่าคุณมีไฟล์ `requirements.txt` หากยังไม่มี ให้สร้างโดยใช้ `pip freeze > requirements.txt`)
    ```bash
    pip install -r requirements.txt
    ```
4.  **ตั้งค่า MongoDB:**
    - ตรวจสอบให้แน่ใจว่าคุณมี MongoDB instance รันอยู่ (Local หรือ Cloud เช่น MongoDB Atlas)
    - คัดลอก Connection String ของ MongoDB

## การตั้งค่า Environment Variables

สร้างไฟล์ `.env` ใน root directory ของโปรเจกต์ และเพิ่มค่าตัวแปรที่จำเป็น:

```env
MONGODB_URI="your_mongodb_connection_string"
EMAIL_USER="your_email_address_for_sending_notifications"
EMAIL_PASSWORD="your_email_password_or_app_password"
SECRET_KEY="your_strong_random_secret_key_for_jwt" # สร้าง Key สุ่มที่แข็งแรง
ALGORITHM="HS256" # อัลกอริทึมสำหรับ JWT
```

**หมายเหตุ:** `SECRET_KEY` ควรเป็นค่าสุ่มที่คาดเดาได้ยาก

## การรันโปรเจกต์

1.  **Development Server (ใช้ Uvicorn):**
    (ตรวจสอบให้แน่ใจว่าคุณอยู่ใน root directory ของโปรเจกต์ และ virtual environment ถูก activate แล้ว)
    ```bash
    uvicorn main:app --reload
    ```
    จากนั้นเปิดเบราว์เซอร์ไปที่ `http://127.0.0.1:8000`

2.  **Production Server (ใช้ Gunicorn - ตัวอย่าง):**
    ```bash
    gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
    ```
    (จำนวน workers (`-w 4`) และ port อาจจะต้องปรับตามความเหมาะสมของเซิร์ฟเวอร์)

## การใช้งานเบื้องต้น

- **หน้าส่งข้อร้องเรียน:** เข้าถึงได้ผ่าน `/` หรือ `/complaint`
- **หน้า Login Admin:** เข้าถึงได้ผ่าน `/login`
- **หน้าจัดการข้อร้องเรียน (Admin):** หลังจาก Login สำเร็จ จะถูก redirect ไปยัง `/admin_complaints` หรือหน้าที่เกี่ยวข้อง

---
