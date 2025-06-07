from fastapi import FastAPI, HTTPException, Depends, status, Query, Path
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, JSON, Decimal, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import bcrypt
import jwt
from models import *  # Import all the Pydantic models from previous artifact

# ===== DATABASE SETUP =====
DATABASE_URL = "postgresql://username:password@localhost/interview_system"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ===== FASTAPI SETUP =====
app = FastAPI(title="Interview System API", version="1.0.0")
security = HTTPBearer()

# ===== DEPENDENCY FUNCTIONS =====
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Decode JWT token and return current user info"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, "SECRET_KEY", algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, "SECRET_KEY", algorithm="HS256")

# ===== AUTHENTICATION ENDPOINTS =====
@app.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Login for companies and company users"""
    # Try company login first
    company = db.query(Company).filter(Company.email == login_data.email).first()
    if company and verify_password(login_data.password, company.password_hash):
        token_data = {
            "user_id": company.id,
            "email": company.email,
            "user_type": "company"
        }
        access_token = create_access_token(token_data)
        return LoginResponse(
            access_token=access_token,
            expires_in=86400,
            user_type="company",
            user_data={"id": company.id, "name": company.name, "email": company.email}
        )
    
    # Try company user login
    user = db.query(CompanyUser).filter(CompanyUser.email == login_data.email).first()
    if user and verify_password(login_data.password, user.password_hash):
        token_data = {
            "user_id": user.id,
            "email": user.email,
            "user_type": "company_user",
            "company_id": user.company_id
        }
        access_token = create_access_token(token_data)
        return LoginResponse(
            access_token=access_token,
            expires_in=86400,
            user_type="company_user",
            user_data={"id": user.id, "name": user.name, "email": user.email, "role": user.role}
        )
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

# ===== COMPANY ENDPOINTS =====
@app.post("/companies/", response_model=Company)
async def create_company(company: CompanyCreate, db: Session = Depends(get_db)):
    """Register a new company"""
    # Check if email already exists
    if db.query(Company).filter(Company.email == company.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(company.password)
    db_company = Company(
        **company.dict(exclude={"password"}),
        password_hash=hashed_password,
        created_at=datetime.utcnow()
    )
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

@app.get("/companies/{company_id}", response_model=Company)
async def get_company(
    company_id: int = Path(..., description="Company ID"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get company details"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@app.put("/companies/{company_id}", response_model=Company)
async def update_company(
    company_id: int,
    company_update: CompanyUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update company profile"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Check authorization
    if current_user["user_type"] != "company" or current_user["user_id"] != company_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for field, value in company_update.dict(exclude_unset=True).items():
        setattr(company, field, value)
    
    company.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(company)
    return company

@app.get("/companies/", response_model=List[Company])
async def list_companies(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List all companies (admin only)"""
    companies = db.query(Company).offset(skip).limit(limit).all()
    return companies

# ===== COMPANY USER ENDPOINTS =====
@app.post("/companies/{company_id}/users/", response_model=CompanyUser)
async def create_company_user(
    company_id: int,
    user: CompanyUserCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new company user (admin only)"""
    # Check authorization - only company admin or company owner
    if current_user["user_type"] == "company" and current_user["user_id"] == company_id:
        pass  # Company owner can create users
    elif current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id:
        # Check if current user is admin
        current_company_user = db.query(CompanyUser).filter(CompanyUser.id == current_user["user_id"]).first()
        if not current_company_user or current_company_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only admins can create users")
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if email already exists
    if db.query(CompanyUser).filter(CompanyUser.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(user.password)
    db_user = CompanyUser(
        **user.dict(exclude={"password"}),
        company_id=company_id,
        password_hash=hashed_password,
        created_by=current_user["user_id"],
        created_at=datetime.utcnow()
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/companies/{company_id}/users/", response_model=List[CompanyUser])
async def list_company_users(
    company_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all users in a company"""
    # Check authorization
    if (current_user["user_type"] == "company" and current_user["user_id"] == company_id) or \
       (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id):
        users = db.query(CompanyUser).filter(CompanyUser.company_id == company_id).all()
        return users
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

@app.get("/companies/{company_id}/users/{user_id}", response_model=CompanyUser)
async def get_company_user(
    company_id: int,
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific company user"""
    user = db.query(CompanyUser).filter(
        CompanyUser.id == user_id,
        CompanyUser.company_id == company_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/companies/{company_id}/users/{user_id}", response_model=CompanyUser)
async def update_company_user(
    company_id: int,
    user_id: int,
    user_update: CompanyUserUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update company user"""
    user = db.query(CompanyUser).filter(
        CompanyUser.id == user_id,
        CompanyUser.company_id == company_id
    ).first()
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
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user

# ===== JOB DESCRIPTION ENDPOINTS =====
@app.post("/companies/{company_id}/jobs/", response_model=JobDescription)
async def create_job_description(
    company_id: int,
    job: JobDescriptionCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new job description"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_job = JobDescription(
        **job.dict(),
        company_id=company_id,
        created_at=datetime.utcnow()
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@app.get("/companies/{company_id}/jobs/", response_model=List[JobDescription])
async def list_company_jobs(
    company_id: int,
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all jobs for a company"""
    query = db.query(JobDescription).filter(JobDescription.company_id == company_id)
    
    if is_active is not None:
        query = query.filter(JobDescription.is_active == is_active)
    
    jobs = query.offset(skip).limit(limit).all()
    return jobs

@app.get("/jobs/", response_model=List[JobDescription])
async def list_all_jobs(
    is_active: bool = Query(True),
    experience_level: Optional[ExperienceLevel] = Query(None),
    employment_type: Optional[EmploymentType] = Query(None),
    location: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List all active job descriptions (public endpoint for candidates)"""
    query = db.query(JobDescription).filter(JobDescription.is_active == is_active)
    
    if experience_level:
        query = query.filter(JobDescription.experience_level == experience_level)
    if employment_type:
        query = query.filter(JobDescription.employment_type == employment_type)
    if location:
        query = query.filter(JobDescription.location.ilike(f"%{location}%"))
    
    jobs = query.offset(skip).limit(limit).all()
    return jobs

@app.get("/jobs/{job_id}", response_model=JobDescription)
async def get_job_description(
    job_id: int,
    db: Session = Depends(get_db)
):
    """Get specific job description (public endpoint)"""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.put("/jobs/{job_id}", response_model=JobDescription)
async def update_job_description(
    job_id: int,
    job_update: JobDescriptionUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update job description"""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == job.company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == job.company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for field, value in job_update.dict(exclude_unset=True).items():
        setattr(job, field, value)
    
    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)
    return job

@app.delete("/jobs/{job_id}")
async def delete_job_description(
    job_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soft delete job description (set is_active = False)"""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == job.company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == job.company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    job.is_active = False
    job.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Job description deactivated successfully"}

# ===== CANDIDATE ENDPOINTS =====
@app.post("/candidates/", response_model=Candidate)
async def create_candidate(candidate: CandidateCreate, db: Session = Depends(get_db)):
    """Register a new candidate"""
    # Check if email already exists
    if db.query(Candidate).filter(Candidate.email == candidate.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_candidate = Candidate(
        **candidate.dict(),
        created_at=datetime.utcnow()
    )
    db.add(db_candidate)
    db.commit()
    db.refresh(db_candidate)
    return db_candidate

@app.get("/candidates/{candidate_id}", response_model=Candidate)
async def get_candidate(
    candidate_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get candidate details"""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate

@app.put("/candidates/{candidate_id}", response_model=Candidate)
async def update_candidate(
    candidate_id: int,
    candidate_update: CandidateUpdate,
    db: Session = Depends(get_db)
):
    """Update candidate profile"""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    for field, value in candidate_update.dict(exclude_unset=True).items():
        setattr(candidate, field, value)
    
    candidate.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(candidate)
    return candidate

@app.get("/candidates/", response_model=List[Candidate])
async def list_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List candidates (company users only)"""
    candidates = db.query(Candidate).offset(skip).limit(limit).all()
    return candidates

# ===== JOB APPLICATION ENDPOINTS =====
@app.post("/jobs/{job_id}/apply", response_model=JobApplication)
async def apply_for_job(
    job_id: int,
    application_data: dict,  # Contains candidate_id or candidate details
    db: Session = Depends(get_db)
):
    """Apply for a job position"""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job or not job.is_active:
        raise HTTPException(status_code=404, detail="Job not found or inactive")
    
    candidate_id = application_data.get("candidate_id")
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Check if already applied
    existing_application = db.query(JobApplication).filter(
        JobApplication.candidate_id == candidate_id,
        JobApplication.jd_id == job_id
    ).first()
    if existing_application:
        raise HTTPException(status_code=400, detail="Already applied for this position")
    
    db_application = JobApplication(
        candidate_id=candidate_id,
        jd_id=job_id,
        company_id=job.company_id,
        applied_at=datetime.utcnow()
    )
    db.add(db_application)
    
    # Update applications count
    job.applications_count += 1
    db.commit()
    db.refresh(db_application)
    
    # TODO: Trigger JD matching analysis here
    
    return db_application

@app.get("/companies/{company_id}/applications/", response_model=List[JobApplication])
async def list_company_applications(
    company_id: int,
    status: Optional[ApplicationStatus] = Query(None),
    jd_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List applications for a company"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = db.query(JobApplication).filter(JobApplication.company_id == company_id)
    
    if status:
        query = query.filter(JobApplication.application_status == status)
    if jd_id:
        query = query.filter(JobApplication.jd_id == jd_id)
    
    applications = query.offset(skip).limit(limit).all()
    return applications

@app.get("/applications/{application_id}", response_model=JobApplication)
async def get_application(
    application_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific application"""
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application

@app.put("/applications/{application_id}", response_model=JobApplication)
async def update_application(
    application_id: int,
    application_update: JobApplicationUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update application (for JD screening, status changes)"""
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == application.company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == application.company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for field, value in application_update.dict(exclude_unset=True).items():
        setattr(application, field, value)
    
    # Set screening details if status changed to screened
    if application_update.jd_screening_passed is not None:
        application.screened_at = datetime.utcnow()
        application.screened_by = current_user["user_id"]
    
    application.last_updated = datetime.utcnow()
    db.commit()
    db.refresh(application)
    return application

# ===== INTERVIEW ENDPOINTS =====
@app.post("/applications/{application_id}/schedule-interview", response_model=Interview)
async def schedule_interview(
    application_id: int,
    interview_data: InterviewCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Schedule an interview for an application"""
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == application.company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == application.company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if already has an interview
    existing_interview = db.query(Interview).filter(Interview.application_id == application_id).first()
    if existing_interview:
        raise HTTPException(status_code=400, detail="Interview already scheduled for this application")
    
    db_interview = Interview(
        **interview_data.dict(),
        application_id=application_id,
        created_at=datetime.utcnow()
    )
    db.add(db_interview)
    
    # Update application status
    application.application_status = ApplicationStatus.INTERVIEW_SCHEDULED
    application.last_updated = datetime.utcnow()
    
    db.commit()
    db.refresh(db_interview)
    return db_interview

@app.get("/interviews/{interview_id}", response_model=Interview)
async def get_interview(
    interview_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get interview details"""
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview

@app.put("/interviews/{interview_id}", response_model=Interview)
async def update_interview(
    interview_id: int,
    interview_update: InterviewUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update interview (status, scores, analysis, company decision)"""
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    for field, value in interview_update.dict(exclude_unset=True).items():
        setattr(interview, field, value)
    
    # Set decision timestamp if company decision is made
    if interview_update.company_decision is not None:
        interview.decision_made_at = datetime.utcnow()
        interview.decision_made_by = current_user["user_id"]
        
        # Update application status based on company decision
        application = db.query(JobApplication).filter(JobApplication.id == interview.application_id).first()
        if application:
            if interview_update.company_decision == CompanyDecision.SELECTED:
                application.application_status = ApplicationStatus.SELECTED
            elif interview_update.company_decision == CompanyDecision.REJECTED:
                application.application_status = ApplicationStatus.REJECTED
            application.last_updated = datetime.utcnow()
    
    interview.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(interview)
    return interview

@app.get("/companies/{company_id}/interviews/", response_model=List[Interview])
async def list_company_interviews(
    company_id: int,
    status: Optional[InterviewStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List interviews for a company"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = db.query(Interview).filter(Interview.company_id == company_id)
    
    if status:
        query = query.filter(Interview.status == status)
    
    interviews = query.offset(skip).limit(limit).all()
    return interviews

# ===== INTERVIEW QUESTION ENDPOINTS =====
@app.post("/interviews/{interview_id}/questions/", response_model=InterviewQuestion)
async def create_interview_question(
    interview_id: int,
    question: InterviewQuestionCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a question to an interview"""
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    db_question = InterviewQuestion(
        **question.dict(),
        asked_at=datetime.utcnow()
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

@app.get("/interviews/{interview_id}/questions/", response_model=List[InterviewQuestion])
async def list_interview_questions(
    interview_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all questions for an interview"""
    questions = db.query(InterviewQuestion).filter(
        InterviewQuestion.interview_id == interview_id
    ).order_by(InterviewQuestion.sequence_no).all()
    return questions

# ===== INTERVIEW ANSWER ENDPOINTS =====
@app.post("/questions/{question_id}/answers/", response_model=InterviewAnswer)
async def create_interview_answer(
    question_id: int,
    answer: InterviewAnswerCreate,
    db: Session = Depends(get_db)
):
    """Submit an answer to an interview question"""
    question = db.query(InterviewQuestion).filter(InterviewQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    db_answer = InterviewAnswer(
        **answer.dict(),
        answered_at=datetime.utcnow()
    )
    db.add(db_answer)
    db.commit()
    db.refresh(db_answer)
    return db_answer

@app.get("/interviews/{interview_id}/answers/", response_model=List[InterviewAnswer])
async def list_interview_answers(
    interview_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all answers for an interview"""
    answers = db.query(InterviewAnswer).filter(
        InterviewAnswer.interview_id == interview_id
    ).all()
    return answers

# ===== NOTIFICATION ENDPOINTS =====
@app.get("/notifications/", response_model=List[Notification])
async def list_notifications(
    is_read: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notifications for current user"""
    recipient_type = "company" if current_user["user_type"] == "company" else "company_user"
    recipient_id = current_user["user_id"]
    
    query = db.query(Notification).filter(
        Notification.recipient_type == recipient_type,
        Notification.recipient_id == recipient_id
    )
    
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    return notifications

@app.put("/notifications/{notification_id}/read", response_model=Notification)
async def mark_notification_read(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark notification as read"""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Check authorization
    recipient_type = "company" if current_user["user_type"] == "company" else "company_user"
    if notification.recipient_type != recipient_type or notification.recipient_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification

# ===== PROCTOR LOG ENDPOINTS =====
@app.post("/interviews/{interview_id}/proctor-logs/", response_model=ProctorLog)
async def create_proctor_log(
    interview_id: int,
    log_data: ProctorLogCreate,
    db: Session = Depends(get_db)
):
    """Log a proctoring event during interview"""
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    db_log = ProctorLog(
        **log_data.dict(),
        event_time=datetime.utcnow()
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

@app.get("/interviews/{interview_id}/proctor-logs/", response_model=List[ProctorLog])
async def list_proctor_logs(
    interview_id: int,
    event_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get proctoring logs for an interview"""
    query = db.query(ProctorLog).filter(ProctorLog.interview_id == interview_id)
    
    if event_type:
        query = query.filter(ProctorLog.event_type == event_type)
    if severity:
        query = query.filter(ProctorLog.severity == severity)
    
    logs = query.order_by(ProctorLog.event_time.desc()).all()
    return logs

# ===== ANALYTICS ENDPOINTS =====
@app.get("/companies/{company_id}/analytics/overview")
async def get_company_analytics(
    company_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get company analytics overview"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Calculate analytics
    total_jobs = db.query(JobDescription).filter(JobDescription.company_id == company_id).count()
    active_jobs = db.query(JobDescription).filter(
        JobDescription.company_id == company_id,
        JobDescription.is_active == True
    ).count()
    total_applications = db.query(JobApplication).filter(JobApplication.company_id == company_id).count()
    total_interviews = db.query(Interview).filter(Interview.company_id == company_id).count()
    
    return {
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "total_applications": total_applications,
        "total_interviews": total_interviews,
        "generated_at": datetime.utcnow()
    }

# ===== HEALTH CHECK =====
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)