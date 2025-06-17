from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum
import json

# ===== ENUMS =====
class CompanyType(str, Enum):
    STARTUP = "startup"
    ENTERPRISE = "enterprise"
    MID_SIZE = "mid_size"
    SMALL_BUSINESS = "small_business"

class SubscriptionPlan(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"

class UserRole(str, Enum):
    ADMIN = "admin"
    HR = "hr"
    INTERVIEWER = "interviewer"
    VIEWER = "viewer"

class EmploymentType(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERNSHIP = "internship"

class ExperienceLevel(str, Enum):
    ENTRY = "entry"
    MID = "mid"
    SENIOR = "senior"
    EXECUTIVE = "executive"

class ApplicationStatus(str, Enum):
    APPLIED = "applied"
    JD_SCREENED = "jd_screened"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    INTERVIEWED = "interviewed"
    SELECTED = "selected"
    REJECTED = "rejected"

class InterviewStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class InterviewType(str, Enum):
    AUTOMATED = "automated"
    MANUAL = "manual"
    HYBRID = "hybrid"

class QuestionType(str, Enum):
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    SITUATIONAL = "situational"

class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class Recommendation(str, Enum):
    HIRE = "hire"
    MAYBE = "maybe"
    REJECT = "reject"

class CompanyDecision(str, Enum):
    SELECTED = "selected"
    REJECTED = "rejected"
    ON_HOLD = "on_hold"

# ===== BASE MODELS =====
class BaseDBModel(BaseModel):
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

# ===== COMPANY MODELS =====
class CompanyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    size: Optional[int] = Field(None, ge=1)
    type: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    subscription_plan: SubscriptionPlan = SubscriptionPlan.FREE

class CompanyCreate(CompanyBase):
    password: str = Field(..., min_length=8)

class CompanyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    size: Optional[int] = Field(None, ge=1)
    type: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    # subscription_plan: Optional[SubscriptionPlan] = None

class Company(CompanyBase, BaseDBModel):
    id: str
    is_verified: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

# ===== COMPANY USER MODELS =====
class CompanyUserBase(BaseModel):
    company_id: str
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    role: UserRole
    permissions: Optional[Dict[str, Any]] = None
    is_active: bool = True

class CompanyUserCreate(CompanyUserBase):
    password: str = Field(..., min_length=8)
    created_by: Optional[str] = None

class CompanyUserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    permissions: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class CompanyUser(CompanyUserBase, BaseDBModel):
    id: str
    last_login: Optional[datetime] = None
    created_at: datetime
    created_by: Optional[str] = None

# ===== JOB DESCRIPTION MODELS =====
class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

# Updated JobDescriptionBase model
class JobDescriptionBase(BaseModel):
    role_title: str = Field(..., min_length=1, max_length=255)
    description: str
    skills: Optional[Dict[str, Any]] = None
    requirements: Optional[Dict[str, Any]] = None
    accuracy_threshold: float = Field(70.0, ge=0, le=100)
    salary_min: Optional[float] = Field(None, ge=0)
    salary_max: Optional[float] = Field(None, ge=0)
    location: Optional[str] = None
    employment_type: Optional[EmploymentType] = None
    experience_level: Optional[ExperienceLevel] = None
    is_active: bool = True
    
    # New fields from frontend
    difficulty: Optional[DifficultyLevel] = Field(DifficultyLevel.MEDIUM, description="AI assessment difficulty level")
    openings: Optional[int] = Field(1, ge=1, description="Number of job openings")
    duration: Optional[str] = Field(None, description="Job duration (for non-full-time positions)")
    perks: Optional[str] = Field(None, description="Job perks and benefits")
    responsibilities: Optional[str] = Field(None, description="Key job responsibilities")

    @validator('salary_max')
    def validate_salary_range(cls, v, values):
        if v is not None and 'salary_min' in values and values['salary_min'] is not None:
            if v < values['salary_min']:
                raise ValueError('salary_max must be greater than or equal to salary_min')
        return v
    
    @validator('duration')
    def validate_duration_for_non_fulltime(cls, v, values):
        """Validate that duration is provided for non-full-time positions"""
        employment_type = values.get('employment_type')
        if employment_type and employment_type != EmploymentType.FULL_TIME:
            if not v or v.strip() == "":
                raise ValueError('Duration is required for non-full-time positions')
        return v


class JobDescriptionCreate(JobDescriptionBase):
    # created_by: int
    pass

class JobDescriptionUpdate(BaseModel):
    role_title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    skills: Optional[Dict[str, Any]] = None
    requirements: Optional[Dict[str, Any]] = None
    accuracy_threshold: Optional[float] = Field(None, ge=0, le=100)
    salary_min: Optional[float] = Field(None, ge=0)
    salary_max: Optional[float] = Field(None, ge=0)
    location: Optional[str] = None
    employment_type: Optional[EmploymentType] = None
    experience_level: Optional[ExperienceLevel] = None
    is_active: Optional[bool] = None
    difficulty: Optional[str] = None
    openings: Optional[int] = Field(None, ge=0)
    duration: Optional[str] = None
    perks: Optional[str] = None
    responsibilities: Optional[str] = None

class JobDescription(JobDescriptionBase, BaseDBModel):
    id: str
    created_by: str
    applications_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

# ===== CANDIDATE MODELS =====
class CandidateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: Optional[str] = None
    resume_text: str
    resume_file_path: Optional[str] = None
    skills_extracted: Optional[Dict[str, Any]] = None
    experience_years: Optional[int] = Field(None, ge=0)
    current_location: Optional[str] = None
    preferred_location: Optional[str] = None
    expected_salary: Optional[float] = Field(None, ge=0)
    notice_period: Optional[int] = Field(None, ge=0)

class CandidateCreate(CandidateBase):
    pass

class CandidateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    resume_text: Optional[str] = None
    resume_file_path: Optional[str] = None
    skills_extracted: Optional[Dict[str, Any]] = None
    experience_years: Optional[int] = Field(None, ge=0)
    current_location: Optional[str] = None
    preferred_location: Optional[str] = None
    expected_salary: Optional[float] = Field(None, ge=0)
    notice_period: Optional[int] = Field(None, ge=0)

class Candidate(CandidateBase, BaseDBModel):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

# ===== JOB APPLICATION MODELS =====
class JobApplicationBase(BaseModel):
    candidate_id: str
    jd_id: str
    company_id: str
    application_status: ApplicationStatus = ApplicationStatus.APPLIED
    jd_match_score: Optional[float] = Field(None, ge=0, le=100)
    jd_analysis: Optional[Dict[str, Any]] = None
    jd_screening_passed: bool = False
    jd_screening_feedback: Optional[str] = None
    screened_by: Optional[int] = None

class JobApplicationCreate(BaseModel):
    candidate_id: str
    jd_id: str
    company_id: str

class JobApplicationUpdate(BaseModel):
    application_status: Optional[ApplicationStatus] = None
    jd_match_score: Optional[float] = Field(None, ge=0, le=100)
    jd_analysis: Optional[Dict[str, Any]] = None
    jd_screening_passed: Optional[bool] = None
    jd_screening_feedback: Optional[str] = None
    screened_by: Optional[int] = None

class JobApplication(JobApplicationBase, BaseDBModel):
    id: str
    applied_at: datetime
    last_updated: Optional[datetime] = None
    screened_at: Optional[datetime] = None

# ===== INTERVIEW MODELS =====
class InterviewBase(BaseModel):
    application_id: str
    candidate_id: str
    jd_id: str
    company_id: str
    interviewer_id: Optional[int] = None
    status: InterviewStatus = InterviewStatus.SCHEDULED
    interview_type: InterviewType = InterviewType.AUTOMATED
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=1)
    technical_score: Optional[float] = Field(None, ge=0, le=100)
    communication_score: Optional[float] = Field(None, ge=0, le=100)
    behavioral_score: Optional[float] = Field(None, ge=0, le=100)
    overall_score: Optional[float] = Field(None, ge=0, le=100)
    analysis: Optional[Dict[str, Any]] = None
    interview_summary: Optional[str] = None
    recommendation: Optional[Recommendation] = None
    company_decision: Optional[CompanyDecision] = None
    company_feedback: Optional[str] = None
    decision_made_by: Optional[int] = None
    summary_error: Optional[str] = None

class InterviewCreate(BaseModel):
    application_id: str
    candidate_id: str
    jd_id: str
    company_id: str
    interviewer_id: Optional[int] = None
    scheduled_at: datetime
    interview_type: InterviewType = InterviewType.AUTOMATED

class InterviewUpdate(BaseModel):
    status: Optional[InterviewStatus] = None
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=1)
    technical_score: Optional[float] = Field(None, ge=0, le=100)
    communication_score: Optional[float] = Field(None, ge=0, le=100)
    behavioral_score: Optional[float] = Field(None, ge=0, le=100)
    overall_score: Optional[float] = Field(None, ge=0, le=100)
    analysis: Optional[Dict[str, Any]] = None
    interview_summary: Optional[str] = None
    recommendation: Optional[Recommendation] = None
    company_decision: Optional[CompanyDecision] = None
    company_feedback: Optional[str] = None
    decision_made_by: Optional[int] = None
    summary_error: Optional[str] = None

class Interview(InterviewBase, BaseDBModel):
    id: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    decision_made_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

# ===== INTERVIEW QUESTION MODELS =====
class InterviewQuestionBase(BaseModel):
    interview_id: str
    sequence_no: int = Field(..., ge=1)
    question: str
    question_type: Optional[QuestionType] = None
    difficulty: Optional[Difficulty] = None
    is_followup: bool = False
    parent_question_id: Optional[int] = None

class InterviewQuestionCreate(InterviewQuestionBase):
    pass

class InterviewQuestionUpdate(BaseModel):
    sequence_no: Optional[int] = Field(None, ge=1)
    question: Optional[str] = None
    question_type: Optional[QuestionType] = None
    difficulty: Optional[Difficulty] = None
    is_followup: Optional[bool] = None
    parent_question_id: Optional[int] = None

class InterviewQuestion(InterviewQuestionBase, BaseDBModel):
    id: str
    asked_at: Optional[datetime] = None

# ===== INTERVIEW ANSWER MODELS =====
class InterviewAnswerBase(BaseModel):
    question_id: str
    interview_id: str
    answer: str
    audio_file_path: Optional[str] = None
    response_time_seconds: Optional[int] = Field(None, ge=0)
    confidence_score: Optional[float] = Field(None, ge=0, le=100)
    keywords_matched: Optional[Dict[str, Any]] = None

class InterviewAnswerCreate(InterviewAnswerBase):
    pass

class InterviewAnswerUpdate(BaseModel):
    answer: Optional[str] = None
    audio_file_path: Optional[str] = None
    response_time_seconds: Optional[int] = Field(None, ge=0)
    confidence_score: Optional[float] = Field(None, ge=0, le=100)
    keywords_matched: Optional[Dict[str, Any]] = None

class InterviewAnswer(InterviewAnswerBase, BaseDBModel):
    id: str
    answered_at: datetime

# ===== MESSAGE HISTORY MODELS =====
class MessageHistoryBase(BaseModel):
    interview_id: str
    sender_type: str  # "system", "candidate", "ai_interviewer"
    sender_id: Optional[int] = None
    message: str
    message_type: str  # "question", "answer", "system_notification", "instruction"
    audio_file_path: Optional[str] = None

class MessageHistoryCreate(MessageHistoryBase):
    pass

class MessageHistory(MessageHistoryBase, BaseDBModel):
    id: str
    sent_at: datetime

# ===== NOTIFICATION MODELS =====
class NotificationBase(BaseModel):
    recipient_type: str  # "candidate", "company_user"
    recipient_id: str
    type: str  # "interview_scheduled", "results_ready", "application_status", "jd_match"
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None
    is_read: bool = False
    sent_via: Optional[str] = None  # "email", "dashboard", "sms"

class NotificationCreate(NotificationBase):
    pass

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None

class Notification(NotificationBase, BaseDBModel):
    id: str
    created_at: datetime

# ===== EMAIL LOG MODELS =====
class EmailLogBase(BaseModel):
    recipient_email: EmailStr
    recipient_type: str  # "candidate", "company_user"
    recipient_id: str
    subject: str
    template_name: str
    data: Optional[Dict[str, Any]] = None
    status: str = "pending"  # "sent", "failed", "pending"
    error_message: Optional[str] = None

class EmailLogCreate(EmailLogBase):
    pass

class EmailLog(EmailLogBase, BaseDBModel):
    id: str
    sent_at: Optional[datetime] = None

# ===== PROCTOR LOG MODELS =====
class ProctorLogBase(BaseModel):
    interview_id: str
    candidate_id: str
    event_type: str  # "face_not_detected", "multiple_faces", "tab_switch", "window_switch"
    severity: str = "low"  # "low", "medium", "high", "critical"
    screenshot_path: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    auto_flagged: bool = False

class ProctorLogCreate(ProctorLogBase):
    pass

class ProctorLog(ProctorLogBase, BaseDBModel):
    id: str
    event_time: datetime

# ===== SYSTEM SETTINGS MODELS =====
class SystemSettingBase(BaseModel):
    company_id: str
    setting_key: str
    setting_value: str
    data_type: str = "string"  # "string", "number", "boolean", "json"
    updated_by: str

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSettingUpdate(BaseModel):
    setting_value: Optional[str] = None
    data_type: Optional[str] = None
    updated_by: Optional[int] = None

class SystemSetting(SystemSettingBase, BaseDBModel):
    id: str
    updated_at: datetime

# ===== SKILLS MASTER MODELS =====
class SkillsMasterBase(BaseModel):
    skill_name: str = Field(..., min_length=1, max_length=255)
    category: Optional[str] = None  # "technical", "soft", "domain"
    subcategory: Optional[str] = None
    synonyms: Optional[List[str]] = None
    importance_weight: float = Field(1.0, ge=0, le=10)

class SkillsMasterCreate(SkillsMasterBase):
    pass

class SkillsMasterUpdate(BaseModel):
    skill_name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = None
    subcategory: Optional[str] = None
    synonyms: Optional[List[str]] = None
    importance_weight: Optional[float] = Field(None, ge=0, le=10)

class SkillsMaster(SkillsMasterBase, BaseDBModel):
    id: str
    created_at: datetime

# ===== INTERVIEW ANALYTICS MODELS =====
class InterviewAnalyticsBase(BaseModel):
    company_id: str
    jd_id: str
    total_applications: int = 0
    jd_pass_rate: Optional[float] = Field(None, ge=0, le=100)
    avg_interview_score: Optional[float] = Field(None, ge=0, le=100)
    avg_interview_duration: Optional[int] = Field(None, ge=0)
    hire_rate: Optional[float] = Field(None, ge=0, le=100)
    period_start: datetime
    period_end: datetime

class InterviewAnalyticsCreate(InterviewAnalyticsBase):
    pass

class InterviewAnalytics(InterviewAnalyticsBase, BaseDBModel):
    id: str
    generated_at: datetime

# ===== API RESPONSE MODELS =====
class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    errors: Optional[List[str]] = None

class PaginatedResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: int
    page: int
    size: int
    pages: int

# ===== AUTHENTICATION MODELS =====
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_type: str  # "company", "company_user"
    user_data: Dict[str, Any]

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None
    user_type: Optional[str] = None