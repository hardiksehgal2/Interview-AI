from datetime import datetime, timedelta
import bcrypt
import jwt
from fastapi import HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer


token = OAuth2PasswordBearer(tokenUrl="auth/login")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, "3GJpGVgA+PNPlP+yLU8tA7sN3k0GPDx6QA98vkdjSts=", algorithm="HS256")

# async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
#     """Decode JWT token and return current user info"""
#     try:
#         token = credentials.credentials
#         payload = jwt.decode(token, "3GJpGVgA+PNPlP+yLU8tA7sN3k0GPDx6QA98vkdjSts=", algorithms=["HS256"])
#         return payload
#     except jwt.PyJWTError:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Invalid authentication token"
#         )

async def get_current_user(token: str = Depends(token)):
    """Decode JWT token and return current user info"""
    try:
        payload = jwt.decode(token, "3GJpGVgA+PNPlP+yLU8tA7sN3k0GPDx6QA98vkdjSts=", algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )