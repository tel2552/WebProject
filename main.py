import os
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse # Only if some root/generic HTML pages remain here
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

from services.delete_service import start_scheduler

# Import routers
from routes.complaint_routes import router as admin_complaint_router, public_complaint_router
from routes import ui_routes, auth_routes, complaint_routes, email_management_routes, admin_management_routes

app = FastAPI()

# Static Files & Templates
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers
app.include_router(ui_routes.router)
app.include_router(auth_routes.router)
app.include_router(complaint_routes.router)
app.include_router(email_management_routes.router)
app.include_router(admin_management_routes.router)
app.include_router(admin_complaint_router)
app.include_router(public_complaint_router)

# Routes
# start task
start_scheduler()

# --- Main Execution ---
if __name__ == "__main__":
    # Use environment variables for host and port, default if not set
    host = os.getenv("HOST", "127.0.0.1") # Default to localhost for development
    port = int(os.getenv("PORT", 8000))  # Default to 8000
    reload = os.getenv("RELOAD", "true").lower() == "true" # Enable reload by default for dev

    print(f"Starting Uvicorn server on {host}:{port} with reload={'enabled' if reload else 'disabled'}")
    uvicorn.run("main:app", host=host, port=port, reload=reload)