from fastapi import APIRouter, Depends, HTTPException, Path, Query
from typing import List
from models.mongo import *
from beanie import PydanticObjectId
from datetime import datetime
from core.utility import *

router = APIRouter()


@router.post("/candidates/", response_model=CandidateDoc)
async def create_candidate(candidate: CandidateCreate):
    """Register a new candidate"""
    # Check if email already exists
    existing_candidate = await CandidateDoc.find_one(CandidateDoc.email == candidate.email)
    if existing_candidate:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    candidate_doc = CandidateDoc(**candidate.dict())
    await candidate_doc.insert()
    return candidate_doc

@router.get("/candidates/{candidate_id}", response_model=CandidateDoc)
async def get_candidate(
    candidate_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get candidate details"""
    try:
        candidate = await CandidateDoc.get(PydanticObjectId(candidate_id))
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return candidate
    except Exception:
        raise HTTPException(status_code=404, detail="Candidate not found")

@router.put("/candidates/{candidate_id}", response_model=CandidateDoc)
async def update_candidate(
    candidate_id: str,
    candidate_update: CandidateUpdate
):
    """Update candidate profile"""
    try:
        candidate = await CandidateDoc.get(PydanticObjectId(candidate_id))
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        update_data = candidate_update.dict(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            await candidate.update({"$set": update_data})
        
        return await CandidateDoc.get(candidate.id)
    except Exception:
        raise HTTPException(status_code=404, detail="Candidate not found")

@router.get("/candidates/", response_model=List[CandidateDoc])
async def list_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """List candidates (company users only)"""
    candidates = await CandidateDoc.find_all().skip(skip).limit(limit).to_list()
    return candidates


@router.get("/candidates/{candidate_id}/dashboard")
async def get_candidate_dashboard(candidate_id: str):
    """Get dashboard data for a candidate"""
    try:
        candidate = await CandidateDoc.get(PydanticObjectId(candidate_id))
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        candidate_oid = PydanticObjectId(candidate_id)
        
        # Get candidate's applications
        applications = await JobApplicationDoc.find(
            JobApplicationDoc.candidate_id == candidate_oid
        ).sort("-applied_at").to_list()
        
        # Get scheduled interviews
        scheduled_interviews = await InterviewDoc.find(
            InterviewDoc.candidate_id == candidate_oid,
            InterviewDoc.status.in_([InterviewStatus.SCHEDULED, InterviewStatus.IN_PROGRESS])
        ).sort("scheduled_at").to_list()
        
        # Get completed interviews with results
        completed_interviews = await InterviewDoc.find(
            InterviewDoc.candidate_id == candidate_oid,
            InterviewDoc.status == InterviewStatus.COMPLETED
        ).sort("-completed_at").limit(5).to_list()
        
        return {
            "candidate": candidate,
            "applications": applications,
            "scheduled_interviews": scheduled_interviews,
            "completed_interviews": completed_interviews,
            "generated_at": datetime.utcnow()
        }
    except Exception:
        raise HTTPException(status_code=404, detail="Candidate not found")
