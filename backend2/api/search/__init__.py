from fastapi import APIRouter, Depends, HTTPException, Path, Query
from typing import List, Optional
from models.mongo import *
from beanie import PydanticObjectId, RegEx, In
from datetime import datetime
from core.utility import *


router = APIRouter()


@router.get("/search/candidates")
async def search_candidates(
    q: str = Query(..., min_length=3),
    skills: Optional[str] = Query(None),
    experience_min: Optional[int] = Query(None),
    location: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Search candidates based on various criteria"""
    query_conditions = []
    
    # Text search in name and resume
    query_conditions.append(RegEx(CandidateDoc.name, q, "i"))
    query_conditions.append(RegEx(CandidateDoc.resume_text, q, "i"))
    
    # Additional filters
    if skills:
        skill_list = [s.strip() for s in skills.split(",")]
        # This would require text indexing in production
        for skill in skill_list:
            query_conditions.append(RegEx(CandidateDoc.resume_text, skill, "i"))
    
    if experience_min:
        query_conditions.append(CandidateDoc.experience_years >= experience_min)
    
    if location:
        query_conditions.append(RegEx(CandidateDoc.current_location, location, "i"))
    
    # Combine conditions with OR for text search and AND for filters
    text_conditions = [RegEx(CandidateDoc.name, q, "i"), RegEx(CandidateDoc.resume_text, q, "i")]
    main_query = In(CandidateDoc.id, [])  # This would need proper text search implementation
    
    # For now, use simple text search - in production, use MongoDB text indexes
    candidates = await CandidateDoc.find(
        RegEx(CandidateDoc.resume_text, q, "i")
    ).skip(skip).limit(limit).to_list()
    
    return {"candidates": candidates, "total": len(candidates)}

@router.get("/search/jobs")
async def search_jobs(
    q: str = Query(..., min_length=3),
    location: Optional[str] = Query(None),
    experience_level: Optional[ExperienceLevel] = Query(None),
    employment_type: Optional[EmploymentType] = Query(None),
    salary_min: Optional[float] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50)
):
    """Search jobs based on various criteria"""
    query = JobDescriptionDoc.is_active == True
    
    # Text search in title and description
    text_query = (RegEx(JobDescriptionDoc.role_title, q, "i")) | (RegEx(JobDescriptionDoc.description, q, "i"))
    query = query & text_query
    
    # Additional filters
    if location:
        query = query & RegEx(JobDescriptionDoc.location, location, "i")
    
    if experience_level:
        query = query & (JobDescriptionDoc.experience_level == experience_level)
    
    if employment_type:
        query = query & (JobDescriptionDoc.employment_type == employment_type)
    
    if salary_min:
        query = query & (JobDescriptionDoc.salary_min >= salary_min)
    
    jobs = await JobDescriptionDoc.find(query).skip(skip).limit(limit).to_list()
    total = await JobDescriptionDoc.find(query).count()
    
    return {"jobs": jobs, "total": total}
