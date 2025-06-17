from fastapi import APIRouter, Depends, HTTPException, Path, Query
from typing import List
from models.mongo import *
from beanie import PydanticObjectId
from datetime import datetime
from core.utility import *

router = APIRouter()


@router.post("/applications/{application_id}/schedule-interview", response_model=InterviewDoc)
async def schedule_interview(
    application_id: str,
    interview_data: InterviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """Schedule an interview for an application"""
    try:
        application = await JobApplicationDoc.get(PydanticObjectId(application_id))
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Check authorization
        if not ((current_user["user_type"] == "company" and current_user["user_id"] == str(application.company_id)) or
                (current_user["user_type"] == "company_user" and current_user.get("company_id") == str(application.company_id))):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Check if already has an interview
        existing_interview = await InterviewDoc.find_one(InterviewDoc.application_id == PydanticObjectId(application_id))
        if existing_interview:
            raise HTTPException(status_code=400, detail="Interview already scheduled for this application")
        
        interview_doc = InterviewDoc(
            application_id=PydanticObjectId(application_id),
            candidate_id=application.candidate_id,
            jd_id=application.jd_id,
            company_id=application.company_id,
            interviewer_id=PydanticObjectId(interview_data.interviewer_id) if interview_data.interviewer_id else None,
            scheduled_at=interview_data.scheduled_at,
            interview_type=interview_data.interview_type
        )
        await interview_doc.insert()
        
        # Update application status
        await application.update({
            "$set": {
                "application_status": ApplicationStatus.INTERVIEW_SCHEDULED,
                "last_updated": datetime.utcnow()
            }
        })
        
        return interview_doc
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/interviews/{interview_id}", response_model=InterviewDoc)
async def get_interview(
    interview_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get interview details"""
    try:
        interview = await InterviewDoc.get(PydanticObjectId(interview_id))
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        return interview
    except Exception:
        raise HTTPException(status_code=404, detail="Interview not found")


@router.put("/interviews/{interview_id}", response_model=InterviewDoc)
async def update_interview(
    interview_id: str,
    interview_update: InterviewUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update interview (status, scores, analysis, company decision)"""
    try:
        interview = await InterviewDoc.get(PydanticObjectId(interview_id))
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        update_data = interview_update.dict(exclude_unset=True)
        
        # Set decision timestamp if company decision is made
        if interview_update.company_decision is not None:
            update_data["decision_made_at"] = datetime.utcnow()
            update_data["decision_made_by"] = PydanticObjectId(current_user["user_id"])
            
            # Update application status based on company decision
            application = await JobApplicationDoc.get(interview.application_id)
            if application:
                application_update = {"last_updated": datetime.utcnow()}
                if interview_update.company_decision == CompanyDecision.SELECTED:
                    application_update["application_status"] = ApplicationStatus.SELECTED
                elif interview_update.company_decision == CompanyDecision.REJECTED:
                    application_update["application_status"] = ApplicationStatus.REJECTED
                await application.update({"$set": application_update})
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            await interview.update({"$set": update_data})
        
        return await InterviewDoc.get(interview.id)
    except Exception:
        raise HTTPException(status_code=404, detail="Interview not found")


@router.get("/companies/{company_id}/interviews/", response_model=List[InterviewDoc])
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
    
    query = InterviewDoc.company_id == PydanticObjectId(company_id)
    
    if status:
        query = query & (InterviewDoc.status == status)
    
    interviews = await InterviewDoc.find(query).skip(skip).limit(limit).to_list()
    return interviews
