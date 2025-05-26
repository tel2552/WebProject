from pydantic import BaseModel

class User(BaseModel):
    username: str
    password: str
    role: str  # "user", "admin", "high_admin", "superadmin", "alladmin"
    team: str

class UserLogin(BaseModel):
    username: str
    password: str