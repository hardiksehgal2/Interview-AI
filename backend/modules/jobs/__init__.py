from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import db.mongo_db as mongoDB
from db.models.all_models import *
from modules.auth import get_current_user

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("/")
async def list_all_jobs(
    is_active: bool = Query(True),
    experience_level: Optional[ExperienceLevel] = Query(None),
    employment_type: Optional[EmploymentType] = Query(None),
    location: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    """List all active job descriptions (public endpoint for candidates)"""
    return await mongoDB.list_jobs_with_filters(
        is_active=is_active,
        experience_level=experience_level,
        employment_type=employment_type,
        location=location,
        skip=skip,
        limit=limit
    )

@router.get("/{job_id}")
async def get_job_description(job_id: str):
    """Get specific job description (public endpoint)"""
    job = await mongoDB.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.put("/{job_id}")
async def update_job_description(
    job_id: str,
    job_update: JobDescriptionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update job description"""
    job = await mongoDB.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not await mongoDB.check_job_authorization(job, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updated_job = await mongoDB.update_job_by_id(job_id, job_update.dict(exclude_unset=True))
    if not updated_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return updated_job

@router.delete("/{job_id}")
async def delete_job_description(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Soft delete job description (set is_active = False)"""
    job = await mongoDB.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not await mongoDB.check_job_authorization(job, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    deactivated_job = await mongoDB.deactivate_job(job_id)
    if not deactivated_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"message": "Job description deactivated successfully"}