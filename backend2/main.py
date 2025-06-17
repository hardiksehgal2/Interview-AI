from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.applications import router as applications_router
from api.auth import router as auth_router
from api.candidates import router as candidates_router
from api.companies import router as companies_router
from api.interviews import router as interviews_router
from api.jobs import router as jobs_router
from api.search import router as search_router
from api.settings import router as settings_router
from api.users import router as company_users_router
from config import load_env
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models.mongo import *

env = load_env.Environment()

app = FastAPI(title="Hiring Management System", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Register startup event
app.add_event_handler("startup", startup_event)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "version": "1.0.0"
    }


# Include routers for different modules
app.include_router(applications_router, tags=["applications"])
app.include_router(auth_router, tags=["auth"])
app.include_router(candidates_router, tags=["candidates"])
app.include_router(companies_router, tags=["companies"])
app.include_router(company_users_router, tags=["company_users"])
app.include_router(interviews_router, tags=["interviews"])
app.include_router(jobs_router, tags=["jobs"])
app.include_router(search_router, tags=["search"])
app.include_router(settings_router, tags=["settings"])