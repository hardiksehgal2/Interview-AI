# backend/app/queue/resume_matching.py
import asyncio
import json
import logging
import os

from bson import ObjectId
from litellm import completion

from ..db.collections.files import files_collection

openai_key = os.getenv("OPENAI_API_KEY")

system_prompt = """
You are a Filter agent. Your job is to analyse job description and candidate's resume and see if it is matching the job description or not.
If the resume matches around 60% then the candidate is passed; otherwise, failed. 

IMPORTANT: You must respond with a JSON object in this EXACT format, with no additional text:
{"candidate_pass":"true"} or {"candidate_pass":"false"}

No other format is acceptable. Do not include explanations, markdown, code blocks, or any other text.
"""

# ────────────────────────────────────────────────────────────────
# Helper – call LLM & return verdict dict
# ────────────────────────────────────────────────────────────────
async def _evaluate_candidate_fit_async(jd_summary: str, resume_text: str) -> dict:
    try:
        response = completion(
            model="openai/gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"JD Summary:\n{jd_summary}\n\nResume:\n{resume_text}"},
            ],
            response_format={"type": "json_object"},
        )
        raw_content = response["choices"][0]["message"]["content"]
        print(f"Raw response from LLM: {raw_content}")
        
        # Try to clean up the response before parsing
        cleaned_content = raw_content.strip()
        return json.loads(cleaned_content)
    except Exception as exc:
        logging.error(f"[RESUME] LLM evaluation failed: {exc}")
        return {"candidate_pass": "unknown", "error": str(exc)}

# ────────────────────────────────────────────────────────────────
# Async implementation doing DB + orchestration
# ────────────────────────────────────────────────────────────────
async def _filter_candidate_async(candidate_id: str):
    try:
        doc = await files_collection.find_one({"_id": ObjectId(candidate_id)})
        jd_summary = doc.get("jd_summary", "")
        resume_text = doc.get("resume", "")
        print("Question generator Function calling started")

        result = await _evaluate_candidate_fit_async(jd_summary, resume_text)

        if result.get("candidate_pass") == "true":
            status = "candidate passed"
            # Lazy‑import to avoid circular import
            from .orchestrator import continue_to_question_gen  # noqa: WPS433
            print("Question generator Completed")

            continue_to_question_gen(candidate_id)
        elif result.get("candidate_pass") == "false":
            status = "candidate failed"
        else:
            print("Question generator started")

            status = "candidate match error"

        await files_collection.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": {"status": status, "resume_match_result": result}},
        )
    except Exception as exc:
        logging.error(f"[RESUME] match step failed for {candidate_id}: {exc}")
        print("Question generator 500 error")

        await files_collection.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": {"status": "resume match failed"}},
        )

# ────────────────────────────────────────────────────────────────
# RQ‑friendly sync wrapper
# ────────────────────────────────────────────────────────────────

def filter_candidate(candidate_id: str):
    """Entry‑point used by RQ worker (sync)."""
    print("Question generator started")

    asyncio.run(_filter_candidate_async(candidate_id))