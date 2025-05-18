# backend/app/queue/question_generator.py
import asyncio
import logging
import os

from bson import ObjectId
from litellm import completion

from ..db.collections.files import files_collection

# ─────────────────────────────────────────────────────────────
# ENV / LLM CONFIG
# ─────────────────────────────────────────────────────────────
os.environ.setdefault("GEMINI_API_KEY", os.getenv("GEMINI_API_KEY", ""))

PROMPT_TEMPLATE = """
You are an expert interviewer, who conducts interviews based on job descriptions and resumes.

Below are the job description and the candidate's resume. Your task is to generate 5 questions that
are relevant to both the job description and the candidate's background as presented in the resume.

Your main goal is to focus on the candidate's resume and ask questions based on the projects or skills
mentioned in the resume and the job description.

Job Description:
{jd}

Resume Text:
{resume}

Generate questions that:
1. Focus on the candidate's past experience and how it aligns with the job requirements.
2. Align the difficulty level of the questions with the minimum experience mentioned in the job description.

Provide the questions directly, without any introductory or concluding remarks.
"""


# ─────────────────────────────────────────────────────────────
# LLM helper
# ─────────────────────────────────────────────────────────────
async def _generate_questions_text(jd_summary: str, resume_text: str) -> str:
    prompt = PROMPT_TEMPLATE.format(jd=jd_summary, resume=resume_text)

    try:
        response = completion(
            model="gemini/gemini-2.5-flash-preview-04-17",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "text"},
        )
        return response.choices[0].message.content
    except Exception as exc:
        logging.error(f"[QUESTIONS] LLM error: {exc}")
        return ""


# ─────────────────────────────────────────────────────────────
# Async implementation (DB + LLM)
# ─────────────────────────────────────────────────────────────
async def _create_interview_questions_async(candidate_id: str):
    try:
        doc = await files_collection.find_one({"_id": ObjectId(candidate_id)})
        jd_summary = doc.get("jd_summary", "")
        resume_text = doc.get("resume", "")

        questions = await _generate_questions_text(jd_summary, resume_text)

        await files_collection.update_one(
            {"_id": ObjectId(candidate_id)},
            {
                "$set": {
                    "status": "questions_generated",
                    "interview_questions": questions,
                }
            },
        )

        print(f"[WORKER] Questions generated for {candidate_id}")

        # If you plan another stage, lazy-import and enqueue here.
        # from .orchestrator import continue_to_next_stage
        # continue_to_next_stage(candidate_id)

    except Exception as exc:
        logging.error(f"[QUESTIONS] failed for {candidate_id}: {exc}")
        await files_collection.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": {"status": "questions_generation_failed"}},
        )


# ─────────────────────────────────────────────────────────────
# RQ-friendly sync wrapper (entry-point)
# ─────────────────────────────────────────────────────────────
def create_interview_questions(candidate_id: str):
    """Entry-point used by RQ worker (sync)."""
    asyncio.run(_create_interview_questions_async(candidate_id))
