from fastapi import APIRouter, Depends, HTTPException, Path, Query
from typing import List
from models.mongo import *
from beanie import PydanticObjectId
from datetime import datetime
from core.utility import *

router = APIRouter()


@router.post("/companies/{company_id}/jobs/", response_model=JobDescriptionDoc)
async def create_job_description(
    company_id: str,
    job: JobDescriptionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new job description"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Additional validation for duration field
    if job.employment_type and job.employment_type != EmploymentType.FULL_TIME and not job.duration:
        raise HTTPException(
            status_code=400, 
            detail="Duration is required for non-full-time positions"
        )
    
    # Create job document with proper ObjectId conversion
    job_data = job.dict()
    job_doc = JobDescriptionDoc(
        **job_data,
        company_id=PydanticObjectId(company_id),
        created_by=PydanticObjectId(current_user["user_id"])
    )
    await job_doc.insert()
    return job_doc


@router.get("/companies/{company_id}/settings/", response_model=List[SystemSettingDoc])
async def list_company_settings(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all system settings for a company"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    settings = await SystemSettingDoc.find(
        SystemSettingDoc.company_id == PydanticObjectId(company_id)
    ).to_list()
    return settings


@router.get("/companies/{company_id}/settings/{setting_key}", response_model=SystemSettingDoc)
async def get_company_setting(
    company_id: str,
    setting_key: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific system setting for a company"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    setting = await SystemSettingDoc.find_one(
        SystemSettingDoc.company_id == PydanticObjectId(company_id),
        SystemSettingDoc.setting_key == setting_key
    )
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting
