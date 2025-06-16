from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import db.mongo_db as mongoDB
from db.models.all_models import *
from modules.auth import get_current_user

router = APIRouter(tags=["applications"])

@router.post("/jobs/{job_id}/apply")
async def apply_for_job(
    job_id: str,
    application_data: dict  # Contains candidate_id
):
    """Apply for a job position"""
    # Validate job exists and is active
    job = await mongoDB.get_job_for_application(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or inactive")
    
    # Validate candidate exists
    candidate_id = application_data.get("candidate_id")
    if not candidate_id:
        raise HTTPException(status_code=400, detail="candidate_id is required")
    
    candidate = await mongoDB.get_candidate_for_application(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Check if already applied
    existing_application = await mongoDB.find_existing_application(candidate_id, job_id)
    if existing_application:
        raise HTTPException(status_code=400, detail="Already applied for this position")
    
    # Create application
    application = await mongoDB.create_job_application(candidate_id, job_id, str(job.company_id))
    
    # Update applications count
    await mongoDB.increment_job_applications_count(job_id)
    
    # TODO: Trigger JD matching analysis here
    
    return application

@router.get("/companies/{company_id}/applications/")
async def list_company_applications(
    company_id: str,
    status: Optional[ApplicationStatus] = Query(None),
    jd_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """List applications for a company"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return await mongoDB.list_company_applications(company_id, status, jd_id, skip, limit)

@router.get("/applications/{application_id}")
async def get_application(
    application_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific application"""
    application = await mongoDB.get_application_by_id(application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application

@router.put("/applications/{application_id}")
async def update_application(
    application_id: str,
    application_update: JobApplicationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update application (for JD screening, status changes)"""
    application = await mongoDB.get_application_by_id(application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check authorization
    if not await mongoDB.check_application_authorization(application, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = application_update.dict(exclude_unset=True)
    
    updated_application = await mongoDB.update_application_by_id(
        application_id,
        update_data,
        current_user["user_id"],
        application_update.jd_screening_passed
    )
    
    if not updated_application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return updated_application