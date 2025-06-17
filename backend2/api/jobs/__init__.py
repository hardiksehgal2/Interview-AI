from fastapi import APIRouter, Depends, HTTPException, Path, Query
from typing import List
from models.mongo import *
from beanie import PydanticObjectId
from datetime import datetime
from core.utility import *
from beanie.operators import RegEx

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
    
    job_doc = JobDescriptionDoc(
        **job.dict(),
        company_id=PydanticObjectId(company_id),
        created_by=PydanticObjectId(current_user["user_id"])
    )
    await job_doc.insert()
    return job_doc


@router.get("/companies/{company_id}/jobs/", response_model=List[JobDescriptionDoc])
async def list_company_jobs(
    company_id: str,
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """List all jobs for a company"""
    query = JobDescriptionDoc.company_id == PydanticObjectId(company_id)
    
    if is_active is not None:
        query = query and (JobDescriptionDoc.is_active == is_active)
    
    jobs = await JobDescriptionDoc.find(query).skip(skip).limit(limit).to_list()
    return jobs


@router.get("/jobs/", response_model=List[JobDescriptionDoc])
async def list_all_jobs(
    is_active: bool = Query(True),
    experience_level: Optional[ExperienceLevel] = Query(None),
    employment_type: Optional[EmploymentType] = Query(None),
    location: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    """List all active job descriptions (public endpoint for candidates)"""
    query = JobDescriptionDoc.is_active == is_active
    
    if experience_level:
        query = query & (JobDescriptionDoc.experience_level == experience_level)
    if employment_type:
        query = query & (JobDescriptionDoc.employment_type == employment_type)
    if location:
        query = query & RegEx(JobDescriptionDoc.location, location, "i")
    
    jobs = await JobDescriptionDoc.find(query).skip(skip).limit(limit).to_list()
    return jobs


@router.get("/jobs/{job_id}", response_model=JobDescriptionDoc)
async def get_job_description(job_id: str):
    """Get specific job description (public endpoint)"""
    try:
        job = await JobDescriptionDoc.get(PydanticObjectId(job_id))
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found")


@router.put("/jobs/{job_id}", response_model=JobDescriptionDoc)
async def update_job_description(
    job_id: str,
    job_update: JobDescriptionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update job description"""
    try:
        job = await JobDescriptionDoc.get(PydanticObjectId(job_id))
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check authorization
        if not ((current_user["user_type"] == "company" and current_user["user_id"] == str(job.company_id)) or
                (current_user["user_type"] == "company_user" and current_user.get("company_id") == str(job.company_id))):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        update_data = job_update.dict(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            await job.update({"$set": update_data})
        
        return await JobDescriptionDoc.get(job.id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found")


@router.delete("/jobs/{job_id}")
async def delete_job_description(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Soft delete job description (set is_active = False)"""
    try:
        job = await JobDescriptionDoc.get(PydanticObjectId(job_id))
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check authorization
        if not ((current_user["user_type"] == "company" and current_user["user_id"] == str(job.company_id)) or
                (current_user["user_type"] == "company_user" and current_user.get("company_id") == str(job.company_id))):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        await job.update({"$set": {"is_active": False, "updated_at": datetime.utcnow()}})
        return {"message": "Job description deactivated successfully"}
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found")
