from fastapi import APIRouter, HTTPException, Depends, status, Query, Path
from db.models.all_models import * 
from config import load_env
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import db.mongo_db as mongoDB
import jwt
env = load_env.Environment()

router = APIRouter(prefix="/auth", tags=["auth"])
token = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.post("/login", response_model=LoginResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login for companies and company users"""
    # Try company login first
    company = await mongoDB.authenticate_company(form_data.username, form_data.password)
    if company:
        return mongoDB.create_company_login_response(company)
    
    # Try company user login
    user = await mongoDB.authenticate_company_user(form_data.username, form_data.password)
    if user:
        return mongoDB.create_company_user_login_response(user)
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

@router.get("/get-token")
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