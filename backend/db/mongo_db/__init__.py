from db.models.all_models import *
from db.models.documents import *
from config import load_env
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from datetime import datetime, timedelta
import jwt
env = None

async def beanieinit():
    global env
    env = load_env.Environment()
    client = AsyncIOMotorClient(env.MONGO_URI)
    db = env.DATABASE_NAME
    await init_beanie(
        database=client[db],
        document_models=[
            CompanyDoc, CompanyUserDoc, JobDescriptionDoc, CandidateDoc,
            JobApplicationDoc, InterviewDoc, InterviewQuestionDoc, InterviewAnswerDoc,
            MessageHistoryDoc, NotificationDoc, EmailLogDoc, ProctorLogDoc,
            SystemSettingDoc, SkillsMasterDoc, InterviewAnalyticsDoc
        ]
    )

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, "3GJpGVgA+PNPlP+yLU8tA7sN3k0GPDx6QA98vkdjSts=", algorithm="HS256")

async def authenticate_company(email: str, password: str) -> Optional[CompanyDoc]:
    """Authenticate company by email and password"""
    print(email, password)
    company = await CompanyDoc.find_one(CompanyDoc.email == email)
    if company and verify_password(password, company.password_hash):
        return company
    return None

async def authenticate_company_user(email: str, password: str) -> Optional[CompanyUserDoc]:
    """Authenticate company user by email and password"""
    user = await CompanyUserDoc.find_one(CompanyUserDoc.email == email)
    if user and verify_password(password, user.password_hash):
        return user
    return None

def create_company_login_response(company: CompanyDoc) -> LoginResponse:
    """Create login response for company"""
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

def create_company_user_login_response(user: CompanyUserDoc) -> LoginResponse:
    """Create login response for company user"""
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

# ===== COMPANY OPERATIONS =====
async def find_company_by_email(email: str) -> Optional[CompanyDoc]:
    """Find company by email"""
    return await CompanyDoc.find_one({"email": email})

async def create_company(company_data: dict, password: str) -> CompanyDoc:
    """Create a new company"""
    hashed_password = hash_password(password)
    company_doc = CompanyDoc(
        **company_data,
        password_hash=hashed_password
    )
    await company_doc.insert()
    return company_doc

async def get_company_by_id(company_id: str) -> Optional[CompanyDoc]:
    """Get company by ID"""
    return await CompanyDoc.get(PydanticObjectId(company_id))

async def update_company_by_id(company_id: str, update_data: dict) -> Optional[CompanyDoc]:
    """Update company by ID"""
    company = await CompanyDoc.get(PydanticObjectId(company_id))
    if company and update_data:
        update_data["updated_at"] = datetime.utcnow()
        await company.update({"$set": update_data})
        return await CompanyDoc.get(company.id)
    return company

async def list_all_companies(skip: int = 0, limit: int = 10) -> List[CompanyDoc]:
    """List all companies with pagination"""
    return await CompanyDoc.find_all().skip(skip).limit(limit).to_list()

# ===== COMPANY USER OPERATIONS =====
async def find_user_by_email(email: str) -> Optional[CompanyUserDoc]:
    """Find company user by email"""
    return await CompanyUserDoc.find_one({"email": email})

async def get_user_by_id(user_id: str) -> Optional[CompanyUserDoc]:
    """Get company user by ID"""
    return await CompanyUserDoc.get(PydanticObjectId(user_id))

async def create_company_user(company_id: str, user_data: dict, password: str, created_by: Optional[str] = None) -> CompanyUserDoc:
    """Create a new company user"""
    hashed_password = hash_password(password)
    user_doc = CompanyUserDoc(
        **user_data,
        company_id=PydanticObjectId(company_id),
        password_hash=hashed_password,
        created_by=PydanticObjectId(created_by) if created_by else None
    )
    await user_doc.insert()
    return user_doc

async def list_company_users(company_id: str) -> List[CompanyUserDoc]:
    """List all users in a company"""
    return await CompanyUserDoc.find({"company_id": PydanticObjectId(company_id)}).to_list()

async def find_company_user(user_id: str, company_id: str) -> Optional[CompanyUserDoc]:
    """Find specific company user"""
    return await CompanyUserDoc.find_one({
        "_id": PydanticObjectId(user_id),
        "company_id": PydanticObjectId(company_id)
    })

async def update_company_user(user: CompanyUserDoc, update_data: dict) -> CompanyUserDoc:
    """Update company user"""
    if update_data:
        await user.update({"$set": update_data})
    return await CompanyUserDoc.get(user.id)

# ===== JOB DESCRIPTION OPERATIONS =====
async def create_job_description(company_id: str, job_data: dict, created_by: str) -> JobDescriptionDoc:
    """Create a new job description"""
    job_doc = JobDescriptionDoc(
        **job_data,
        company_id=PydanticObjectId(company_id),
        created_by=PydanticObjectId(created_by)
    )
    await job_doc.insert()
    return job_doc

async def list_company_jobs(company_id: str, is_active: Optional[bool] = None, skip: int = 0, limit: int = 10) -> List[JobDescriptionDoc]:
    """List jobs for a company"""
    query = {"company_id": PydanticObjectId(company_id)}
    if is_active is not None:
        query["is_active"] = is_active
    
    return await JobDescriptionDoc.find(query).skip(skip).limit(limit).to_list()

async def list_jobs_with_filters(
    is_active: bool = True,
    experience_level: Optional[ExperienceLevel] = None,
    employment_type: Optional[EmploymentType] = None,
    location: Optional[str] = None,
    skip: int = 0,
    limit: int = 10
) -> List[JobDescriptionDoc]:
    """List jobs with filters"""
    query = {"is_active": is_active}
    
    if experience_level:
        query["experience_level"] = experience_level
    if employment_type:
        query["employment_type"] = employment_type
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    
    return await JobDescriptionDoc.find(query).skip(skip).limit(limit).to_list()

async def get_job_by_id(job_id: str) -> Optional[JobDescriptionDoc]:
    """Get job by ID"""
    try:
        return await JobDescriptionDoc.get(PydanticObjectId(job_id))
    except:
        return None

async def update_job_by_id(job_id: str, update_data: dict) -> Optional[JobDescriptionDoc]:
    """Update job by ID"""
    try:
        job = await JobDescriptionDoc.get(PydanticObjectId(job_id))
        if job and update_data:
            update_data["updated_at"] = datetime.utcnow()
            await job.update({"$set": update_data})
            return await JobDescriptionDoc.get(job.id)
        return job
    except:
        return None

async def deactivate_job(job_id: str) -> Optional[JobDescriptionDoc]:
    """Soft delete job (set is_active = False)"""
    try:
        job = await JobDescriptionDoc.get(PydanticObjectId(job_id))
        if job:
            await job.update({"$set": {"is_active": False, "updated_at": datetime.utcnow()}})
            return job
        return None
    except:
        return None

async def check_job_authorization(job: JobDescriptionDoc, current_user: dict) -> bool:
    """Check if user is authorized to modify the job"""
    return ((current_user["user_type"] == "company" and current_user["user_id"] == str(job.company_id)) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == str(job.company_id)))

async def find_candidate_by_email(email: str) -> Optional[CandidateDoc]:
    """Find candidate by email"""
    return await CandidateDoc.find_one({"email": email})

async def create_candidate(candidate_data: dict) -> CandidateDoc:
    """Create a new candidate"""
    candidate_doc = CandidateDoc(**candidate_data)
    await candidate_doc.insert()
    return candidate_doc

async def get_candidate_by_id(candidate_id: str) -> Optional[CandidateDoc]:
    """Get candidate by ID"""
    try:
        return await CandidateDoc.get(PydanticObjectId(candidate_id))
    except:
        return None

async def update_candidate_by_id(candidate_id: str, update_data: dict) -> Optional[CandidateDoc]:
    """Update candidate by ID"""
    try:
        candidate = await CandidateDoc.get(PydanticObjectId(candidate_id))
        if candidate and update_data:
            update_data["updated_at"] = datetime.utcnow()
            await candidate.update({"$set": update_data})
            return await CandidateDoc.get(candidate.id)
        return candidate
    except:
        return None

async def list_all_candidates(skip: int = 0, limit: int = 10) -> List[CandidateDoc]:
    """List all candidates with pagination"""
    return await CandidateDoc.find_all().skip(skip).limit(limit).to_list()

async def get_job_for_application(job_id: str) -> Optional[JobDescriptionDoc]:
    """Get job for application validation"""
    try:
        job = await JobDescriptionDoc.get(PydanticObjectId(job_id))
        return job if job and job.is_active else None
    except:
        return None

async def get_candidate_for_application(candidate_id: str) -> Optional[CandidateDoc]:
    """Get candidate for application validation"""
    try:
        return await CandidateDoc.get(PydanticObjectId(candidate_id))
    except:
        return None

async def find_existing_application(candidate_id: str, job_id: str) -> Optional[JobApplicationDoc]:
    """Check if candidate already applied for this job"""
    return await JobApplicationDoc.find_one({
        "candidate_id": PydanticObjectId(candidate_id),
        "jd_id": PydanticObjectId(job_id)
    })

async def create_job_application(candidate_id: str, job_id: str, company_id: str) -> JobApplicationDoc:
    """Create a new job application"""
    application_doc = JobApplicationDoc(
        candidate_id=PydanticObjectId(candidate_id),
        jd_id=PydanticObjectId(job_id),
        company_id=PydanticObjectId(company_id)
    )
    await application_doc.insert()
    return application_doc

async def increment_job_applications_count(job_id: str):
    """Increment applications count for a job"""
    job = await JobDescriptionDoc.get(PydanticObjectId(job_id))
    if job:
        await job.update({"$inc": {"applications_count": 1}})

async def list_company_applications(
    company_id: str,
    status: Optional[ApplicationStatus] = None,
    jd_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 10
) -> List[JobApplicationDoc]:
    """List applications for a company with filters"""
    query = {"company_id": PydanticObjectId(company_id)}
    
    if status:
        query["application_status"] = status
    if jd_id:
        query["jd_id"] = PydanticObjectId(jd_id)
    
    return await JobApplicationDoc.find(query).skip(skip).limit(limit).to_list()

async def get_application_by_id(application_id: str) -> Optional[JobApplicationDoc]:
    """Get application by ID"""
    try:
        return await JobApplicationDoc.get(PydanticObjectId(application_id))
    except:
        return None

async def update_application_by_id(
    application_id: str, 
    update_data: dict, 
    current_user_id: str,
    jd_screening_passed: Optional[bool] = None
) -> Optional[JobApplicationDoc]:
    """Update application by ID"""
    try:
        application = await JobApplicationDoc.get(PydanticObjectId(application_id))
        if not application:
            return None
        
        # Set screening details if status changed to screened
        if jd_screening_passed is not None:
            update_data["screened_at"] = datetime.utcnow()
            update_data["screened_by"] = PydanticObjectId(current_user_id)
        
        if update_data:
            update_data["last_updated"] = datetime.utcnow()
            await application.update({"$set": update_data})
        
        return await JobApplicationDoc.get(application.id)
    except:
        return None

async def check_application_authorization(application: JobApplicationDoc, current_user: dict) -> bool:
    """Check if user is authorized to modify the application"""
    return ((current_user["user_type"] == "company" and current_user["user_id"] == str(application.company_id)) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == str(application.company_id)))

async def get_application_for_interview(application_id: str) -> Optional[JobApplicationDoc]:
    """Get application for interview scheduling"""
    try:
        return await JobApplicationDoc.get(PydanticObjectId(application_id))
    except:
        return None

async def find_existing_interview(application_id: str) -> Optional[InterviewDoc]:
    """Check if interview already exists for application"""
    return await InterviewDoc.find_one({"application_id": PydanticObjectId(application_id)})

async def create_interview(
    application_id: str,
    candidate_id: str,
    jd_id: str,
    company_id: str,
    interviewer_id: Optional[str],
    scheduled_at: datetime,
    interview_type: str
) -> InterviewDoc:
    """Create a new interview"""
    interview_doc = InterviewDoc(
        application_id=PydanticObjectId(application_id),
        candidate_id=PydanticObjectId(candidate_id),
        jd_id=PydanticObjectId(jd_id),
        company_id=PydanticObjectId(company_id),
        interviewer_id=PydanticObjectId(interviewer_id) if interviewer_id else None,
        scheduled_at=scheduled_at,
        interview_type=interview_type
    )
    await interview_doc.insert()
    return interview_doc

async def update_application_status_for_interview(application_id: str):
    """Update application status to interview scheduled"""
    application = await JobApplicationDoc.get(PydanticObjectId(application_id))
    if application:
        await application.update({
            "$set": {
                "application_status": ApplicationStatus.INTERVIEW_SCHEDULED,
                "last_updated": datetime.utcnow()
            }
        })

async def get_interview_by_id(interview_id: str) -> Optional[InterviewDoc]:
    """Get interview by ID"""
    try:
        return await InterviewDoc.get(PydanticObjectId(interview_id))
    except:
        return None

async def update_interview_by_id(
    interview_id: str,
    update_data: dict,
    current_user_id: str,
    company_decision: Optional[CompanyDecision] = None
) -> Optional[InterviewDoc]:
    """Update interview by ID"""
    try:
        interview = await InterviewDoc.get(PydanticObjectId(interview_id))
        if not interview:
            return None
        
        # Set decision timestamp if company decision is made
        if company_decision is not None:
            update_data["decision_made_at"] = datetime.utcnow()
            update_data["decision_made_by"] = PydanticObjectId(current_user_id)
            
            # Update application status based on company decision
            await update_application_status_for_decision(interview.application_id, company_decision)
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            await interview.update({"$set": update_data})
        
        return await InterviewDoc.get(interview.id)
    except:
        return None

async def update_application_status_for_decision(application_id: PydanticObjectId, company_decision: CompanyDecision):
    """Update application status based on company decision"""
    application = await JobApplicationDoc.get(application_id)
    if application:
        application_update = {"last_updated": datetime.utcnow()}
        if company_decision == CompanyDecision.SELECTED:
            application_update["application_status"] = ApplicationStatus.SELECTED
        elif company_decision == CompanyDecision.REJECTED:
            application_update["application_status"] = ApplicationStatus.REJECTED
        await application.update({"$set": application_update})

async def list_company_interviews(
    company_id: str,
    status: Optional[InterviewStatus] = None,
    skip: int = 0,
    limit: int = 10
) -> List[InterviewDoc]:
    """List interviews for a company with filters"""
    query = {"company_id": PydanticObjectId(company_id)}
    
    if status:
        query["status"] = status
    
    return await InterviewDoc.find(query).skip(skip).limit(limit).to_list()

async def check_interview_authorization(interview: InterviewDoc, current_user: dict) -> bool:
    """Check if user is authorized to modify the interview"""
    return ((current_user["user_type"] == "company" and current_user["user_id"] == str(interview.company_id)) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == str(interview.company_id)))

# ===== INTERVIEW QUESTION OPERATIONS =====
async def create_interview_question(
    interview_id: str,
    question_data: dict,
    parent_question_id: Optional[str] = None
) -> InterviewQuestionDoc:
    """Create a new interview question"""
    question_doc = InterviewQuestionDoc(
        **question_data,
        interview_id=PydanticObjectId(interview_id),
        parent_question_id=PydanticObjectId(parent_question_id) if parent_question_id else None,
        asked_at=datetime.utcnow()
    )
    await question_doc.insert()
    return question_doc

async def list_interview_questions(interview_id: str) -> List[InterviewQuestionDoc]:
    """Get all questions for an interview"""
    return await InterviewQuestionDoc.find({
        "interview_id": PydanticObjectId(interview_id)
    }).sort("sequence_no").to_list()

# ===== INTERVIEW ANSWER OPERATIONS =====
async def get_question_for_answer(question_id: str) -> Optional[InterviewQuestionDoc]:
    """Get question for answer submission"""
    try:
        return await InterviewQuestionDoc.get(PydanticObjectId(question_id))
    except:
        return None

async def create_interview_answer(question_id: str, answer_data: dict, interview_id: str) -> InterviewAnswerDoc:
    """Create a new interview answer"""
    answer_doc = InterviewAnswerDoc(
        **answer_data,
        question_id=PydanticObjectId(question_id),
        interview_id=PydanticObjectId(interview_id)
    )
    await answer_doc.insert()
    return answer_doc

async def list_interview_answers(interview_id: str) -> List[InterviewAnswerDoc]:
    """Get all answers for an interview"""
    return await InterviewAnswerDoc.find({
        "interview_id": PydanticObjectId(interview_id)
    }).to_list()