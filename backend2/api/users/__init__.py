from fastapi import APIRouter, Depends, HTTPException, Path, Query
from typing import List
from models.mongo import *
# from models.company import *
from beanie import PydanticObjectId
from datetime import datetime
from core.utility import *

router = APIRouter()


@router.post("/companies/{company_id}/users/", response_model=CompanyUserDoc)
async def create_company_user(
    company_id: str,
    user: CompanyUserCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new company user"""
    # Check authorization
    if current_user["user_type"] == "company" and current_user["user_id"] == company_id:
        pass  # Company owner can create users
    elif current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id:
        # Check if current user is admin
        current_company_user = await CompanyUserDoc.get(PydanticObjectId(current_user["user_id"]))
        if not current_company_user or current_company_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only admins can create users")
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if email already exists
    existing_user = await CompanyUserDoc.find_one(CompanyUserDoc.email == user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(user.password)
    user_doc = CompanyUserDoc(
        **user.dict(exclude={"password", "company_id", "created_by"}),
        company_id=PydanticObjectId(company_id),
        password_hash=hashed_password,
        created_by=PydanticObjectId(current_user["user_id"]) if current_user["user_type"] == "company_user" else None
    )
    await user_doc.insert()
    return user_doc


@router.get("/companies/{company_id}/users/", response_model=List[CompanyUserDoc])
async def list_company_users(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """List all users in a company"""
    # Check authorization
    if (current_user["user_type"] == "company" and current_user["user_id"] == company_id) or \
       (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id):
        users = await CompanyUserDoc.find(CompanyUserDoc.company_id == PydanticObjectId(company_id)).to_list()
        return users
    else:
        raise HTTPException(status_code=403, detail="Not authorized")


@router.get("/companies/{company_id}/users/{user_id}", response_model=CompanyUserDoc)
async def get_company_user(
    company_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific company user"""
    user = await CompanyUserDoc.find_one(
        CompanyUserDoc.id == PydanticObjectId(user_id),
        CompanyUserDoc.company_id == PydanticObjectId(company_id)
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/companies/{company_id}/users/{user_id}", response_model=CompanyUserDoc)
async def update_company_user(
    company_id: str,
    user_id: str,
    user_update: CompanyUserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update company user"""
    user = await CompanyUserDoc.find_one(
        CompanyUserDoc.id == PydanticObjectId(user_id),
        CompanyUserDoc.company_id == PydanticObjectId(company_id)
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check authorization
    if current_user["user_type"] == "company_user" and current_user["user_id"] == user_id:
        # Users can update their own profile (limited fields)
        allowed_fields = {"name", "email"}
        update_data = {k: v for k, v in user_update.dict(exclude_unset=True).items() if k in allowed_fields}
    else:
        # Admin can update all fields
        if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
                (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
            raise HTTPException(status_code=403, detail="Not authorized")
        update_data = user_update.dict(exclude_unset=True)
    
    if update_data:
        await user.update({"$set": update_data})
    
    return await CompanyUserDoc.get(user.id)