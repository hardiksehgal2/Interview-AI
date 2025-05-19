# backend/app/server.py
from fastapi import FastAPI, Path, UploadFile, File, Form
from .pydantic_models.candidate import CandidateInfo
from .db.collections.files import files_collection, FieldSchema
import logging
from .queue.orchestrator import start_pipeline
from bson import ObjectId
import fitz  
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Make sure CORS middleware is added before any other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]  # Expose headers to the browser
)

@app.get("/")
def greeting():
    return {"status": "healthy"}

@app.get("/user-info/{id}")
async def get_file_by_id(id: str = Path(..., description="Id of the file")):
    try:
        db_file = await files_collection.find_one({"_id": ObjectId(id)})

        if not db_file:
            return {"error": "Candidate not found"}

        return {
            "_id": str(db_file.get("_id")),
            "name": db_file.get("name"),
            "email": db_file.get("email"),
            "resume": db_file.get("resume"),
            "job_description": db_file.get("job_description"),
            "status": db_file.get("status"),
            "jd_summary": db_file.get("jd_summary"),
            "resume_match_result": db_file.get("resume_match_result"),
            "interview_questions": db_file.get("interview_questions"),
        }
    except Exception as e:
        logging.error(f"Error fetching candidate info: {e}")
        return {"error": "Failed to retrieve candidate info"}


@app.post("/user-info")
async def user_information(
    name: str = Form(...),
    email: str = Form(...),
    job_description: str = Form(...),
    resume: UploadFile = File(...)
):
    try:
        if resume.content_type != "application/pdf":
            return {"error": "Only PDF resumes are supported"}

        contents = await resume.read()

        # Extract text using PyMuPDF
        with fitz.open(stream=contents, filetype="pdf") as doc:
            extracted_text = ""
            for page in doc:
                extracted_text += page.get_text()

        # Insert into Mongo
        db_file = await files_collection.insert_one(
            FieldSchema(
                name=name,
                email=email,
                resume=extracted_text.strip(),
                job_description=job_description,
                status="processing started"
            ).model_dump()
        )

        candidate_id = str(db_file.inserted_id)

        # Start background processing
        start_pipeline(candidate_id)

        return {"inserted_id": candidate_id}

    except Exception as e:
        logging.error(f"Failed to process candidate info: {e}")
        return {"error": "Failed to process candidate info"}