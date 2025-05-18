# backend/app/server.py
from fastapi import FastAPI, Path
from .pydantic_models.candidate import CandidateInfo
from .db.collections.files import files_collection, FieldSchema
import logging
from .queue.orchestrator import start_pipeline
from bson import ObjectId

app = FastAPI()

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
async def user_information(info: CandidateInfo):
    try:
        db_file = await files_collection.insert_one(
            document=FieldSchema(
                name=info.name,
                email=info.email,
                resume=info.resume,
                job_description=info.job_description,
                status="processing started"
            ).model_dump()
        )
        candidate_id = str(db_file.inserted_id)

        start_pipeline(candidate_id)

        return {"inserted_id": candidate_id}

    except Exception as e:
        logging.error(f"Failed to insert candidate info: {e}")
        return {"error": "Failed to process candidate info"}
