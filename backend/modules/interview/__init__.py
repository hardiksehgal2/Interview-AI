from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import db.mongo_db as mongoDB
from db.models.all_models import *
from modules.auth import get_current_user

router = APIRouter(tags=["interviews"])

@router.post("/applications/{application_id}/schedule-interview")
async def schedule_interview(
    application_id: str,
    interview_data: InterviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """Schedule an interview for an application"""
    # Validate application exists
    application = await mongoDB.get_application_for_interview(application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == str(application.company_id)) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == str(application.company_id))):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if already has an interview
    existing_interview = await mongoDB.find_existing_interview(application_id)
    if existing_interview:
        raise HTTPException(status_code=400, detail="Interview already scheduled for this application")
    
    # Create interview
    interview = await mongoDB.create_interview(
        application_id=application_id,
        candidate_id=str(application.candidate_id),
        jd_id=str(application.jd_id),
        company_id=str(application.company_id),
        interviewer_id=interview_data.interviewer_id,
        scheduled_at=interview_data.scheduled_at,
        interview_type=interview_data.interview_type
    )
    
    # Update application status
    await mongoDB.update_application_status_for_interview(application_id)
    
    return interview

@router.get("/interviews/{interview_id}")
async def get_interview(
    interview_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get interview details"""
    interview = await mongoDB.get_interview_by_id(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview

@router.put("/interviews/{interview_id}")
async def update_interview(
    interview_id: str,
    interview_update: InterviewUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update interview (status, scores, analysis, company decision)"""
    interview = await mongoDB.get_interview_by_id(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Check authorization
    if not await mongoDB.check_interview_authorization(interview, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = interview_update.dict(exclude_unset=True)
    
    updated_interview = await mongoDB.update_interview_by_id(
        interview_id,
        update_data,
        current_user["user_id"],
        interview_update.company_decision
    )
    
    if not updated_interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    return updated_interview

@router.get("/companies/{company_id}/interviews/")
async def list_company_interviews(
    company_id: str,
    status: Optional[InterviewStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """List interviews for a company"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return await mongoDB.list_company_interviews(company_id, status, skip, limit)

# ===== INTERVIEW QUESTION ENDPOINTS =====
@router.post("/interviews/{interview_id}/questions/")
async def create_interview_question(
    interview_id: str,
    question: InterviewQuestionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a question to an interview"""
    interview = await mongoDB.get_interview_by_id(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    return await mongoDB.create_interview_question(
        interview_id,
        question.dict(exclude={"parent_question_id"}),
        question.parent_question_id
    )

@router.get("/interviews/{interview_id}/questions/")
async def list_interview_questions(
    interview_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all questions for an interview"""
    return await mongoDB.list_interview_questions(interview_id)

# ===== INTERVIEW ANSWER ENDPOINTS =====
@router.post("/questions/{question_id}/answers/")
async def create_interview_answer(
    question_id: str,
    answer: InterviewAnswerCreate
):
    """Submit an answer to an interview question"""
    question = await mongoDB.get_question_for_answer(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return await mongoDB.create_interview_answer(
        question_id,
        answer.dict(),
        str(question.interview_id)
    )

@router.get("/interviews/{interview_id}/answers/")
async def list_interview_answers(
    interview_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all answers for an interview"""
    return await mongoDB.list_interview_answers(interview_id)