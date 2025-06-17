from fastapi import APIRouter, Depends, HTTPException, Path, Query
from typing import List
from models.mongo import *
from beanie import PydanticObjectId
from datetime import datetime
from core.utility import *

router = APIRouter()


@router.post("/jobs/{job_id}/apply", response_model=JobApplicationDoc)
async def apply_for_job(
    job_id: str,
    application_data: dict  # Contains candidate_id
):
    """Apply for a job position"""
    try:
        job = await JobDescriptionDoc.get(PydanticObjectId(job_id))
        if not job or not job.is_active:
            raise HTTPException(status_code=404, detail="Job not found or inactive")
        
        candidate_id = application_data.get("candidate_id")
        candidate = await CandidateDoc.get(PydanticObjectId(candidate_id))
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Check if already applied
        existing_application = await JobApplicationDoc.find_one(
            JobApplicationDoc.candidate_id == PydanticObjectId(candidate_id),
            JobApplicationDoc.jd_id == PydanticObjectId(job_id)
        )
        if existing_application:
            raise HTTPException(status_code=400, detail="Already applied for this position")
        
        application_doc = JobApplicationDoc(
            candidate_id=PydanticObjectId(candidate_id),
            jd_id=PydanticObjectId(job_id),
            company_id=job.company_id
        )
        await application_doc.insert()
        
        # Update applications count
        await job.update({"$inc": {"applications_count": 1}})
        
        # TODO: Trigger JD matching analysis here
        
        return application_doc
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/companies/{company_id}/applications/", response_model=List[JobApplicationDoc])
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
    
    query = JobApplicationDoc.company_id == PydanticObjectId(company_id)
    
    if status:
        query = query & (JobApplicationDoc.application_status == status)
    if jd_id:
        query = query & (JobApplicationDoc.jd_id == PydanticObjectId(jd_id))
    
    applications = await JobApplicationDoc.find(query).skip(skip).limit(limit).to_list()
    return applications


@router.get("/applications/{application_id}", response_model=JobApplicationDoc)
async def get_application(
    application_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific application"""
    try:
        application = await JobApplicationDoc.get(PydanticObjectId(application_id))
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        return application
    except Exception:
        raise HTTPException(status_code=404, detail="Application not found")


@router.put("/applications/{application_id}", response_model=JobApplicationDoc)
async def update_application(
    application_id: str,
    application_update: JobApplicationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update application (for JD screening, status changes)"""
    try:
        application = await JobApplicationDoc.get(PydanticObjectId(application_id))
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Check authorization
        if not ((current_user["user_type"] == "company" and current_user["user_id"] == str(application.company_id)) or
                (current_user["user_type"] == "company_user" and current_user.get("company_id") == str(application.company_id))):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        update_data = application_update.dict(exclude_unset=True)
        
        # Set screening details if status changed to screened
        if application_update.jd_screening_passed is not None:
            update_data["screened_at"] = datetime.utcnow()
            update_data["screened_by"] = PydanticObjectId(current_user["user_id"])
        
        if update_data:
            update_data["last_updated"] = datetime.utcnow()
            await application.update({"$set": update_data})
        
        return await JobApplicationDoc.get(application.id)
    except Exception:
        raise HTTPException(status_code=404, detail="Application not found")
