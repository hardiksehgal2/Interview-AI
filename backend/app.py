# main.py
import os
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional, List, AsyncGenerator
import io
from contextlib import asynccontextmanager
from fastapi import  HTTPException, status
from bson import ObjectId

from motor.motor_asyncio import AsyncIOMotorDatabase
from services import extract_text_from_pdf_stream, call_llm_for_interview_prep, get_follow_up_question, text_to_speech
from utils import pdf_to_base64
from model_schema import InterviewDataStorage, JDCreate, InterviewSummaryResponse
from mongo_op import db, connect_to_mongo, close_mongo_connection, save_resume, save_interview_data, get_resume_by_jd, get_jd_by_id, get_interview_data_by_id, get_jd_by_domain, save_jd, update_interview_data
@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()
    print("Application shutdown: MongoDB connection closed.")

app = FastAPI(title="AI Interview Assistant API", lifespan=lifespan , root_path="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

# # Root endpoint to serve the frontend
# @app.get("/")
# async def read_root():
#     # Redirect to the index.html
#     return FileResponse("frontend/index.html")
MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = "ai_interview"
client = None
JD_COLLECTION = "job_description"
RESUME_COLLECTION = "uploaded_resume"
INTERVIEW_DATA_COLLECTION = "interview_data"

@app.get("/")  # This will be accessible at /api/ due to your root_path
def health_check():
    return {"status": "healthy", "message": "AI Interview Assistant API is running"}

@app.post("/jd/", tags=["Job Descriptions"])
async def upload_job_description(jd: JDCreate):
    """
    Upload a new job description or update existing one for a domain.
    """
    try:
        result = await save_jd(jd.domain.replace("/", "-"), jd.jd_text)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving job description: {str(e)}")


@app.get("/jd/{domain}/", tags=["Job Descriptions"])
async def fetch_jd_by_domain(domain: str):
    """
    Fetch job descriptions by domain. Use 'all' to get all job descriptions.
    """
    try:
        domain = domain.replace("/", "-")
        jd_list = await get_jd_by_domain(domain)
        if not jd_list:
            return JSONResponse(status_code=404, content={"message": f"No job descriptions found for domain: {domain}"})
        return jd_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching job descriptions: {str(e)}")


@app.get("/resumes/{jd_id}/", tags=["Resumes"])
async def fetch_resume(jd_id: str):
    """
    Fetches a stored resume (Base64 string) by candidate_name.
    """
    try:
        resume_data = await get_resume_by_jd(jd_id)
        return resume_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching resume: {e}")


@app.post("/resumes/apply/", tags=["Resumes"])
async def analyze_resume(candidate_name: str = Form(...), candidate_email: str = Form(...), resume_file: UploadFile = File(...), jd_id: str = Form(...)):
    if not resume_file.filename or not resume_file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type or missing filename. Only PDF is allowed.")

    jd_text = await get_jd_by_id(jd_id)

    if not jd_text:
        raise HTTPException(status_code=404, detail="Job description not found.")

    resume_text = ""
    resume_base64_str = ""
    
    try:
        # Read resume file contents
        resume_content = await resume_file.read()
        # Create BytesIO streams for PyPDF2 and base64 conversion
        with io.BytesIO(resume_content) as resume_bytes_io_for_text:
            resume_text = extract_text_from_pdf_stream(resume_bytes_io_for_text)
        with io.BytesIO(resume_content) as resume_bytes_io_for_base64:
            resume_base64_str = pdf_to_base64(resume_bytes_io_for_base64) # Convert original resume to base64
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing resume file: {e}")
    finally:
        await resume_file.close()

    if not resume_text.strip():
        print(f"Warning: No text extracted from resume: {resume_file.filename}")
        raise HTTPException(status_code=422, detail="Could not extract text from resume PDF. The PDF might be image-based or empty.")
    
    result = await save_resume(candidate_name, resume_base64_str, resume_text, jd_id)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    try:
        llm_result = await call_llm_for_interview_prep(resume_text, jd_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during LLM processing: {e}")

    # Store in 'interview_data' collection
    interview_data_to_store_dict = {
        "candidate_name": llm_result.get('candidate_name'),
        "candidate_email": llm_result.get('candidate_email'),
        "resume_text": resume_text,
        "jd_id": jd_id,
        "interview_questions": llm_result.get('interview_questions'),
        "status":"interview_scheduled"
    }
    
    interview_data_to_store = InterviewDataStorage(**interview_data_to_store_dict)
    save_res = await save_interview_data(interview_data_to_store)
    
    if 'error' in save_res:
        raise HTTPException(status_code=500, detail=save_res['error'])

    return {
        'message': "Interview preparation data processed and stored successfully.",
        'interview_id': save_res['id']
    }


@app.websocket("/ws/interview/{interview_id}/")
async def websocket_interview_endpoint(websocket: WebSocket, interview_id: str):
    await websocket.accept()
    
    # Get interview data
    interview_data = await get_interview_data_by_id(interview_id)
    if not interview_data:
        await websocket.send_text(f"ERROR:Interview data not found for ID {interview_id}")
        await websocket.close(code=1008)
        return
    
    # Initialize interview state
    current_question_index = 0
    follow_up_mode = False
    total_questions = len(interview_data.get("interview_questions", []))
    
    # Initialize message history for LLM
    message_history = []
    
    try:
        # Start with the first pre-prepared question
        if total_questions > 0:
            current_question = interview_data["interview_questions"][current_question_index]
            
            # Add this question to message history
            message_history.append({
                "role": "assistant", 
                "content": current_question
            })
            
            # Convert to speech and send both text and audio
            initial_audio = await text_to_speech(current_question)
            await websocket.send_text(f"AI_QUESTION_TEXT:{current_question}")
            await websocket.send_bytes(initial_audio)
        else:
            await websocket.send_text("ERROR:No interview questions found")
            await websocket.close(code=1008)
            return
        
        while True:
            # Receive candidate's answer
            candidate_response_text = await websocket.receive_text()
            print(f"Candidate (via WebSocket for {interview_id}): {candidate_response_text}")
            
            # Add candidate response to message history
            message_history.append({
                "role": "user",
                "content": candidate_response_text
            })
            
            # # Check for manual end of interview phrases (override)
            # if "thank you" in candidate_response_text.lower() or "that's all" in candidate_response_text.lower():
            #     closing_text = "Thank you for your time. This concludes the interview."
            #     message_history.append({
            #         "role": "assistant",
            #         "content": closing_text
            #     })
            #     closing_audio = await text_to_speech(closing_text)
            #     await websocket.send_text(f"AI_QUESTION_TEXT:{closing_text}")
            #     await websocket.send_bytes(closing_audio)
            #     break
            
            # Check if we've reached the end of the interview
            # End when: last question (index == total-1) AND in follow_up_mode AND just received response
            is_last_question = current_question_index == total_questions - 1
            if is_last_question and follow_up_mode:
                # We've just received a response to the follow-up of the last question
                # This is where we should end the interview
                closing_text = f"Thank you for all your thoughtful responses. That concludes our interview today. We'll be in touch regarding next steps. \n Interview ID: {interview_id} use"
                message_history.append({
                    "role": "assistant",
                    "content": closing_text
                })
                closing_audio = await text_to_speech(closing_text)
                await websocket.send_text(f"AI_QUESTION_TEXT:{closing_text}")
                await websocket.send_bytes(closing_audio)

                # Store message_history directly as dictionaries
                update_result = await update_interview_data(
                    interview_id=interview_id,
                    status="interview_completed",
                    message_history=message_history  # Pass the list of dictionaries directly
                )
                print(f"Interview {interview_id} completed and saved to database.")
                if "error" in update_result:
                    print(f"Error updating interview data: {update_result['error']}")
                break
            
            # Decide on next action based on current mode
            if follow_up_mode:
                # We've just asked a follow-up and got a response
                # Move to the next main question
                current_question_index += 1
                follow_up_mode = False
                
                # Ask the next pre-prepared question
                next_question_text = interview_data["interview_questions"][current_question_index]
            else:
                # We've just asked a main question and got a response
                # Generate a follow-up question based on message history
                next_question_text = await get_follow_up_question(
                    message_history,
                    interview_data
                )
                follow_up_mode = True
            
            # Add the generated question to message history
            message_history.append({
                "role": "assistant",
                "content": next_question_text
            })
            
            print(f"Next question for {interview_id}: {next_question_text}")
            
            # Convert to speech and send
            question_audio = await text_to_speech(next_question_text)
            await websocket.send_text(f"AI_QUESTION_TEXT:{next_question_text}")
            await websocket.send_bytes(question_audio)
            
    except WebSocketDisconnect:
        print(f"Client disconnected from interview {interview_id}")
        update_result = await update_interview_data(
            interview_id=interview_id,
            status="interview_interrupted",
            message_history=message_history
        )
    except Exception as e:
        print(f"Error in WebSocket for interview {interview_id}: {str(e)}")
        try:
            update_result = await update_interview_data(
                interview_id=interview_id,
                status="interview_error",
                message_history=message_history
            )
            if "error" in update_result:
                print(f"Error saving error state interview data: {update_result['error']}")
            await websocket.close(code=1011)  # Internal Error
        except RuntimeError:
            pass

@app.get("/interview/{interview_id}", response_model=InterviewSummaryResponse)
async def get_interview_summary(interview_id: str):
    """
    Get interview summary data including candidate info and analysis results
    """
    try:
        # Check if the ID is a valid ObjectId
        if not ObjectId.is_valid(interview_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid interview ID format"
            )
        
        # Get interview data with explicit error handling
        try:
            # Print debug info
            print(f"Attempting to retrieve interview with ID: {interview_id}")
            
            # Use the existing function with explicit error handling
            interview_data = await get_interview_data_by_id(interview_id)
            
            # Print what we got
            print(f"Retrieved data: {type(interview_data)}")
            if interview_data:
                print(f"Keys in data: {interview_data.keys()}")
            else:
                print("No data retrieved, interview_data is None")
                
        except Exception as db_error:
            print(f"Database error: {str(db_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(db_error)}"
            )
            
        # Check if interview exists
        if not interview_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Interview with ID {interview_id} not found"
            )
            
        # Safely build response
        response = {
            "candidate_name": "",
            "candidate_email": "",
            "status": "unknown",
            "analysis": None,
            "summary_error": None
        }
        
        # Only try to access keys if we have data
        if interview_data:
            response["candidate_name"] = interview_data.get("candidate_name", "")
            response["candidate_email"] = interview_data.get("candidate_email", "")
            response["status"] = interview_data.get("status", "unknown")
            response["analysis"] = interview_data.get("analysis")
            response["summary_error"] = interview_data.get("summary_error")
            
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Enhanced error logging
        import traceback
        print(f"Error in get_interview_summary: {str(e)}")
        print(traceback.format_exc())
        
        # Handle other exceptions
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving interview data: {str(e)}"
        )