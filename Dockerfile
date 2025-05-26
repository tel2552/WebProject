# ใช้ base image ที่เล็กและมี Python 3.9 ติดตั้งไว้แล้ว
FROM python:3.9-slim

# ตั้งค่า Environment Variables
# PYTHONUNBUFFERED=1: ป้องกันไม่ให้ Python buffer output ทำให้ log แสดงผลทันที
# PIP_EXTRA_INDEX_URL: ดึงมาจาก vercel.json ของคุณ อาจช่วยให้ติดตั้งบาง packages ได้เร็วขึ้น (ถ้ามีบน piwheels)
ENV PYTHONUNBUFFERED=1
ENV PIP_EXTRA_INDEX_URL=https://www.piwheels.org/simple

# ติดตั้ง system dependencies ที่จำเป็นสำหรับ WeasyPrint และอื่นๆ
# การรวมคำสั่ง apt-get ทั้งหมดใน RUN เดียวช่วยลดจำนวน layer ของ image
# เพิ่มการยอมรับ EULA สำหรับ Microsoft fonts ก่อน
RUN echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections \
    && apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libcairo2 \
    libharfbuzz0b \
    libfontconfig1 \
    # เพิ่ม ttf-mscorefonts-installer สำหรับ Tahoma และฟอนต์ Microsoft อื่นๆ
    ttf-mscorefonts-installer \
    build-essential \
    --no-install-recommends \
    fonts-thai-tlwg \
    fonts-noto \
    fonts-noto-cjk \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ตั้ง working directory ภายใน container
WORKDIR /app

# คัดลอกไฟล์ requirements.txt เข้าไปใน working directory ก่อน
# เพื่อใช้ประโยชน์จาก Docker layer caching ถ้าไฟล์นี้ไม่เปลี่ยน Docker จะไม่รัน pip install ใหม่
COPY requirements.txt .

# ติดตั้ง Python dependencies จาก requirements.txt
# --no-cache-dir ช่วยลดขนาดของ image
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# คัดลอกไฟล์ทั้งหมดในโปรเจกต์ปัจจุบัน (ที่ Dockerfile อยู่) เข้าไปใน working directory ของ container
COPY . .

# เปิด port 8000 เพื่อให้สามารถเข้าถึงแอปพลิเคชันจากภายนอก container ได้ (ถ้าใช้ uvicorn ตามปกติ)
EXPOSE 8000

# คำสั่งเริ่มต้นเมื่อ container เริ่มทำงาน
# รัน uvicorn server โดยให้ main:app เป็น entrypoint (main.py และ app คือ FastAPI instance)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]