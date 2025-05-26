#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🔧 Installing system dependencies for WeasyPrint..."

# ติดตั้ง system dependencies ที่จำเป็นสำหรับ WeasyPrint
apt-get update
apt-get install -y \
    build-essential \
    libpango-1.0-0 \
    libcairo2 \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    libssl-dev \
    libxml2 \
    libxslt1.1 \
    libjpeg-dev \
    zlib1g-dev \
    curl \
    fonts-liberation \
    fonts-dejavu-core \
    fonts-freefont-ttf \
    wkhtmltopdf

echo "📦 Installing Python dependencies..."
pip install -r requirements.txt
