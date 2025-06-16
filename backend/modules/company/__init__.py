from fastapi import APIRouter, HTTPException, Depends, Query, Path
from typing import List, Optional
import db.mongo_db as mongoDB
from db.models.all_models import *
from modules.auth import get_current_user
router = APIRouter(prefix="/companies", tags=["companies"])

@router.post("/")
async def create_company(company: CompanyCreate):
    """Register a new company"""
    existing_company = await mongoDB.find_company_by_email(company.email)
    if existing_company:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    return await mongoDB.create_company(
        company.dict(exclude={"password"}), 
        company.password
    )

@router.get("/{company_id}")
async def get_company(
    company_id: str = Path(..., description="Company ID"),
    current_user: dict = Depends(get_current_user)
):
    """Get company details"""
    company = await mongoDB.get_company_by_id(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@router.put("/{company_id}")
async def update_company(
    company_id: str,
    company_update: CompanyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update company profile"""
    company = await mongoDB.get_company_by_id(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    if current_user["user_type"] != "company" or current_user["user_id"] != company_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updated_company = await mongoDB.update_company_by_id(
        company_id, 
        company_update.dict(exclude_unset=True)
    )
    
    if not updated_company:
        raise HTTPException(status_code=404, detail="Company not found")
    return updated_company

@router.get("/")
async def list_companies(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    """List all companies"""
    return await mongoDB.list_all_companies(skip, limit)

@router.post("/{company_id}/users/", )
async def create_company_user(
    company_id: str,
    user: CompanyUserCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new company user"""
    # Authorization check
    if current_user["user_type"] == "company" and current_user["user_id"] == company_id:
        pass
    elif current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id:
        current_company_user = await mongoDB.get_user_by_id(current_user["user_id"])
        if not current_company_user or current_company_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only admins can create users")
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing_user = await mongoDB.find_user_by_email(user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    created_by = current_user["user_id"] if current_user["user_type"] == "company_user" else None
    return await mongoDB.create_company_user(
        company_id,
        user.dict(exclude={"password", "company_id", "created_by"}),
        user.password,
        created_by
    )

@router.get("/{company_id}/users/")
async def list_company_users(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """List all users in a company"""
    if (current_user["user_type"] == "company" and current_user["user_id"] == company_id) or \
       (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id):
        return await mongoDB.list_company_users(company_id)
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

@router.get("/{company_id}/users/{user_id}")
async def get_company_user(
    company_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific company user"""
    user = await mongoDB.find_company_user(user_id, company_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{company_id}/users/{user_id}")
async def update_company_user(
    company_id: str,
    user_id: str,
    user_update: CompanyUserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update company user"""
    user = await mongoDB.find_company_user(user_id, company_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Authorization logic
    if current_user["user_type"] == "company_user" and current_user["user_id"] == user_id:
        allowed_fields = {"name", "email"}
        update_data = {k: v for k, v in user_update.dict(exclude_unset=True).items() if k in allowed_fields}
    else:
        if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
                (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
            raise HTTPException(status_code=403, detail="Not authorized")
        update_data = user_update.dict(exclude_unset=True)
    
    return await mongoDB.update_company_user(user, update_data)

@router.post("/{company_id}/jobs/")
async def create_job_description(
    company_id: str,
    job: JobDescriptionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new job description"""
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return await mongoDB.create_job_description(
        company_id,
        job.dict(),
        current_user["user_id"]
    )

@router.get("/{company_id}/jobs/")
async def list_company_jobs(
    company_id: str,
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """List all jobs for a company"""
    return await mongoDB.list_company_jobs(company_id, is_active, skip, limit)