# backend/model_schema.py
from pydantic import BaseModel, EmailStr
from typing import List, Optional

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



class ResumeAnalysisResult(BaseModel):
    candidate_name: str
    candidate_email: str
    interview_questions: List[str]


class JDCreate(BaseModel):
    domain: str
    jd_text: str