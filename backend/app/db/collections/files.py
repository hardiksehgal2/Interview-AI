# backend/app/db/collections/files.py
from pydantic import Field, BaseModel
from typing import Optional
from ..db import database
from pymongo.asynchronous.collection import AsyncCollection

class FieldSchema(BaseModel):
    name:str = Field(...,description="Name of candidate")
    email:str = Field(...,description="Email of candidate")
    resume:str = Field(...,description="Resume of candidate")
    job_description:str = Field(...,description="job description of Job")
    status: Optional[str] = Field(None, description="Status of the candidate")
    jd_summary: Optional[str] = Field(None, description="Summary of JD")
    resume_match_result: Optional[str] = Field(None, description="Result of Candidate")
    interview_questions: Optional[str] = Field(None, description="Questions generated for the Candidate")



COLLECTION_NAME = "candidate_information"
files_collection:AsyncCollection = database[COLLECTION_NAME]
    