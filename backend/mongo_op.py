# backend/mongo_op.py
import datetime
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional, Dict, Any, List
from model_schema import InterviewDataStorage, MessageEntry
from dotenv import load_dotenv
from bson import ObjectId
import os
from pydantic import BaseModel
from typing import List
import asyncio
from litellm import acompletion
import json
import os
import instructor
load_dotenv()

os.environ['GEMINI_API_KEY'] = os.getenv('GEMINI_API_KEY')
MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = "ai_interview"
client = None
db = None
JD_COLLECTION = "job_description"
RESUME_COLLECTION = "uploaded_resume"
INTERVIEW_DATA_COLLECTION = "interview_data"
SYSTEM_PROMPT= """
You are an Interview analyzer. You are given a transcript of an interview history which is a list of messages between an interviewer and a candidate, resume text and the job description.
You need to analyze the interview and the job description and provide a report on the interview. 
Do not focus too much on exact wording as there might be some errors in transcription. Understanding of the context is more important.
you can increase the length of the response according to your own understanding of the context.

Rule:
one and only importan rule is to strictly follow the structured output

Always return your analysis as a strict JSON object with the following structure:

{
  "summary": "Brief overview of the interview",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}

Example output:
{
  "summary": "The candidate interviewed for a Full Stack Developer role, discussing React experience, database knowledge, and problem-solving approaches.",
  "strengths": ["Strong React knowledge", "Good communication skills", "Experience with SQL databases"],
  "weaknesses": ["Limited backend experience", "No DevOps knowledge"],
  "suggestions": ["Learn Node.js backend development", "Gain experience with cloud platforms", "Practice system design questions"]
}
"""

class InterviewAnalysis(BaseModel):
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]
    
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


async def generate_candidate_report(interview_id: str, status: str = None) -> Dict[str, Any]:
    try:
        print(f"[DEBUG] Starting report generation for interview_id: {interview_id}")
        
        # Get interview data
        result = await db[INTERVIEW_DATA_COLLECTION].find_one({"_id": ObjectId(interview_id)})
        if not result:
            print(f"[DEBUG] No interview data found with ID {interview_id}")
            # Update status to error and return
            await db[INTERVIEW_DATA_COLLECTION].update_one(
                {"_id": ObjectId(interview_id)},
                {"$set": {
                    "status": "summary_error",
                    "summary_error": f"No interview data found with ID {interview_id}"
                }}
            )
            return {"error": f"No interview data found with ID {interview_id}"}
            
        # Print what we found to help debug
        print(f"[DEBUG] Interview data keys: {list(result.keys())}")
        
        # Extract needed information
        jd_id = result.get("jd_id")
        resume_id = result.get("resume_id")  # This might be None
        candidate_name = result.get("candidate_name", "")
        candidate_email = result.get("candidate_email", "")
        message_history = result.get("message_history", [])
        resume_text = result.get("resume_text", "")
        
        print(f"[DEBUG] Extracted values: jd_id={jd_id}, resume_id={resume_id}, candidate_name={candidate_name}")
        print(f"[DEBUG] Resume text exists: {bool(resume_text)}, length: {len(resume_text)}")
        print(f"[DEBUG] Message history exists: {bool(message_history)}, length: {len(message_history)}")
        
        # Get JD data
        print(f"[DEBUG] Getting JD data for jd_id: {jd_id}")
        jd_data = await get_jd_by_id(jd_id)
        if not jd_data:
            print(f"[DEBUG] Job description with ID {jd_id} not found")
            # Update status to error and return
            await db[INTERVIEW_DATA_COLLECTION].update_one(
                {"_id": ObjectId(interview_id)},
                {"$set": {
                    "status": "summary_error",
                    "summary_error": f"Job description with ID {jd_id} not found"
                }}
            )
            return {"error": f"Job description with ID {jd_id} not found"}
        
        print(f"[DEBUG] JD data retrieved with keys: {list(jd_data.keys())}")
        jd_text = jd_data.get("jd_text", "")
        print(f"[DEBUG] JD text length: {len(jd_text)}")
        
        # Check if resume text exists
        if not resume_text:
            error_msg = "Resume text is missing or empty"
            print(f"[DEBUG] {error_msg}")
            await db[INTERVIEW_DATA_COLLECTION].update_one(
                {"_id": ObjectId(interview_id)},
                {"$set": {
                    "status": "summary_error",
                    "summary_error": error_msg
                }}
            )
            return {"error": error_msg}
        
        # Format interview transcript from message history
        transcript = ""
        for idx, msg in enumerate(message_history):
            print(f"[DEBUG] Processing message {idx}, keys: {list(msg.keys())}")
            role = "AI Interviewer" if msg.get("role") == "ai" else "Candidate"
            content = msg.get("content", "")
            transcript += f"{role}: {content}\n\n"
            
        print(f"[DEBUG] Transcript created, length: {len(transcript)}")
        
        # Create prompt for LLM
        print("[DEBUG] Creating LLM prompt")
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"""
            Please analyze this interview and provide a report according to the specified JSON format.
            
            Candidate Name: {candidate_name}
            Candidate Email: {candidate_email}
            
            Job Description:
            {jd_text}
            
            Resume:
            {resume_text}
            
            Interview Transcript:
            {transcript}
            """}
        ]
        
        # Call Gemini API using LiteLLM
        print("[DEBUG] Calling Gemini API")
        try:
            response = await acompletion(
                model="gemini/gemini-2.5-flash-preview-04-17",
                messages=messages,
                response_format=InterviewAnalysis,
                temperature=0.7,
            )
            print("[DEBUG] Gemini API call successful")
        except Exception as api_error:
            error_msg = f"Error calling Gemini API: {str(api_error)}"
            print(f"[DEBUG] {error_msg}")
            await db[INTERVIEW_DATA_COLLECTION].update_one(
                {"_id": ObjectId(interview_id)},
                {"$set": {
                    "status": "summary_error",
                    "summary_error": error_msg
                }}
            )
            return {"error": error_msg}
        
        # Extract and parse response
        print("[DEBUG] Processing Gemini API response")
        response_content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
        print(f"[DEBUG] Response content preview: {response_content[:100]}...")
        
        try:
            # Parse JSON from response
            print("[DEBUG] Parsing JSON response")
            # Try to extract JSON if it's embedded in markdown or other text
            if "```json" in response_content:
                print("[DEBUG] Found JSON code block")
                json_str = response_content.split("```json")[1].split("```")[0].strip()
                analysis_data = json.loads(json_str)
            else:
                print("[DEBUG] Attempting direct JSON parse")
                # Try to parse directly
                analysis_data = json.loads(response_content)
                
            print(f"[DEBUG] Successfully parsed JSON with keys: {list(analysis_data.keys())}")
                
            # Update interview data with analysis and set status to summary_generated
            print("[DEBUG] Updating interview data with analysis")
            update_result = await db[INTERVIEW_DATA_COLLECTION].update_one(
                {"_id": ObjectId(interview_id)},
                {"$set": {
                    "analysis": analysis_data,
                    "status": "summary_generated"  # Changed from "analyzed"
                }}
            )
            
            print(f"[DEBUG] Update result: modified_count={update_result.modified_count}")
            
            if update_result.modified_count == 0:
                print("[DEBUG] Warning: Document not updated")
                return {"warning": "Analysis generated but interview data not updated", "analysis": analysis_data}
                
            print("[DEBUG] Report generation completed successfully")
            return {"message": "Candidate report generated successfully", "analysis": analysis_data}
            
        except json.JSONDecodeError as je:
            error_msg = f"Error parsing LLM response as JSON: {str(je)}"
            print(f"[DEBUG] {error_msg}")
            print(f"[DEBUG] Raw response: {response_content}")
            
            # Update status to error
            await db[INTERVIEW_DATA_COLLECTION].update_one(
                {"_id": ObjectId(interview_id)},
                {"$set": {
                    "status": "summary_error",
                    "summary_error": error_msg
                }}
            )
            
            return {"error": error_msg, "raw_response": response_content}
            
    except Exception as e:
        error_msg = f"Error generating candidate report: {str(e)}"
        print(f"[DEBUG] {error_msg}")
        import traceback
        print(f"[DEBUG] Traceback: {traceback.format_exc()}")
        
        # Update status to error
        try:
            await db[INTERVIEW_DATA_COLLECTION].update_one(
                {"_id": ObjectId(interview_id)},
                {"$set": {
                    "status": "summary_error",
                    "summary_error": error_msg
                }}
            )
        except Exception as update_error:
            print(f"[DEBUG] Error updating status after failure: {str(update_error)}")
        
        return {"error": error_msg}
    

async def update_interview_data(interview_id: str, status: str, message_history: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Update interview status and message history in MongoDB
    """
    try:
        print(f"[DEBUG] Updating interview data for ID: {interview_id} with status: {status}")
        print(f"[DEBUG] Message history length: {len(message_history)}")
        
        # Skip the MessageEntry conversion and store dictionaries directly
        result = await db[INTERVIEW_DATA_COLLECTION].update_one(
            {"_id": ObjectId(interview_id)},
            {"$set": {
                "status": status,
                "message_history": message_history,  # Store the dictionaries directly
                "completed_at": datetime.datetime.utcnow()
            }}
        )
        
        print(f"[DEBUG] Update result: modified_count={result.modified_count}")
        
        if result.modified_count == 0:
            print(f"[DEBUG] No documents modified for interview ID: {interview_id}")
            return {"error": f"No interview data found with ID {interview_id}"}
        
        if status == "interview_completed":
            print(f"[DEBUG] Interview completed, starting summary generation for ID: {interview_id}")
            # Update to summary pending first
            update_pending_result = await db[INTERVIEW_DATA_COLLECTION].update_one(
                {"_id": ObjectId(interview_id)},
                {"$set": {"status": "summary_pending"}}
            )
            print(f"[DEBUG] Updated to summary_pending: modified_count={update_pending_result.modified_count}")
            
            # Launch report generation in background
            print("[DEBUG] Launching background task for report generation")
            try:
                # Call with just the interview_id parameter
                asyncio.create_task(generate_candidate_report(interview_id))
                print("[DEBUG] Background task created successfully")
            except Exception as task_error:
                print(f"[DEBUG] Error creating background task: {str(task_error)}")
                # Update status to error
                await db[INTERVIEW_DATA_COLLECTION].update_one(
                    {"_id": ObjectId(interview_id)},
                    {"$set": {
                        "status": "summary_error",
                        "summary_error": f"Error starting report generation: {str(task_error)}"
                    }}
                )
        
        return {"message": f"Interview data updated successfully", "id": interview_id}
    except Exception as e:
        error_msg = f"Error updating interview data: {str(e)}"
        print(f"[DEBUG] {error_msg}")
        import traceback
        print(f"[DEBUG] Traceback: {traceback.format_exc()}")
        return {"error": error_msg}
    
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


async def get_interview_data_by_id(id: str) -> Optional[Dict[str, Any]]:
    try:
        # Ensure database connection
        if db is None:
            await connect_to_mongo()
            
        # Convert string ID to ObjectId
        object_id = ObjectId(id)
        
        # Query the database
        data = await db[INTERVIEW_DATA_COLLECTION].find_one({"_id": object_id})
        
        # Return data (could be None if not found)
        return data
        
    except Exception as e:
        print(f"Error in get_interview_data_by_id: {str(e)}")
        # Re-raise to handle in the calling function
        raise