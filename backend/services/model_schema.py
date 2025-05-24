from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any


class MessageEntry(BaseModel):
    role: str  
    content: str  


class InterviewDataStorage(BaseModel):
    candidate_name: str
    candidate_email: str
    resume_text: str
    jd_id: str
    interview_questions: List[str]
    status: Optional[str] = "interview_scheduled"
    message_history: Optional[List[MessageEntry]] = None
    analysis: Optional[Dict[str, Any]] = None  # To store the summary result
    summary_error: Optional[str] = None  # To store error message if summary generation fails


class InterviewSummaryResponse(BaseModel):
    candidate_name: str
    candidate_email: str
    status: str
    analysis: Optional[Dict[str, Any]] = None
    summary_error: Optional[str] = None


class InterviewAnalysis(BaseModel):
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]


class ResumeAnalysisResult(BaseModel):
    candidate_name: str
    candidate_email: str
    interview_questions: List[str]


class JDCreate(BaseModel):
    domain: str
    jd_text: str