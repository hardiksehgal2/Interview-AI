from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List
import db.mongo_db as mongoDB
from db.models.all_models import *
from modules.auth import get_current_user

router = APIRouter(prefix="/candidates", tags=["candidates"])

@router.post("/")
async def create_candidate(candidate: CandidateCreate):
    """Register a new candidate"""
    existing_candidate = await mongoDB.find_candidate_by_email(candidate.email)
    if existing_candidate:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    return await mongoDB.create_candidate(candidate.dict())

@router.get("/{candidate_id}")
async def get_candidate(
    candidate_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get candidate details"""
    candidate = await mongoDB.get_candidate_by_id(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate

@router.put("/{candidate_id}")
async def update_candidate(
    candidate_id: str,
    candidate_update: CandidateUpdate
):
    """Update candidate profile"""
    candidate = await mongoDB.get_candidate_by_id(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    updated_candidate = await mongoDB.update_candidate_by_id(
        candidate_id, 
        candidate_update.dict(exclude_unset=True)
    )
    
    if not updated_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return updated_candidate

@router.get("/")
async def list_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """List candidates (company users only)"""
    return await mongoDB.list_all_candidates(skip, limit)