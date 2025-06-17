from datetime import datetime
from typing import Optional, List, Annotated
from pydantic import PydanticObjectId
from beanie import Indexed, PydanticObjectId, Document
from .all_models import *


class CompanyDoc(Document, CompanyBase):
    id: Optional[PydanticObjectId] = None
    email: Annotated[str, Indexed(unique=True)]
    password_hash: str
    is_verified: bool = False
    created_at: datetime = datetime.utcnow()
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "companies"

class CompanyUserDoc(Document, CompanyUserBase):
    id: Optional[PydanticObjectId] = None
    company_id: PydanticObjectId
    email: Annotated[str, Indexed(unique=True)]
    password_hash: str
    last_login: Optional[datetime] = None
    created_at: datetime = datetime.utcnow()
    created_by: Optional[PydanticObjectId] = None
    
    class Settings:
        name = "company_users"
        indexes = [
            [("company_id", 1)],
        ]

class JobDescriptionDoc(Document, JobDescriptionBase):
    id: Optional[PydanticObjectId] = None
    company_id: PydanticObjectId
    created_by: PydanticObjectId
    applications_count: int = 0
    created_at: datetime = datetime.utcnow()
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "job_descriptions"
        indexes = [
            [("company_id", 1)],
            [("is_active", 1)],
            [("experience_level", 1)],
            [("employment_type", 1)],
            [("difficulty", 1)],  # Add index for new difficulty field
            [("created_at", -1)],  # Add index for sorting by creation date
        ]


class CandidateDoc(Document, CandidateBase):
    id: Optional[PydanticObjectId] = None
    email: Annotated[str, Indexed(unique=True)]
    created_at: datetime = datetime.utcnow()
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "candidates"

class JobApplicationDoc(Document, JobApplicationBase):
    id: Optional[PydanticObjectId] = None
    candidate_id: PydanticObjectId
    jd_id: PydanticObjectId
    company_id: PydanticObjectId
    applied_at: datetime = datetime.utcnow()
    last_updated: Optional[datetime] = None
    screened_at: Optional[datetime] = None
    screened_by: Optional[PydanticObjectId] = None
    
    class Settings:
        name = "job_applications"
        indexes = [
            [("candidate_id", 1), ("jd_id", 1)],  # Compound index for uniqueness
            [("company_id", 1)],
            [("application_status", 1)],
        ]

class InterviewDoc(Document, InterviewBase):
    id: Optional[PydanticObjectId] = None
    application_id: PydanticObjectId
    candidate_id: PydanticObjectId
    jd_id: PydanticObjectId
    company_id: PydanticObjectId
    interviewer_id: Optional[PydanticObjectId] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    decision_made_at: Optional[datetime] = None
    decision_made_by: Optional[PydanticObjectId] = None
    created_at: datetime = datetime.utcnow()
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "interviews"
        indexes = [
            [("application_id", 1)],
            [("company_id", 1)],
            [("status", 1)],
            [("scheduled_at", 1)],
        ]

class InterviewQuestionDoc(Document, InterviewQuestionBase):
    id: Optional[PydanticObjectId] = None
    interview_id: PydanticObjectId
    parent_question_id: Optional[PydanticObjectId] = None
    asked_at: Optional[datetime] = None
    
    class Settings:
        name = "interview_questions"
        indexes = [
            [("interview_id", 1), ("sequence_no", 1)],
        ]

class InterviewAnswerDoc(Document, InterviewAnswerBase):
    id: Optional[PydanticObjectId] = None
    question_id: PydanticObjectId
    interview_id: PydanticObjectId
    answered_at: datetime = datetime.utcnow()
    
    class Settings:
        name = "interview_answers"
        indexes = [
            [("interview_id", 1)],
            [("question_id", 1)],
        ]

class MessageHistoryDoc(Document, MessageHistoryBase):
    id: Optional[PydanticObjectId] = None
    interview_id: PydanticObjectId
    sender_id: Optional[PydanticObjectId] = None
    sent_at: datetime = datetime.utcnow()
    
    class Settings:
        name = "message_history"
        indexes = [
            [("interview_id", 1), ("sent_at", 1)],
        ]

class NotificationDoc(Document, NotificationBase):
    id: Optional[PydanticObjectId] = None
    recipient_id: PydanticObjectId
    created_at: datetime = datetime.utcnow()
    
    class Settings:
        name = "notifications"
        indexes = [
            [("recipient_type", 1), ("recipient_id", 1)],
            [("is_read", 1)],
            [("created_at", -1)],
        ]

class EmailLogDoc(Document, EmailLogBase):
    id: Optional[PydanticObjectId] = None
    recipient_id: PydanticObjectId
    sent_at: Optional[datetime] = None
    
    class Settings:
        name = "email_logs"

class ProctorLogDoc(Document, ProctorLogBase):
    id: Optional[PydanticObjectId] = None
    interview_id: PydanticObjectId
    candidate_id: PydanticObjectId
    event_time: datetime = datetime.utcnow()
    
    class Settings:
        name = "proctor_logs"
        indexes = [
            [("interview_id", 1), ("event_time", 1)],
            [("event_type", 1)],
        ]

class SystemSettingDoc(Document, SystemSettingBase):
    id: Optional[PydanticObjectId] = None
    company_id: PydanticObjectId
    updated_by: PydanticObjectId
    updated_at: datetime = datetime.utcnow()
    
    class Settings:
        name = "system_settings"
        indexes = [
            [("company_id", 1), ("setting_key", 1)],
        ]

class SkillsMasterDoc(Document, SkillsMasterBase):
    id: Optional[PydanticObjectId] = None
    skill_name: Annotated[str, Indexed(unique=True)]
    created_at: datetime = datetime.utcnow()
    
    class Settings:
        name = "skills_master"
        indexes = [
            [("category", 1)],
        ]

class InterviewAnalyticsDoc(Document, InterviewAnalyticsBase):
    id: Optional[PydanticObjectId] = None
    company_id: PydanticObjectId
    jd_id: PydanticObjectId
    generated_at: datetime = datetime.utcnow()
    
    class Settings:
        name = "interview_analytics"