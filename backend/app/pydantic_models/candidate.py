# backend/app/pydantic/pydantic.py
from pydantic import BaseModel
from typing import Optional

class CandidateInfo(BaseModel):
    name: str
    email: str
    resume: str
    job_description: str
    status: Optional[str] = None
