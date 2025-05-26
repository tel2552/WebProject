from fastapi import APIRouter, Depends, HTTPException, Form, Response
from fastapi.responses import RedirectResponse, JSONResponse
from pymongo.errors import ConnectionFailure
from datetime import timedelta

from database import users_collection
from services.auth import get_password_hash, verify_password, create_access_token, get_current_user
# from models.user_models import UserLogin # Not used directly in these routes as Forms are used

router = APIRouter()

# Handle Login
@router.post("/login")
async def login_user(response: Response, username: str = Form(...), password: str = Form(...)):
    try:
        db_user = users_collection.find_one({"username": username})
        if not db_user or not verify_password(password, db_user["password"]):
            raise HTTPException(status_code=400, detail="Incorrect username or password")

        token = create_access_token(data={"sub": db_user["username"], "role": db_user["role"]}, expires_delta=timedelta(minutes=120))
        redirect_url = "/admin_complaints" # Default, can be adjusted based on role if needed frontend-side
        if db_user["role"] in ["admin", "alladmin"]:
             redirect_url = "/admin_complaints"
        elif db_user["role"] == "user": # Example for 'user' role
             redirect_url = "/forwardeds" # Or some other user-specific page

        response.set_cookie(key="access_token", value=token, httponly=True, max_age=7200) # 2 hours
        
        return JSONResponse(content={"token": token, "redirect_url": redirect_url, "role": db_user["role"], "team": db_user.get("team")})
    except ConnectionFailure:
        raise HTTPException(status_code=500, detail="Database connection failed")

# Handle Register
@router.post("/register")
def register_user(username: str = Form(...), password: str = Form(...)): # Consider adding role and team if needed during registration
    existing_user = users_collection.find_one({"username": username})
    if existing_user:
        return JSONResponse(status_code=400, content={"detail": "Username already exists"})
    
    hashed_password = get_password_hash(password)
    users_collection.insert_one({
        "username": username,
        "password": hashed_password,
        "role": 'user',  # Default role
        "team": 'user'   # Default team or make it selectable
    })
    return RedirectResponse(url="/login", status_code=303) # Redirect to login after registration

@router.get("/logout")
async def logout_user(response: Response):
    response.delete_cookie(key="access_token")
    return JSONResponse(
        content={"message": "Logged out successfully", "clearLocalStorage": True},
        headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"}
    )

@router.get("/admin/get-username")
def get_username_route(current_user: dict = Depends(get_current_user)):
    return {"username": current_user["username"]}

@router.get("/admin/get-userrole")
def get_userrole_route(current_user: dict = Depends(get_current_user)):
    return {"role": current_user["role"]}

@router.get("/admin/get-userteam")
def get_userteam_route(current_user: dict = Depends(get_current_user)):
    return {"team": current_user["team"]}