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
import json
import cv2
import numpy as np
import time
import json
import base64

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()
    print("Application shutdown: MongoDB connection closed.")


app = FastAPI(title="AI Interview Assistant API",
              lifespan=lifespan, root_path="/api")

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

    current_question_index = 0
    follow_up_mode = False
    total_questions = len(interview_data.get("interview_questions", []))

    message_history = []

    try:
        if total_questions > 0:
            current_question = interview_data["interview_questions"][current_question_index]

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

            is_last_question = current_question_index == total_questions - 1
            if is_last_question and follow_up_mode:
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

            if follow_up_mode:
                current_question_index += 1
                follow_up_mode = False

                next_question_text = interview_data["interview_questions"][current_question_index]
            else:
                next_question_text = await get_follow_up_question(message_history, interview_data)
                follow_up_mode = True

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
            "status": "unknown",
            "analysis": None,
        }
        
        if interview_data:
            response["candidate_name"] = interview_data.get("candidate_name", "")
            response["candidate_email"] = interview_data.get("candidate_email", "")
            response["status"] = interview_data.get("status", "unknown")
            response["analysis"] = interview_data.get("analysis")
            
        return response
        
    except HTTPException:
        raise

    except Exception as e:
        print(f"Error in get_interview_summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving interview data: {str(e)}")


class OpenCVAntiCheat:
    def __init__(self):
        # These cascades come with OpenCV - no extra downloads needed
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.profile_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_profileface.xml')

        # Violation tracking (No eye-related violations)
        self.violations = {
            'no_face': 0,
            'multiple_faces': 0,
            'looking_away': 0,
            'too_close': 0,
            'too_far': 0
        }

        self.total_frames = 0
        self.start_time = time.time()

        # For movement detection
        self.prev_face_center = None
        self.movement_threshold = 50

    def analyze_face_position(self, face, frame_shape):
        """Analyze if person is looking straight or away"""
        x, y, w, h = face

        # Face center
        face_center_x = x + w // 2
        face_center_y = y + h // 2

        # Frame center
        frame_center_x = frame_shape[1] // 2
        frame_center_y = frame_shape[0] // 2

        # Calculate deviations
        horizontal_deviation = abs(face_center_x - frame_center_x)
        vertical_deviation = abs(face_center_y - frame_center_y)

        # Normalize by frame size
        h_dev_ratio = horizontal_deviation / frame_shape[1]
        v_dev_ratio = vertical_deviation / frame_shape[0]

        # Check if looking straight (face centered)
        looking_straight = h_dev_ratio < 0.2 and v_dev_ratio < 0.15

        return {
            'looking_straight': looking_straight,
            'horizontal_deviation': h_dev_ratio,
            'vertical_deviation': v_dev_ratio,
            'face_center': (face_center_x, face_center_y)
        }
    def process_image_data(self, image_bytes):
        """Process image data sent from frontend"""
        try:
            # Convert bytes to OpenCV image
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                return None, None
            
            # Use existing processing logic
            processed_frame, metrics = self.process_frame(frame)
            
            # Convert back to base64 for frontend
            _, buffer = cv2.imencode('.jpg', processed_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            return frame_base64, metrics
            
        except Exception as e:
            print(f"Error processing image: {e}")
            return None, None
    def analyze_face_size(self, face, frame_shape):
        """Determine if person is too close or too far"""
        x, y, w, h = face

        # Face area vs frame area
        face_area = w * h
        frame_area = frame_shape[0] * frame_shape[1]
        face_ratio = face_area / frame_area

        # Classification
        if face_ratio < 0.02:
            return 'too_far', face_ratio
        elif face_ratio > 0.35:
            return 'too_close', face_ratio
        else:
            return 'good_distance', face_ratio

    def check_profile_face(self, gray_frame):
        """Check if person turned to profile (side view)"""
        profiles = self.profile_cascade.detectMultiScale(gray_frame, 1.3, 5)
        return len(profiles) > 0

    def process_frame(self, frame):
        """Main processing function"""
        self.total_frames += 1
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Detect frontal faces
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)

        violations_this_frame = []
        metrics = {}

        if len(faces) == 0:
            # Check for profile faces
            profile_detected = self.check_profile_face(gray)

            if profile_detected:
                violations_this_frame.append("Person turned to side profile")
                self.violations['looking_away'] += 1
                metrics['face_detected'] = True
                metrics['looking_straight'] = False
            else:
                violations_this_frame.append("No face detected")
                self.violations['no_face'] += 1
                metrics['face_detected'] = False
                metrics['looking_straight'] = False

            metrics['face_size_ratio'] = 0.0

        elif len(faces) > 1:
            # Multiple faces
            violations_this_frame.append("Multiple faces detected")
            self.violations['multiple_faces'] += 1

            # Use largest face
            largest_face = max(faces, key=lambda f: f[2] * f[3])
            faces = [largest_face]

        if len(faces) == 1:
            face = faces[0]
            x, y, w, h = face

            # Draw face rectangle
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

            metrics['face_detected'] = True

            # Analyze face position (gaze direction)
            position_analysis = self.analyze_face_position(face, frame.shape)
            metrics['looking_straight'] = bool(
                position_analysis['looking_straight'])
            metrics['horizontal_deviation'] = float(
                position_analysis['horizontal_deviation'])

            if not position_analysis['looking_straight']:
                violations_this_frame.append("Not looking straight at camera")
                self.violations['looking_away'] += 1

            # Analyze face size (distance)
            distance_status, face_ratio = self.analyze_face_size(
                face, frame.shape)
            metrics['face_size_ratio'] = float(face_ratio)

            if distance_status == 'too_far':
                violations_this_frame.append("Sitting too far from camera")
                self.violations['too_far'] += 1
            elif distance_status == 'too_close':
                violations_this_frame.append("Sitting too close to camera")
                self.violations['too_close'] += 1

            # Track movement (excessive movement detection)
            current_center = position_analysis['face_center']
            if self.prev_face_center is not None:
                movement = np.sqrt((current_center[0] - self.prev_face_center[0]) ** 2 +
                                   (current_center[1] - self.prev_face_center[1]) ** 2)
                if movement > self.movement_threshold:
                    violations_this_frame.append("Excessive movement detected")

            self.prev_face_center = current_center

        # Calculate overall metrics
        total_violations = sum(self.violations.values())
        violation_rate = (total_violations / self.total_frames) * \
            100 if self.total_frames > 0 else 0
        session_duration = time.time() - self.start_time

        # Compile final metrics - ensure all values are JSON serializable
        metrics.update({
            'current_violations': violations_this_frame,
            'violation_count': int(len(violations_this_frame)),
            'total_violation_rate': float(round(violation_rate, 2)),
            'session_duration': float(round(session_duration, 1)),
            'total_frames': int(self.total_frames),
            'violations_breakdown': {k: int(v) for k, v in self.violations.items()}
        })

        # Add visual indicators to frame
        self.add_visual_feedback(frame, violations_this_frame, metrics)

        return frame, metrics

    def add_visual_feedback(self, frame, violations, metrics):
        """Add text and visual feedback to frame"""
        # Status indicator in top-right
        status_color = (0, 255, 0) if len(violations) == 0 else (0, 0, 255)
        status_text = "✓ OK" if len(
            violations) == 0 else f"⚠ {len(violations)} Issues"
        cv2.putText(frame, status_text, (frame.shape[1] - 150, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)

        # List violations
        y_offset = 30
        for violation in violations:
            cv2.putText(frame, f"• {violation}", (10, y_offset),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
            y_offset += 20

        # Session stats at bottom
        stats_text = f"Violations: {sum(self.violations.values())} | Rate: {metrics['total_violation_rate']:.1f}%"
        cv2.putText(frame, stats_text, (10, frame.shape[0] - 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        time_text = f"Time: {metrics['session_duration']:.1f}s | Frames: {metrics['total_frames']}"
        cv2.putText(frame, time_text, (10, frame.shape[0] - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)


# Global detector


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("✅ Client connected for camera processing")
    
    # Create individual detector for this connection
    user_detector = OpenCVAntiCheat()
    
    try:
        while True:
            image_data = await websocket.receive_bytes()
            
            # Use user-specific detector
            processed_frame_b64, metrics = user_detector.process_image_data(image_data)
            
            if processed_frame_b64 and metrics:
                response_data = {
                    'frame': processed_frame_b64,
                    'metrics': metrics
                }
                await websocket.send_text(json.dumps(response_data))
            
    except WebSocketDisconnect:
        print("Client disconnected from camera processing")
    except Exception as e:
        print(f"WebSocket error: {e}")
if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting AI Interview Backend...")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)