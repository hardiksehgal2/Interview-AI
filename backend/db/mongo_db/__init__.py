# backend/auth/mongo_db/mongo_op.py
import datetime
from typing import List, Optional, Dict, Any
import bcrypt
from bson import ObjectId
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError
from db.models.company import CompanyCreate, CompanyInDB, CompanyResponse
from config import load_env

# import services.mongo_op as mongo_service

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from db.models.interview import InterviewDataStorage, MessageEntry

env = load_env.Environment()
MONGO_URI = env.MONGO_URI
DATABASE_NAME = env.DATABASE_NAME
client = None
db = None
JD_COLLECTION = env.JD_COLLECTION
RESUME_COLLECTION = env.RESUME_COLLECTION
INTERVIEW_DATA_COLLECTION = env.INTERVIEW_DATA_COLLECTION
COMPANY_COLLECTION = env.COMPANY_COLLECTION

async def create_company_index():
    """Create unique index on email field for companies"""
    try:
        await db[COMPANY_COLLECTION].create_index("email", unique=True)
        print("Company email index created successfully")
    except Exception as e:
        print(f"Error creating company index: {str(e)}")

async def connect_to_mongo():
    global client, db
    try:
        if client is None:
            client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        
        await client.admin.command('ping')
        db = client[DATABASE_NAME]
        
        # Create company index
        await create_company_index()
        
        print("Successfully connected to MongoDB")
    except Exception as e:
        print(f"Error connecting to MongoDB: {str(e)}")
        raise e

async def close_mongo_connection():
    global client
    if client:
        client.close()



async def save_jd(domain: str, jd_text: str) -> Dict[str, Any]:
    result = await db[JD_COLLECTION].update_one(
        {"domain": domain},
        {"$set": {"domain": domain, "jd_text": jd_text}},
        upsert=True
    )
    if result.upserted_id:
        return {"id": str(result.upserted_id), "domain": domain, "status": "created"}
    elif result.modified_count > 0:
        doc = await db[JD_COLLECTION].find_one({"domain": domain})
        return {"id": str(doc["_id"]) if doc else None, "domain": domain, "status": "updated"}
    else:
        doc = await db[JD_COLLECTION].find_one({"domain": domain})
        if doc:
            return {"id": str(doc["_id"]), "domain": domain, "status": "exists_no_change"}
    return {"error": "Failed to save or update job description"}


async def get_jd_by_domain(domain: str):
    try:
        if domain == 'all':
            cursor = db[JD_COLLECTION].find()
        else:
            cursor = db[JD_COLLECTION].find({"domain": domain})
        jd_list = await cursor.to_list()

        for jd in jd_list:
            if "_id" in jd:
                jd["id"] = str(jd.pop("_id"))

        return jd_list
    except Exception as e:
        print(f"Error fetching job descriptions: {e}")
        return []


async def get_jd_by_id(jd_id: str) -> Optional[Dict[str, Any]]:
    try:
        jd = await db[JD_COLLECTION].find_one({"_id": ObjectId(jd_id)})
        if jd:
            jd["id"] = str(jd.pop("_id"))
            return jd
        return None
    except Exception as e:
        print(f"Error fetching job description by ID: {e}")
        return None


async def save_resume(candidate_name: str, resume_base64: str, resume_txt: str, jd_id: str):
    result = await db[RESUME_COLLECTION].update_one(
        {"candidate_name": candidate_name},
        {"$set": {"candidate_name": candidate_name, "resume_base64": resume_base64, "resume_txt": resume_txt, "jd_id": jd_id}},
        upsert=True
    )
    if result.upserted_id:
        return {"id": str(result.upserted_id), "candidate_name": candidate_name, "status": "created"}
    elif result.modified_count > 0:
        doc = await db[RESUME_COLLECTION].find_one({"candidate_name": candidate_name, "jd_id": jd_id})
        return {"id": str(doc["_id"]) if doc else None, "candidate_name": candidate_name, "status": "updated"}
    else:
        doc = await db[RESUME_COLLECTION].find_one({"candidate_name": candidate_name, "jd_id": jd_id})
        if doc:
            return {"id": str(doc["_id"]), "candidate_name": candidate_name, "status": "exists_no_change"}
    return {"error": "Failed to save or update resume"}


async def get_resume_by_name(candidate_name: str = None, resume_id: str = None):
    if resume_id:
        resume = await db[RESUME_COLLECTION].find_one({"_id": ObjectId(resume_id)})
    elif candidate_name:
        resume = await db[RESUME_COLLECTION].find_one({"candidate_name": candidate_name})
    else:
        raise ValueError("Either candidate_name or resume_id must be provided")
    if resume:
        resume["id"] = str(resume.pop("_id"))
    return resume


async def get_resume_by_jd(jd_id: str):
    try:
        cursor = db[RESUME_COLLECTION].find({"jd_id": jd_id})
        resumes = await cursor.to_list()

        for res in resumes:
            if "_id" in res:
                res["id"] = str(res.pop("_id"))

        return resumes
    except Exception as e:
        print(f"Error fetching all resumes: {e}")
        return []


async def save_interview_data(data: InterviewDataStorage):
    result = await db[INTERVIEW_DATA_COLLECTION].update_one(
        {"candidate_name": data.candidate_name, "candidate_email": data.candidate_email}, # Composite key
        {"$set": data.model_dump()},
        upsert=True
    )
    if result.upserted_id:
        return {"id": str(result.upserted_id), "status": "created"}
    elif result.modified_count > 0:
        doc = await db[INTERVIEW_DATA_COLLECTION].find_one(
            {"candidate_name": data.candidate_name, "candidate_email": data.candidate_email}
        )
        return {"id": str(doc["_id"]) if doc else None, "status": "updated"}
    else:
        doc = await db[INTERVIEW_DATA_COLLECTION].find_one(
            {"candidate_name": data.candidate_name, "candidate_email": data.candidate_email}
        )
        if doc:
            return {"id": str(doc["_id"]), "status": "exists_no_change"}
    return {"error": "Failed to save or update interview data"}


async def update_interview_data(interview_id: str, status: str, message_history: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Update interview status and message history in MongoDB
    """
    try:
        existing_data = await db[INTERVIEW_DATA_COLLECTION].find_one({"_id": ObjectId(interview_id)})
        if existing_data and existing_data.get("status") in ["interview_completed", "summary_generated"]:
            return {"error": f"Interview with ID {interview_id} is already completed."}
        
        result = await db[INTERVIEW_DATA_COLLECTION].update_one(
            {"_id": ObjectId(interview_id)},
            {"$set": {
                "status": status,
                "message_history": message_history,
                "completed_at": datetime.datetime.utcnow()
            }}
        )
        
        if result.modified_count == 0:
            return {"error": f"No interview data found with ID {interview_id}"}
        
        return {"message": f"Interview data updated successfully", "id": interview_id}
    except Exception as e:
        print(f"Error updating interview data: {str(e)}")
        return {"error": f"Error updating interview data: {str(e)}"}

async def update_candidate_report(interview_id: str, analysis_data: Dict[str, Any], status: str):
    try:
        result = await db[INTERVIEW_DATA_COLLECTION].update_one(
            {"_id": ObjectId(interview_id)},
            {"$set": {
                "analysis": analysis_data,
                "status": status
            }}
        )
        
        if result.modified_count == 0:
            return {"error": f"No interview data found with ID {interview_id}"}
        
        return {"message": f"Interview report updated successfully", "id": interview_id}
    except Exception as e:
        print(f"Error updating candidate report: {str(e)}")
        return {"error": f"Error updating candidate report: {str(e)}"}


async def get_interview_data_by_id(id: str) -> Optional[Dict[str, Any]]:
    data = await db[INTERVIEW_DATA_COLLECTION].find_one({"_id": ObjectId(id)})
    return data

async def debug_db_connection():
    """Debug function to check database status"""
    if db is not None:
        try:
            collections = await db.list_collection_names()
            print(f"Available collections: {collections}")
        except Exception as e:
            print(f"Error listing collections: {e}")

async def create_company_index():
    """Create unique index on email field"""
    try:
        if db is None:
            print("Database connection not available for index creation")
            return
        await db[COMPANY_COLLECTION].create_index("email", unique=True)
        print("Company email index created successfully")
    except Exception as e:
        print(f"Error creating company index: {str(e)}")

async def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

async def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

async def save_company(company_data: CompanyCreate) -> CompanyResponse:
    """Save a new company to the database"""
    try:
        await debug_db_connection()
        if db is None:
            raise HTTPException(status_code=500, detail="Database connection not available")
        
        # Hash the password
        hashed_password = await hash_password(company_data.password)
        
        # Create company document
        company_dict = company_data.dict(exclude={"password"})
        company_dict["password_hash"] = hashed_password
        company_dict["created_at"] = datetime.datetime.utcnow()
        company_dict["updated_at"] = datetime.datetime.utcnow()
        company_dict["is_active"] = True
        
        # Insert into database
        result = await db[COMPANY_COLLECTION].insert_one(company_dict)
        
        # Retrieve the created company
        created_company = await db[COMPANY_COLLECTION].find_one({"_id": result.inserted_id})
        
        if created_company:
            created_company["_id"] = str(created_company["_id"])
            return CompanyResponse(**created_company)
        else:
            raise HTTPException(status_code=500, detail="Failed to retrieve created company")
            
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Company with this email already exists")
    except Exception as e:
        print(f"Error saving company: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save company")

async def get_company_by_id(company_id: str) -> Optional[CompanyResponse]:
    """Get company by ID"""
    try:
        if db is None:
            return None
            
        if not ObjectId.is_valid(company_id):
            return None
            
        company = await db[COMPANY_COLLECTION].find_one({"_id": ObjectId(company_id)})
        
        if company:
            company["_id"] = str(company["_id"])
            return CompanyResponse(**company)
        return None
        
    except Exception as e:
        print(f"Error getting company by ID: {str(e)}")
        return None

async def get_companies_by_sector(sector: str, limit: int = 10, skip: int = 0) -> List[CompanyResponse]:
    """Get companies by sector"""
    try:
        if db is None:
            return []
            
        cursor = db[COMPANY_COLLECTION].find(
            {"sector": sector, "is_active": True}
        ).skip(skip).limit(limit)
        
        companies = []
        async for company in cursor:
            company["_id"] = str(company["_id"])
            companies.append(CompanyResponse(**company))
        
        return companies
        
    except Exception as e:
        print(f"Error getting companies by sector: {str(e)}")
        return []

async def get_company_by_email(email: str) -> Optional[CompanyInDB]:
    """Get company by email (for authentication)"""
    try:
        if db is None:
            return None
            
        company = await db[COMPANY_COLLECTION].find_one({"email": email})
        
        if company:
            company["_id"] = str(company["_id"])
            return CompanyInDB(**company)
        return None
        
    except Exception as e:
        print(f"Error getting company by email: {str(e)}")
        return None

async def authenticate_company(email: str, password: str) -> Optional[CompanyResponse]:
    """Authenticate company login"""
    try:
        company = await get_company_by_email(email)
        
        if company and company.is_active:
            if await verify_password(password, company.password_hash):
                # Return company response without password hash
                company_dict = company.dict(exclude={"password_hash"},by_alias=True)
                return CompanyResponse(**company_dict)
        
        return None
        
    except Exception as e:
        print(f"Error authenticating company: {str(e)}")
        return None