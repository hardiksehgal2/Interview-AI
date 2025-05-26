import asyncio
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from typing import Optional, List, AsyncGenerator
import io
from contextlib import asynccontextmanager
from services.utils import extract_text_from_pdf_stream, pdf_to_base64
from services.llm import call_llm_for_interview_prep, get_follow_up_question, process_interview_completion
from services.tts_services import text_to_speech_sarvam_base64_array
from services.model_schema import InterviewDataStorage, JDCreate, InterviewSummaryResponse
from services.mongo_op import connect_to_mongo, close_mongo_connection, save_resume, save_interview_data, get_resume_by_jd, get_jd_by_id, get_interview_data_by_id, get_jd_by_domain, save_jd, update_interview_data
from services.asr_services import transcribe_audio
from services.camera import OpenCVAntiCheat
import json
import base64
import cv2
import numpy as np


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()
    print("Application shutdown: MongoDB connection closed.")


app = FastAPI(title="AI Interview Assistant API", lifespan=lifespan, root_path="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
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
        resume_bytes_io = io.BytesIO(resume_content)

        resume_text = extract_text_from_pdf_stream(resume_bytes_io)
        resume_base64_str = pdf_to_base64(resume_bytes_io)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing resume file: {e}")
    finally:
        await resume_file.close()

    if not resume_text.strip():
        print(f"Warning: No text extracted from resume: {resume_file.filename}")
        raise HTTPException(status_code=422, detail="Could not extract text from resume PDF.")

    result = await save_resume(candidate_name, resume_base64_str, resume_text, jd_id)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    try:
        llm_result = await call_llm_for_interview_prep(resume_text, jd_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during LLM processing: {e}")

    interview_data_to_store_dict = {
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "resume_text": resume_text,
        "jd_id": jd_id,
        "interview_questions": llm_result.get('interview_questions'),
        "status": "interview_scheduled"
    }

    interview_data_to_store = InterviewDataStorage(**interview_data_to_store_dict)
    save_res = await save_interview_data(interview_data_to_store)

    if 'error' in save_res:
        raise HTTPException(status_code=500, detail=save_res['error'])

    return {'message': "Interview preparation data processed and stored successfully.", 'interview_id': save_res['id']}


@app.websocket("/ws/interview/{interview_id}/")
async def websocket_interview_endpoint(websocket: WebSocket, interview_id: str):
    await websocket.accept()

    interview_data = await get_interview_data_by_id(interview_id)
    if not interview_data:
        await websocket.send_text(f"ERROR:Interview data not found for ID {interview_id}")
        await websocket.close(code=1008)
        return

    total_questions = len(interview_data.get("interview_questions", []))

    message_history = []

    try:
        if total_questions > 0:
            current_question = interview_data["interview_questions"][0]

            message_history.append({"role": "assistant", "content": current_question})

            initial_audio_array = await text_to_speech_sarvam_base64_array(current_question)
            await websocket.send_text(f"AI_QUESTION_TEXT:{current_question}")

            audio_message = {"type": "audio_array", "audios": initial_audio_array}
            await websocket.send_text(f"AI_AUDIO_ARRAY:{json.dumps(audio_message)}")
        else:
            await websocket.send_text("ERROR:No interview questions found")
            await websocket.close(code=1008)
            return

        while True:
            candidate_response_audio = await websocket.receive_bytes()
            print(f"Received audio response from candidate for interview {interview_id}, size: {len(candidate_response_audio)} bytes")

            audio_size_mb = len(candidate_response_audio) / (1024 * 1024)
            if audio_size_mb > 25:  # Adjust based on your tier
                await websocket.send_text("ERROR:Audio file too large. Please keep recordings under 25MB.")
                continue

            candidate_response_text = await transcribe_audio(candidate_response_audio)

            if not candidate_response_text:
                await websocket.send_text("ERROR:Failed to transcribe audio. Please try speaking again.")
                continue

            print(f"\n\nTranscribed (via Groq for {interview_id}): {candidate_response_text}\n\n")

            message_history.append({"role": "user", "content": candidate_response_text})

            next_question_text = await get_follow_up_question(message_history, interview_data)
            if '[END]' in next_question_text:
                closing_text = f"Thank you for all your thoughtful responses. That concludes our interview today. We'll be in touch regarding next steps.\nInterview ID: {interview_id} use this ID to check your interview status."

                message_history.append({"role": "assistant", "content": closing_text})

                closing_audio_array = await text_to_speech_sarvam_base64_array(closing_text)
                await websocket.send_text(f"AI_QUESTION_TEXT:{closing_text}")

                audio_message = {"type": "audio_array", "audios": closing_audio_array}
                await websocket.send_text(f"AI_AUDIO_ARRAY:{json.dumps(audio_message)}")

                await process_interview_completion(interview_data, message_history)
                await asyncio.sleep(1)
                await websocket.close(code=1000)  # Normal Closure
                print(f"Interview {interview_id} completed. Closing WebSocket connection.")

                return

            else:
                message_history.append({"role": "assistant", "content": next_question_text})

                print(f"Next question for {interview_id}: {next_question_text}")

                question_audio_array = await text_to_speech_sarvam_base64_array(next_question_text)
                await websocket.send_text(f"AI_QUESTION_TEXT:{next_question_text}")

                audio_message = {"type": "audio_array", "audios": question_audio_array}
                await websocket.send_text(f"AI_AUDIO_ARRAY:{json.dumps(audio_message)}")

    except WebSocketDisconnect:
        print(f"Client disconnected from interview {interview_id}")
        try:
            update_result = await update_interview_data(interview_id=interview_id, status="interview_interrupted", message_history=message_history)
            if "error" in update_result:
                print(f"Error saving interrupted state interview data: {update_result['error']}")
        except RuntimeError:
            pass

    except Exception as e:
        print(f"Error in WebSocket for interview {interview_id}: {str(e)}")
        try:
            update_result = await update_interview_data(interview_id=interview_id, status="interview_error", message_history=message_history)
            if "error" in update_result:
                print(f"Error saving error state interview data: {update_result['error']}")
            await websocket.close(code=1011)  # Internal Error
        except RuntimeError:
            pass


@app.get("/interview/{interview_id}", response_model=InterviewSummaryResponse, tags=["Interviews"])
async def get_interview_summary(interview_id: str):
    try:
        interview_data = await get_interview_data_by_id(interview_id)
            
        if not interview_data:
            raise HTTPException(status_code=404, detail=f"Interview with ID {interview_id} not found")
            
        response = {
            "candidate_name": "",
            "candidate_email": "",
            "message_history": [],
            "status": "unknown",
            "analysis": None,
        }
        
        if interview_data:
            response["candidate_name"] = interview_data.get("candidate_name", "")
            response["candidate_email"] = interview_data.get("candidate_email", "")
            response["status"] = interview_data.get("status", "unknown")
            response["analysis"] = interview_data.get("analysis")
            response["message_history"] = interview_data.get("message_history")
            
        return response
        
    except HTTPException:
        raise

    except Exception as e:
        print(f"Error in get_interview_summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving interview data: {str(e)}")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("✅ Client connected for camera processing")
    
    detector = OpenCVAntiCheat()

    try:
        while True:
            # Receive image data from frontend
            image_data = await websocket.receive_bytes()
            
            # Decode the image from bytes to OpenCV format
            # Assuming the frontend sends base64-encoded image
            try:
                # If receiving base64 string
                if isinstance(image_data, str):
                    image_bytes = base64.b64decode(image_data)
                else:
                    # If receiving raw bytes
                    image_bytes = image_data
                
                # Convert bytes to numpy array
                nparr = np.frombuffer(image_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame is None:
                    print("Failed to decode image")
                    continue
                
                # Process the frame
                processed_frame, metrics = detector.process_frame(frame)
                
                # Encode the processed frame back to base64
                _, buffer = cv2.imencode('.jpg', processed_frame)
                processed_frame_b64 = base64.b64encode(buffer).decode('utf-8')
                
                # Send response
                response_data = {
                    'frame': processed_frame_b64,
                    'metrics': metrics
                }
                await websocket.send_text(json.dumps(response_data))
                
            except Exception as e:
                print(f"Error processing frame: {e}")
                continue
            
    except WebSocketDisconnect:
        print("Client disconnected from camera processing")
    except Exception as e:
        print(f"WebSocket error: {e}")