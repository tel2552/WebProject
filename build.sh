#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Installing system dependencies for WeasyPrint..."
apt-get update -y && apt-get install -y \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libcairo2 \
    libharfbuzz0b \
    libfontconfig1

echo "System dependencies installed."

# Continue with the default Python build process
# (Vercel will automatically install requirements.txt)