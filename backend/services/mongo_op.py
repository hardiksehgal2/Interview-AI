import datetime
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional, Dict, Any, List
from .model_schema import InterviewDataStorage, MessageEntry
from dotenv import load_dotenv
from bson import ObjectId
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = "ai_interview"
client = None
db = None
JD_COLLECTION = "job_description"
RESUME_COLLECTION = "uploaded_resume"
INTERVIEW_DATA_COLLECTION = "interview_data"


async def connect_to_mongo():
    global client, db
    try:
        if client is None:
            client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        
        await client.admin.command('ping')
        db = client[DATABASE_NAME]
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