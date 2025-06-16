# backend/TP/lmao3.py
from fastapi import FastAPI, HTTPException, Depends, status, Query, Path
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, Document, Indexed, PydanticObjectId
from beanie.operators import In, RegEx
from typing import List, Optional, Dict, Any, Annotated
from datetime import datetime, timedelta
import bcrypt
import jwt
import os
from beanie import Indexed
from db.models.documents import *
from db.models.all_models import *  # Import all the Pydantic models from previous artifact
from fastapi.middleware.cors import CORSMiddleware
from config import load_env
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
# import db.mongo_db as mongoDB
# from modules import auth, company
env = load_env.Environment()
app = FastAPI(title="AI Interview Assistant API", root_path="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","*"],
    allow_credentials=True, 
    allow_methods=["*"],
    allow_headers=["*"],
)

# app.include_router(auth.router)
# app.include_router(company.router)

# ===== MONGODB DOCUMENT MODELS =====


security = HTTPBearer()
token = OAuth2PasswordBearer(tokenUrl="auth/login")

# ===== DATABASE CONNECTION =====
MONGODB_URL = env.MONGO_URI
DATABASE_NAME = env.DATABASE_NAME

@app.on_event("startup")
async def startup_event():
    """Initialize MongoDB connection and Beanie ODM"""
    client = AsyncIOMotorClient(MONGODB_URL)
    await init_beanie(
        database=client[DATABASE_NAME],
        document_models=[
            CompanyDoc, CompanyUserDoc, JobDescriptionDoc, CandidateDoc,
            JobApplicationDoc, InterviewDoc, InterviewQuestionDoc, InterviewAnswerDoc,
            MessageHistoryDoc, NotificationDoc, EmailLogDoc, ProctorLogDoc,
            SystemSettingDoc, SkillsMasterDoc, InterviewAnalyticsDoc
        ]
    )

# ===== UTILITY FUNCTIONS =====
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, "3GJpGVgA+PNPlP+yLU8tA7sN3k0GPDx6QA98vkdjSts=", algorithm="HS256")

# async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
#     """Decode JWT token and return current user info"""
#     try:
#         token = credentials.credentials
#         payload = jwt.decode(token, "3GJpGVgA+PNPlP+yLU8tA7sN3k0GPDx6QA98vkdjSts=", algorithms=["HS256"])
#         return payload
#     except jwt.PyJWTError:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Invalid authentication token"
#         )

async def get_current_user(token: str = Depends(token)):
    """Decode JWT token and return current user info"""
    try:
        payload = jwt.decode(token, "3GJpGVgA+PNPlP+yLU8tA7sN3k0GPDx6QA98vkdjSts=", algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ===== AUTHENTICATION ENDPOINTS =====
@app.post("/auth/login", response_model=LoginResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login for companies and company users"""
    # Try company login first
    company = await CompanyDoc.find_one(CompanyDoc.email == form_data.username)
    if company and verify_password(form_data.password, company.password_hash):
        token_data = {
            "user_id": str(company.id),
            "email": company.email,
            "user_type": "company"
        }
        access_token = create_access_token(token_data)
        return LoginResponse(
            access_token=access_token,
            expires_in=86400,
            user_type="company",
            user_data={"id": str(company.id), "name": company.name, "email": company.email}
        )
    
    # Try company user login
    user = await CompanyUserDoc.find_one(CompanyUserDoc.email == form_data.username)
    if user and verify_password(form_data.password, user.password_hash):
        token_data = {
            "user_id": str(user.id),
            "email": user.email,
            "user_type": "company_user",
            "company_id": str(user.company_id)
        }
        access_token = create_access_token(token_data)
        return LoginResponse(
            access_token=access_token,
            expires_in=86400,
            user_type="company_user",
            user_data={"id": str(user.id), "name": user.name, "email": user.email, "role": user.role}
        )
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

# ===== COMPANY ENDPOINTS =====
@app.post("/companies/", response_model=CompanyDoc)
async def create_company(company: CompanyCreate):
    """Register a new company"""
    # Check if email already exists
    existing_company = await CompanyDoc.find_one(CompanyDoc.email == company.email)
    if existing_company:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(company.password)
    company_doc = CompanyDoc(
        **company.dict(exclude={"password"}),
        password_hash=hashed_password
    )
    await company_doc.insert()
    return company_doc

@app.get("/companies/{company_id}", response_model=CompanyDoc)
async def get_company(
    company_id: str = Path(..., description="Company ID"),
    current_user: dict = Depends(get_current_user)
):
    """Get company details"""
    try:
        company = await CompanyDoc.get(PydanticObjectId(company_id))
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        return company
    except Exception:
        raise HTTPException(status_code=404, detail="Company not found")

@app.put("/companies/{company_id}", response_model=CompanyDoc)
async def update_company(
    company_id: str,
    company_update: CompanyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update company profile"""
    try:
        company = await CompanyDoc.get(PydanticObjectId(company_id))
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        # Check authorization
        if current_user["user_type"] != "company" or current_user["user_id"] != company_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        update_data = company_update.dict(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            await company.update({"$set": update_data})
        
        return await CompanyDoc.get(company.id)
    except Exception:
        raise HTTPException(status_code=403, detail="Company not found")

@app.get("/companies/", response_model=List[CompanyDoc])
async def list_companies(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    """List all companies"""
    companies = await CompanyDoc.find_all().skip(skip).limit(limit).to_list()
    return companies

# ===== COMPANY USER ENDPOINTS =====
@app.post("/companies/{company_id}/users/", response_model=CompanyUserDoc)
async def create_company_user(
    company_id: str,
    user: CompanyUserCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new company user"""
    # Check authorization
    if current_user["user_type"] == "company" and current_user["user_id"] == company_id:
        pass  # Company owner can create users
    elif current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id:
        # Check if current user is admin
        current_company_user = await CompanyUserDoc.get(PydanticObjectId(current_user["user_id"]))
        if not current_company_user or current_company_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only admins can create users")
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if email already exists
    existing_user = await CompanyUserDoc.find_one(CompanyUserDoc.email == user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(user.password)
    user_doc = CompanyUserDoc(
        **user.dict(exclude={"password", "company_id", "created_by"}),
        company_id=PydanticObjectId(company_id),
        password_hash=hashed_password,
        created_by=PydanticObjectId(current_user["user_id"]) if current_user["user_type"] == "company_user" else None
    )
    await user_doc.insert()
    return user_doc

@app.get("/companies/{company_id}/users/", response_model=List[CompanyUserDoc])
async def list_company_users(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """List all users in a company"""
    # Check authorization
    if (current_user["user_type"] == "company" and current_user["user_id"] == company_id) or \
       (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id):
        users = await CompanyUserDoc.find(CompanyUserDoc.company_id == PydanticObjectId(company_id)).to_list()
        return users
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

@app.get("/companies/{company_id}/users/{user_id}", response_model=CompanyUserDoc)
async def get_company_user(
    company_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific company user"""
    user = await CompanyUserDoc.find_one(
        CompanyUserDoc.id == PydanticObjectId(user_id),
        CompanyUserDoc.company_id == PydanticObjectId(company_id)
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/companies/{company_id}/users/{user_id}", response_model=CompanyUserDoc)
async def update_company_user(
    company_id: str,
    user_id: str,
    user_update: CompanyUserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update company user"""
    user = await CompanyUserDoc.find_one(
        CompanyUserDoc.id == PydanticObjectId(user_id),
        CompanyUserDoc.company_id == PydanticObjectId(company_id)
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check authorization
    if current_user["user_type"] == "company_user" and current_user["user_id"] == user_id:
        # Users can update their own profile (limited fields)
        allowed_fields = {"name", "email"}
        update_data = {k: v for k, v in user_update.dict(exclude_unset=True).items() if k in allowed_fields}
    else:
        # Admin can update all fields
        if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
                (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
            raise HTTPException(status_code=403, detail="Not authorized")
        update_data = user_update.dict(exclude_unset=True)
    
    if update_data:
        await user.update({"$set": update_data})
    
    return await CompanyUserDoc.get(user.id)

# ===== JOB DESCRIPTION ENDPOINTS =====
@app.post("/companies/{company_id}/jobs/", response_model=JobDescriptionDoc)
async def create_job_description(
    company_id: str,
    job: JobDescriptionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new job description"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    job_doc = JobDescriptionDoc(
        **job.dict(),
        company_id=PydanticObjectId(company_id),
        created_by=PydanticObjectId(current_user["user_id"])
    )
    await job_doc.insert()
    return job_doc

@app.get("/companies/{company_id}/jobs/", response_model=List[JobDescriptionDoc])
async def list_company_jobs(
    company_id: str,
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """List all jobs for a company"""
    query = JobDescriptionDoc.company_id == PydanticObjectId(company_id)
    
    if is_active is not None:
        query = query and (JobDescriptionDoc.is_active == is_active)
    
    jobs = await JobDescriptionDoc.find(query).skip(skip).limit(limit).to_list()
    return jobs

@app.get("/jobs/", response_model=List[JobDescriptionDoc])
async def list_all_jobs(
    is_active: bool = Query(True),
    experience_level: Optional[ExperienceLevel] = Query(None),
    employment_type: Optional[EmploymentType] = Query(None),
    location: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    """List all active job descriptions (public endpoint for candidates)"""
    query = JobDescriptionDoc.is_active == is_active
    
    if experience_level:
        query = query & (JobDescriptionDoc.experience_level == experience_level)
    if employment_type:
        query = query & (JobDescriptionDoc.employment_type == employment_type)
    if location:
        query = query & RegEx(JobDescriptionDoc.location, location, "i")
    
    jobs = await JobDescriptionDoc.find(query).skip(skip).limit(limit).to_list()
    return jobs

@app.get("/jobs/{job_id}", response_model=JobDescriptionDoc)
async def get_job_description(job_id: str):
    """Get specific job description (public endpoint)"""
    try:
        job = await JobDescriptionDoc.get(PydanticObjectId(job_id))
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found")

@app.put("/jobs/{job_id}", response_model=JobDescriptionDoc)
async def update_job_description(
    job_id: str,
    job_update: JobDescriptionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update job description"""
    try:
        job = await JobDescriptionDoc.get(PydanticObjectId(job_id))
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check authorization
        if not ((current_user["user_type"] == "company" and current_user["user_id"] == str(job.company_id)) or
                (current_user["user_type"] == "company_user" and current_user.get("company_id") == str(job.company_id))):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        update_data = job_update.dict(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            await job.update({"$set": update_data})
        
        return await JobDescriptionDoc.get(job.id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found")

@app.delete("/jobs/{job_id}")
async def delete_job_description(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Soft delete job description (set is_active = False)"""
    try:
        job = await JobDescriptionDoc.get(PydanticObjectId(job_id))
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check authorization
        if not ((current_user["user_type"] == "company" and current_user["user_id"] == str(job.company_id)) or
                (current_user["user_type"] == "company_user" and current_user.get("company_id") == str(job.company_id))):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        await job.update({"$set": {"is_active": False, "updated_at": datetime.utcnow()}})
        return {"message": "Job description deactivated successfully"}
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found")

# ===== CANDIDATE ENDPOINTS =====
@app.post("/candidates/", response_model=CandidateDoc)
async def create_candidate(candidate: CandidateCreate):
    """Register a new candidate"""
    # Check if email already exists
    existing_candidate = await CandidateDoc.find_one(CandidateDoc.email == candidate.email)
    if existing_candidate:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    candidate_doc = CandidateDoc(**candidate.dict())
    await candidate_doc.insert()
    return candidate_doc

@app.get("/candidates/{candidate_id}", response_model=CandidateDoc)
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

@app.put("/candidates/{candidate_id}", response_model=CandidateDoc)
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

@app.get("/candidates/", response_model=List[CandidateDoc])
async def list_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """List candidates (company users only)"""
    candidates = await CandidateDoc.find_all().skip(skip).limit(limit).to_list()
    return candidates

# ===== JOB APPLICATION ENDPOINTS =====
@app.post("/jobs/{job_id}/apply", response_model=JobApplicationDoc)
async def apply_for_job(
    job_id: str,
    application_data: dict  # Contains candidate_id
):
    """Apply for a job position"""
    try:
        job = await JobDescriptionDoc.get(PydanticObjectId(job_id))
        if not job or not job.is_active:
            raise HTTPException(status_code=404, detail="Job not found or inactive")
        
        candidate_id = application_data.get("candidate_id")
        candidate = await CandidateDoc.get(PydanticObjectId(candidate_id))
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Check if already applied
        existing_application = await JobApplicationDoc.find_one(
            JobApplicationDoc.candidate_id == PydanticObjectId(candidate_id),
            JobApplicationDoc.jd_id == PydanticObjectId(job_id)
        )
        if existing_application:
            raise HTTPException(status_code=400, detail="Already applied for this position")
        
        application_doc = JobApplicationDoc(
            candidate_id=PydanticObjectId(candidate_id),
            jd_id=PydanticObjectId(job_id),
            company_id=job.company_id
        )
        await application_doc.insert()
        
        # Update applications count
        await job.update({"$inc": {"applications_count": 1}})
        
        # TODO: Trigger JD matching analysis here
        
        return application_doc
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/companies/{company_id}/applications/", response_model=List[JobApplicationDoc])
async def list_company_applications(
    company_id: str,
    status: Optional[ApplicationStatus] = Query(None),
    jd_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """List applications for a company"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = JobApplicationDoc.company_id == PydanticObjectId(company_id)
    
    if status:
        query = query & (JobApplicationDoc.application_status == status)
    if jd_id:
        query = query & (JobApplicationDoc.jd_id == PydanticObjectId(jd_id))
    
    applications = await JobApplicationDoc.find(query).skip(skip).limit(limit).to_list()
    return applications

@app.get("/applications/{application_id}", response_model=JobApplicationDoc)
async def get_application(
    application_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific application"""
    try:
        application = await JobApplicationDoc.get(PydanticObjectId(application_id))
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        return application
    except Exception:
        raise HTTPException(status_code=404, detail="Application not found")

@app.put("/applications/{application_id}", response_model=JobApplicationDoc)
async def update_application(
    application_id: str,
    application_update: JobApplicationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update application (for JD screening, status changes)"""
    try:
        application = await JobApplicationDoc.get(PydanticObjectId(application_id))
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Check authorization
        if not ((current_user["user_type"] == "company" and current_user["user_id"] == str(application.company_id)) or
                (current_user["user_type"] == "company_user" and current_user.get("company_id") == str(application.company_id))):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        update_data = application_update.dict(exclude_unset=True)
        
        # Set screening details if status changed to screened
        if application_update.jd_screening_passed is not None:
            update_data["screened_at"] = datetime.utcnow()
            update_data["screened_by"] = PydanticObjectId(current_user["user_id"])
        
        if update_data:
            update_data["last_updated"] = datetime.utcnow()
            await application.update({"$set": update_data})
        
        return await JobApplicationDoc.get(application.id)
    except Exception:
        raise HTTPException(status_code=404, detail="Application not found")

# ===== INTERVIEW ENDPOINTS =====
@app.post("/applications/{application_id}/schedule-interview", response_model=InterviewDoc)
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

@app.get("/interviews/{interview_id}", response_model=InterviewDoc)
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

@app.put("/interviews/{interview_id}", response_model=InterviewDoc)
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

@app.get("/companies/{company_id}/interviews/", response_model=List[InterviewDoc])
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

# ===== INTERVIEW QUESTION ENDPOINTS =====
@app.post("/interviews/{interview_id}/questions/", response_model=InterviewQuestionDoc)
async def create_interview_question(
    interview_id: str,
    question: InterviewQuestionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a question to an interview"""
    try:
        interview = await InterviewDoc.get(PydanticObjectId(interview_id))
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        question_doc = InterviewQuestionDoc(
            **question.dict(),
            interview_id=PydanticObjectId(interview_id),
            parent_question_id=PydanticObjectId(question.parent_question_id) if question.parent_question_id else None,
            asked_at=datetime.utcnow()
        )
        await question_doc.insert()
        return question_doc
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/interviews/{interview_id}/questions/", response_model=List[InterviewQuestionDoc])
async def list_interview_questions(
    interview_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all questions for an interview"""
    questions = await InterviewQuestionDoc.find(
        InterviewQuestionDoc.interview_id == PydanticObjectId(interview_id)
    ).sort("sequence_no").to_list()
    return questions

# ===== INTERVIEW ANSWER ENDPOINTS =====
@app.post("/questions/{question_id}/answers/", response_model=InterviewAnswerDoc)
async def create_interview_answer(
    question_id: str,
    answer: InterviewAnswerCreate
):
    """Submit an answer to an interview question"""
    try:
        question = await InterviewQuestionDoc.get(PydanticObjectId(question_id))
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        answer_doc = InterviewAnswerDoc(
            **answer.dict(),
            question_id=PydanticObjectId(question_id),
            interview_id=question.interview_id
        )
        await answer_doc.insert()
        return answer_doc
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/interviews/{interview_id}/answers/", response_model=List[InterviewAnswerDoc])
async def list_interview_answers(
    interview_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all answers for an interview"""
    answers = await InterviewAnswerDoc.find(
        InterviewAnswerDoc.interview_id == PydanticObjectId(interview_id)
    ).to_list()
    return answers

# ===== MESSAGE HISTORY ENDPOINTS =====
@app.post("/interviews/{interview_id}/messages/", response_model=MessageHistoryDoc)
async def create_message(
    interview_id: str,
    message: MessageHistoryCreate
):
    """Add a message to interview history"""
    try:
        interview = await InterviewDoc.get(PydanticObjectId(interview_id))
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        message_doc = MessageHistoryDoc(
            **message.dict(),
            interview_id=PydanticObjectId(interview_id),
            sender_id=PydanticObjectId(message.sender_id) if message.sender_id else None
        )
        await message_doc.insert()
        return message_doc
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/interviews/{interview_id}/messages/", response_model=List[MessageHistoryDoc])
async def list_interview_messages(
    interview_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get message history for an interview"""
    messages = await MessageHistoryDoc.find(
        MessageHistoryDoc.interview_id == PydanticObjectId(interview_id)
    ).sort("sent_at").to_list()
    return messages

# ===== NOTIFICATION ENDPOINTS =====
@app.get("/notifications/", response_model=List[NotificationDoc])
async def list_notifications(
    is_read: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get notifications for current user"""
    recipient_type = "company" if current_user["user_type"] == "company" else "company_user"
    recipient_id = PydanticObjectId(current_user["user_id"])
    
    query = (NotificationDoc.recipient_type == recipient_type) & (NotificationDoc.recipient_id == recipient_id)
    
    if is_read is not None:
        query = query & (NotificationDoc.is_read == is_read)
    
    notifications = await NotificationDoc.find(query).sort("-created_at").skip(skip).limit(limit).to_list()
    return notifications

@app.put("/notifications/{notification_id}/read", response_model=NotificationDoc)
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark notification as read"""
    try:
        notification = await NotificationDoc.get(PydanticObjectId(notification_id))
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        # Check authorization
        recipient_type = "company" if current_user["user_type"] == "company" else "company_user"
        if notification.recipient_type != recipient_type or str(notification.recipient_id) != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        await notification.update({"$set": {"is_read": True}})
        return await NotificationDoc.get(notification.id)
    except Exception:
        raise HTTPException(status_code=404, detail="Notification not found")

@app.post("/notifications/", response_model=NotificationDoc)
async def create_notification(notification: NotificationCreate):
    """Create a new notification"""
    notification_doc = NotificationDoc(
        **notification.dict(),
        recipient_id=PydanticObjectId(notification.recipient_id)
    )
    await notification_doc.insert()
    return notification_doc

# ===== PROCTOR LOG ENDPOINTS =====
@app.post("/interviews/{interview_id}/proctor-logs/", response_model=ProctorLogDoc)
async def create_proctor_log(
    interview_id: str,
    log_data: ProctorLogCreate
):
    """Log a proctoring event during interview"""
    try:
        interview = await InterviewDoc.get(PydanticObjectId(interview_id))
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        log_doc = ProctorLogDoc(
            **log_data.dict(),
            interview_id=PydanticObjectId(interview_id),
            candidate_id=PydanticObjectId(log_data.candidate_id)
        )
        await log_doc.insert()
        return log_doc
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/interviews/{interview_id}/proctor-logs/", response_model=List[ProctorLogDoc])
async def list_proctor_logs(
    interview_id: str,
    event_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get proctoring logs for an interview"""
    query = ProctorLogDoc.interview_id == PydanticObjectId(interview_id)
    
    if event_type:
        query = query & (ProctorLogDoc.event_type == event_type)
    if severity:
        query = query & (ProctorLogDoc.severity == severity)
    
    logs = await ProctorLogDoc.find(query).sort("-event_time").to_list()
    return logs

# ===== SKILLS MASTER ENDPOINTS =====
@app.post("/skills/", response_model=SkillsMasterDoc)
async def create_skill(
    skill: SkillsMasterCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new skill in master list"""
    # Check if skill already exists
    existing_skill = await SkillsMasterDoc.find_one(SkillsMasterDoc.skill_name == skill.skill_name)
    if existing_skill:
        raise HTTPException(status_code=400, detail="Skill already exists")
    
    skill_doc = SkillsMasterDoc(**skill.dict())
    await skill_doc.insert()
    return skill_doc

@app.get("/skills/", response_model=List[SkillsMasterDoc])
async def list_skills(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """List skills from master list"""
    query = {}
    
    if category:
        query = SkillsMasterDoc.category == category
    if search:
        if query:
            query = query & RegEx(SkillsMasterDoc.skill_name, search, "i")
        else:
            query = RegEx(SkillsMasterDoc.skill_name, search, "i")
    
    if query:
        skills = await SkillsMasterDoc.find(query).skip(skip).limit(limit).to_list()
    else:
        skills = await SkillsMasterDoc.find_all().skip(skip).limit(limit).to_list()
    
    return skills

@app.get("/skills/{skill_id}", response_model=SkillsMasterDoc)
async def get_skill(skill_id: str):
    """Get specific skill"""
    try:
        skill = await SkillsMasterDoc.get(PydanticObjectId(skill_id))
        if not skill:
            raise HTTPException(status_code=404, detail="Skill not found")
        return skill
    except Exception:
        raise HTTPException(status_code=404, detail="Skill not found")

@app.put("/skills/{skill_id}", response_model=SkillsMasterDoc)
async def update_skill(
    skill_id: str,
    skill_update: SkillsMasterUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update skill in master list"""
    try:
        skill = await SkillsMasterDoc.get(PydanticObjectId(skill_id))
        if not skill:
            raise HTTPException(status_code=404, detail="Skill not found")
        
        update_data = skill_update.dict(exclude_unset=True)
        if update_data:
            await skill.update({"$set": update_data})
        
        return await SkillsMasterDoc.get(skill.id)
    except Exception:
        raise HTTPException(status_code=404, detail="Skill not found")

# ===== SYSTEM SETTINGS ENDPOINTS =====
@app.post("/companies/{company_id}/jobs/", response_model=JobDescriptionDoc)
async def create_job_description(
    company_id: str,
    job: JobDescriptionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new job description"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Additional validation for duration field
    if job.employment_type and job.employment_type != EmploymentType.FULL_TIME and not job.duration:
        raise HTTPException(
            status_code=400, 
            detail="Duration is required for non-full-time positions"
        )
    
    # Create job document with proper ObjectId conversion
    job_data = job.dict()
    job_doc = JobDescriptionDoc(
        **job_data,
        company_id=PydanticObjectId(company_id),
        created_by=PydanticObjectId(current_user["user_id"])
    )
    await job_doc.insert()
    return job_doc

@app.get("/companies/{company_id}/settings/", response_model=List[SystemSettingDoc])
async def list_company_settings(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all system settings for a company"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    settings = await SystemSettingDoc.find(
        SystemSettingDoc.company_id == PydanticObjectId(company_id)
    ).to_list()
    return settings

@app.get("/companies/{company_id}/settings/{setting_key}", response_model=SystemSettingDoc)
async def get_company_setting(
    company_id: str,
    setting_key: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific system setting for a company"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    setting = await SystemSettingDoc.find_one(
        SystemSettingDoc.company_id == PydanticObjectId(company_id),
        SystemSettingDoc.setting_key == setting_key
    )
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting

# ===== ANALYTICS ENDPOINTS =====
@app.get("/companies/{company_id}/analytics/overview")
async def get_company_analytics(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get company analytics overview"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    company_oid = PydanticObjectId(company_id)
    
    # Calculate analytics using MongoDB aggregation
    total_jobs = await JobDescriptionDoc.find(JobDescriptionDoc.company_id == company_oid).count()
    active_jobs = await JobDescriptionDoc.find(
        JobDescriptionDoc.company_id == company_oid,
        JobDescriptionDoc.is_active == True
    ).count()
    total_applications = await JobApplicationDoc.find(JobApplicationDoc.company_id == company_oid).count()
    total_interviews = await InterviewDoc.find(InterviewDoc.company_id == company_oid).count()
    
    # Get status breakdown for applications
    application_pipeline = [
        {"$match": {"company_id": company_oid}},
        {"$group": {"_id": "$application_status", "count": {"$sum": 1}}}
    ]
    application_stats = await JobApplicationDoc.aggregate(application_pipeline).to_list()
    
    # Get interview status breakdown
    interview_pipeline = [
        {"$match": {"company_id": company_oid}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    interview_stats = await InterviewDoc.aggregate(interview_pipeline).to_list()
    
    return {
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "total_applications": total_applications,
        "total_interviews": total_interviews,
        "application_stats": {stat["_id"]: stat["count"] for stat in application_stats},
        "interview_stats": {stat["_id"]: stat["count"] for stat in interview_stats},
        "generated_at": datetime.utcnow()
    }

@app.get("/companies/{company_id}/analytics/jd-performance")
async def get_jd_analytics(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get job description performance analytics"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    company_oid = PydanticObjectId(company_id)
    
    # Aggregation pipeline for JD performance
    pipeline = [
        {"$match": {"company_id": company_oid}},
        {
            "$lookup": {
                "from": "job_applications",
                "localField": "_id",
                "foreignField": "jd_id",
                "as": "applications"
            }
        },
        {
            "$lookup": {
                "from": "interviews",
                "localField": "_id",
                "foreignField": "jd_id",
                "as": "interviews"
            }
        },
        {
            "$project": {
                "role_title": 1,
                "created_at": 1,
                "is_active": 1,
                "applications_count": {"$size": "$applications"},
                "interviews_count": {"$size": "$interviews"},
                "selected_count": {
                    "$size": {
                        "$filter": {
                            "input": "$applications",
                            "cond": {"$eq": ["$this.application_status", "selected"]}
                        }
                    }
                }
            }
        }
    ]
    
    jd_performance = await JobDescriptionDoc.aggregate(pipeline).to_list()
    return {"jd_performance": jd_performance, "generated_at": datetime.utcnow()}

# ===== EMAIL LOG ENDPOINTS =====
@app.post("/email-logs/", response_model=EmailLogDoc)
async def create_email_log(email_log: EmailLogCreate):
    """Log an email send attempt"""
    email_doc = EmailLogDoc(
        **email_log.dict(),
        recipient_id=PydanticObjectId(email_log.recipient_id)
    )
    await email_doc.insert()
    return email_doc

@app.get("/email-logs/", response_model=List[EmailLogDoc])
async def list_email_logs(
    recipient_email: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """List email logs (admin only)"""
    query = {}
    
    if recipient_email:
        query = EmailLogDoc.recipient_email == recipient_email
    if status:
        if query:
            query = query & (EmailLogDoc.status == status)
        else:
            query = EmailLogDoc.status == status
    
    if query:
        logs = await EmailLogDoc.find(query).sort("-sent_at").skip(skip).limit(limit).to_list()
    else:
        logs = await EmailLogDoc.find_all().sort("-sent_at").skip(skip).limit(limit).to_list()
    
    return logs

# ===== BULK OPERATIONS =====
@app.post("/companies/{company_id}/bulk-invite-users")
async def bulk_invite_users(
    company_id: str,
    user_invites: List[Dict[str, Any]],
    current_user: dict = Depends(get_current_user)
):
    """Bulk invite multiple users to a company"""
    # Check authorization - only company admin
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    results = {"success": [], "failed": []}
    
    for invite in user_invites:
        try:
            # Check if email already exists
            existing_user = await CompanyUserDoc.find_one(CompanyUserDoc.email == invite["email"])
            if existing_user:
                results["failed"].append({"email": invite["email"], "reason": "Email already exists"})
                continue
            
            # Create temporary password
            temp_password = f"temp_{invite['email'].split('@')[0]}_123"
            hashed_password = hash_password(temp_password)
            
            user_doc = CompanyUserDoc(
                company_id=PydanticObjectId(company_id),
                name=invite["name"],
                email=invite["email"],
                role=invite.get("role", UserRole.VIEWER),
                password_hash=hashed_password,
                created_by=PydanticObjectId(current_user["user_id"])
            )
            await user_doc.insert()
            
            results["success"].append({
                "email": invite["email"],
                "user_id": str(user_doc.id),
                "temp_password": temp_password
            })
            
        except Exception as e:
            results["failed"].append({"email": invite["email"], "reason": str(e)})
    
    return results

# ===== SEARCH ENDPOINTS =====
@app.get("/search/candidates")
async def search_candidates(
    q: str = Query(..., min_length=3),
    skills: Optional[str] = Query(None),
    experience_min: Optional[int] = Query(None),
    location: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Search candidates based on various criteria"""
    query_conditions = []
    
    # Text search in name and resume
    query_conditions.append(RegEx(CandidateDoc.name, q, "i"))
    query_conditions.append(RegEx(CandidateDoc.resume_text, q, "i"))
    
    # Additional filters
    if skills:
        skill_list = [s.strip() for s in skills.split(",")]
        # This would require text indexing in production
        for skill in skill_list:
            query_conditions.append(RegEx(CandidateDoc.resume_text, skill, "i"))
    
    if experience_min:
        query_conditions.append(CandidateDoc.experience_years >= experience_min)
    
    if location:
        query_conditions.append(RegEx(CandidateDoc.current_location, location, "i"))
    
    # Combine conditions with OR for text search and AND for filters
    text_conditions = [RegEx(CandidateDoc.name, q, "i"), RegEx(CandidateDoc.resume_text, q, "i")]
    main_query = In(CandidateDoc.id, [])  # This would need proper text search implementation
    
    # For now, use simple text search - in production, use MongoDB text indexes
    candidates = await CandidateDoc.find(
        RegEx(CandidateDoc.resume_text, q, "i")
    ).skip(skip).limit(limit).to_list()
    
    return {"candidates": candidates, "total": len(candidates)}

@app.get("/search/jobs")
async def search_jobs(
    q: str = Query(..., min_length=3),
    location: Optional[str] = Query(None),
    experience_level: Optional[ExperienceLevel] = Query(None),
    employment_type: Optional[EmploymentType] = Query(None),
    salary_min: Optional[float] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50)
):
    """Search jobs based on various criteria"""
    query = JobDescriptionDoc.is_active == True
    
    # Text search in title and description
    text_query = (RegEx(JobDescriptionDoc.role_title, q, "i")) | (RegEx(JobDescriptionDoc.description, q, "i"))
    query = query & text_query
    
    # Additional filters
    if location:
        query = query & RegEx(JobDescriptionDoc.location, location, "i")
    
    if experience_level:
        query = query & (JobDescriptionDoc.experience_level == experience_level)
    
    if employment_type:
        query = query & (JobDescriptionDoc.employment_type == employment_type)
    
    if salary_min:
        query = query & (JobDescriptionDoc.salary_min >= salary_min)
    
    jobs = await JobDescriptionDoc.find(query).skip(skip).limit(limit).to_list()
    total = await JobDescriptionDoc.find(query).count()
    
    return {"jobs": jobs, "total": total}

# ===== DASHBOARD ENDPOINTS =====
@app.get("/companies/{company_id}/dashboard")
async def get_company_dashboard(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive dashboard data for a company"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    company_oid = PydanticObjectId(company_id)
    
    # Recent applications (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_applications = await JobApplicationDoc.find(
        JobApplicationDoc.company_id == company_oid,
        JobApplicationDoc.applied_at >= seven_days_ago
    ).sort("-applied_at").limit(10).to_list()
    
    # Pending interviews
    pending_interviews = await InterviewDoc.find(
        InterviewDoc.company_id == company_oid,
        InterviewDoc.status == InterviewStatus.SCHEDULED
    ).sort("scheduled_at").limit(5).to_list()
    
    # Recent notifications
    recipient_type = "company" if current_user["user_type"] == "company" else "company_user"
    recent_notifications = await NotificationDoc.find(
        NotificationDoc.recipient_type == recipient_type,
        NotificationDoc.recipient_id == PydanticObjectId(current_user["user_id"]),
        NotificationDoc.is_read == False
    ).sort("-created_at").limit(5).to_list()
    
    # Top performing jobs
    top_jobs_pipeline = [
        {"$match": {"company_id": company_oid, "is_active": True}},
        {"$sort": {"applications_count": -1}},
        {"$limit": 5},
        {"$project": {"role_title": 1, "applications_count": 1, "created_at": 1}}
    ]
    top_jobs = await JobDescriptionDoc.aggregate(top_jobs_pipeline).to_list()
    
    return {
        "recent_applications": recent_applications,
        "pending_interviews": pending_interviews,
        "recent_notifications": recent_notifications,
        "top_performing_jobs": top_jobs,
        "generated_at": datetime.utcnow()
    }

@app.get("/candidates/{candidate_id}/dashboard")
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

# ===== REPORTING ENDPOINTS =====
@app.get("/companies/{company_id}/reports/hiring-funnel")
async def get_hiring_funnel_report(
    company_id: str,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    jd_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get hiring funnel report for a company"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    company_oid = PydanticObjectId(company_id)
    match_conditions = {"company_id": company_oid}
    
    if start_date:
        match_conditions["applied_at"] = {"$gte": start_date}
    if end_date:
        if "applied_at" in match_conditions:
            match_conditions["applied_at"]["$lte"] = end_date
        else:
            match_conditions["applied_at"] = {"$lte": end_date}
    if jd_id:
        match_conditions["jd_id"] = PydanticObjectId(jd_id)
    
    # Hiring funnel pipeline
    pipeline = [
        {"$match": match_conditions},
        {
            "$group": {
                "_id": "$application_status",
                "count": {"$sum": 1}
            }
        }
    ]
    
    funnel_data = await JobApplicationDoc.aggregate(pipeline).to_list()
    
    # Convert to structured funnel
    status_order = ["applied", "jd_screened", "interview_scheduled", "interviewed", "selected", "rejected"]
    funnel = {}
    
    for status in status_order:
        funnel[status] = 0
    
    for item in funnel_data:
        if item["_id"] in funnel:
            funnel[item["_id"]] = item["count"]
    
    return {
        "funnel": funnel,
        "total_applications": sum(funnel.values()),
        "conversion_rates": {
            "jd_screening": (funnel["jd_screened"] / funnel["applied"] * 100) if funnel["applied"] > 0 else 0,
            "interview": (funnel["interview_scheduled"] / funnel["jd_screened"] * 100) if funnel["jd_screened"] > 0 else 0,
            "selection": (funnel["selected"] / funnel["interviewed"] * 100) if funnel["interviewed"] > 0 else 0
        },
        "generated_at": datetime.utcnow()
    }

@app.get("/companies/{company_id}/reports/interview-analytics")
async def get_interview_analytics_report(
    company_id: str,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get interview analytics report"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    company_oid = PydanticObjectId(company_id)
    match_conditions = {"company_id": company_oid, "status": "completed"}
    
    if start_date:
        match_conditions["completed_at"] = {"$gte": start_date}
    if end_date:
        if "completed_at" in match_conditions:
            match_conditions["completed_at"]["$lte"] = end_date
        else:
            match_conditions["completed_at"] = {"$lte": end_date}
    
    # Interview analytics pipeline
    pipeline = [
        {"$match": match_conditions},
        {
            "$group": {
                "_id": None,
                "total_interviews": {"$sum": 1},
                "avg_overall_score": {"$avg": "$overall_score"},
                "avg_technical_score": {"$avg": "$technical_score"},
                "avg_communication_score": {"$avg": "$communication_score"},
                "avg_behavioral_score": {"$avg": "$behavioral_score"},
                "avg_duration": {"$avg": "$duration_minutes"},
                "hire_recommendations": {
                    "$sum": {"$cond": [{"$eq": ["$recommendation", "hire"]}, 1, 0]}
                },
                "reject_recommendations": {
                    "$sum": {"$cond": [{"$eq": ["$recommendation", "reject"]}, 1, 0]}
                }
            }
        }
    ]
    
    analytics = await InterviewDoc.aggregate(pipeline).to_list()
    
    if not analytics:
        return {
            "message": "No completed interviews found",
            "generated_at": datetime.utcnow()
        }
    
    data = analytics[0]
    
    return {
        "total_interviews": data["total_interviews"],
        "average_scores": {
            "overall": round(data["avg_overall_score"] or 0, 2),
            "technical": round(data["avg_technical_score"] or 0, 2),
            "communication": round(data["avg_communication_score"] or 0, 2),
            "behavioral": round(data["avg_behavioral_score"] or 0, 2)
        },
        "average_duration_minutes": round(data["avg_duration"] or 0, 2),
        "recommendations": {
            "hire": data["hire_recommendations"],
            "reject": data["reject_recommendations"],
            "hire_rate": round((data["hire_recommendations"] / data["total_interviews"]) * 100, 2) if data["total_interviews"] > 0 else 0
        },
        "generated_at": datetime.utcnow()
    }

# ===== UTILITY ENDPOINTS =====
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "version": "1.0.0"
    }

@app.get("/companies/{company_id}/export/applications")
async def export_applications(
    company_id: str,
    format: str = Query("json", regex="^(json|csv)$"),
    status: Optional[ApplicationStatus] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Export applications data"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = JobApplicationDoc.company_id == PydanticObjectId(company_id)
    
    if status:
        query = query & (JobApplicationDoc.application_status == status)
    
    applications = await JobApplicationDoc.find(query).to_list()
    
    if format == "json":
        return {"applications": applications, "exported_at": datetime.utcnow()}
    else:
        # For CSV format, you would need to implement CSV serialization
        # This is a simplified response
        return {"message": "CSV export would be implemented here", "count": len(applications)}

# ===== WEBHOOK ENDPOINTS =====
@app.post("/webhooks/interview-completed")
async def interview_completed_webhook(webhook_data: dict):
    """Webhook for when an interview is completed (from interview system)"""
    try:
        interview_id = webhook_data.get("interview_id")
        scores = webhook_data.get("scores", {})
        analysis = webhook_data.get("analysis", {})
        
        if not interview_id:
            raise HTTPException(status_code=400, detail="Missing interview_id")
        
        interview = await InterviewDoc.get(PydanticObjectId(interview_id))
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        # Update interview with results
        update_data = {
            "status": InterviewStatus.COMPLETED,
            "completed_at": datetime.utcnow(),
            "technical_score": scores.get("technical"),
            "communication_score": scores.get("communication"),
            "behavioral_score": scores.get("behavioral"),
            "overall_score": scores.get("overall"),
            "analysis": analysis,
            "updated_at": datetime.utcnow()
        }
        
        await interview.update({"$set": update_data})
        
        # Update application status
        application = await JobApplicationDoc.get(interview.application_id)
        if application:
            await application.update({
                "$set": {
                    "application_status": ApplicationStatus.INTERVIEWED,
                    "last_updated": datetime.utcnow()
                }
            })
        
        # Create notification for company
        notification = NotificationDoc(
            recipient_type="company",
            recipient_id=interview.company_id,
            type="interview_completed",
            title="Interview Completed",
            message=f"Interview for candidate has been completed with overall score: {scores.get('overall', 'N/A')}",
            data={"interview_id": interview_id, "scores": scores}
        )
        await notification.insert()
        
        return {"message": "Interview results processed successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/webhooks/jd-analysis-completed")
async def jd_analysis_completed_webhook(webhook_data: dict):
    """Webhook for when JD matching analysis is completed"""
    try:
        application_id = webhook_data.get("application_id")
        match_score = webhook_data.get("match_score")
        analysis = webhook_data.get("analysis", {})
        
        if not application_id or match_score is None:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        application = await JobApplicationDoc.get(PydanticObjectId(application_id))
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Get JD to check threshold
        jd = await JobDescriptionDoc.get(application.jd_id)
        passed_threshold = match_score >= jd.accuracy_threshold if jd else False
        
        # Update application with JD analysis results
        update_data = {
            "jd_match_score": match_score,
            "jd_analysis": analysis,
            "jd_screening_passed": passed_threshold,
            "application_status": ApplicationStatus.JD_SCREENED,
            "last_updated": datetime.utcnow()
        }
        
        await application.update({"$set": update_data})
        
        # Create notification
        status_message = "passed" if passed_threshold else "did not pass"
        notification = NotificationDoc(
            recipient_type="company",
            recipient_id=application.company_id,
            type="jd_analysis_completed",
            title="JD Analysis Completed",
            message=f"Candidate {status_message} JD screening with score: {match_score}%",
            data={"application_id": application_id, "match_score": match_score, "passed": passed_threshold}
        )
        await notification.insert()
        
        return {"message": "JD analysis results processed successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ===== FILE UPLOAD ENDPOINTS =====
@app.post("/candidates/{candidate_id}/upload-resume")
async def upload_resume(
    candidate_id: str,
    file_data: dict  # In a real implementation, this would be a file upload
):
    """Upload resume file for candidate"""
    try:
        candidate = await CandidateDoc.get(PydanticObjectId(candidate_id))
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # In a real implementation, you would:
        # 1. Save the file to storage (S3, local filesystem, etc.)
        # 2. Extract text from the resume using libraries like PyPDF2, python-docx
        # 3. Update the candidate record with file path and extracted text
        
        file_path = file_data.get("file_path", f"/resumes/{candidate_id}_resume.pdf")
        resume_text = file_data.get("extracted_text", "")
        
        await candidate.update({
            "$set": {
                "resume_file_path": file_path,
                "resume_text": resume_text,
                "updated_at": datetime.utcnow()
            }
        })
        
        return {"message": "Resume uploaded successfully", "file_path": file_path}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)