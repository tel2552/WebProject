from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from database import users_collection

SECRET_KEY = "secret_key"  # เปลี่ยนเป็นค่าที่ปลอดภัย
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        print("JWTError: Failed to decode token")
        raise credentials_exception

    try:
        user = users_collection.find_one({"username": username},{"_id": 0, "username": 1, "role": 1, "team": 1})
        if user is None:
            print(f"User not found in database: {username}")
            raise credentials_exception
        return user
    except Exception as e:
        print(f"An error occurred while querying the database: {e}")
        raise credentials_exception
