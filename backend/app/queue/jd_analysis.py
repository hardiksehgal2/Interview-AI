# backend/app/queue/jd_analysis.py
from ..db.collections.files import files_collection
from litellm import completion
import os
from bson import ObjectId
import logging
import asyncio
openai_key = os.environ.get("OPENAI_API_KEY")

system_prompt = """
You are an AI job analyzer. Your task is to analyze the job description and return a concise summary. 
The summary should include all essential responsibilities, skills, qualifications, and expectations, 
as it will be used to evaluate candidate compatibility.
"""

async def _analyse_jd_async(candidate_id: str):
    print("Analyse jd Function Calling started")

    try:
        # ───────── fetch JD text ─────────
        doc = await files_collection.find_one({"_id": ObjectId(candidate_id)})
        jd = doc.get("job_description", "")

        # ───────── call LLM ─────────
        response = completion(
            model="openai/gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": jd},
            ],
        )
        summary = response["choices"][0]["message"]["content"]

        # ───────── update DB ─────────
        await files_collection.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": {"jd_summary": summary, "status": "jd analysis done"}},
        )

        # ───────── kick off next stage (lazy import) ─────────
        from .orchestrator import continue_to_resume_match  # noqa: WPS433
        print("Analyse jd Completed")

        continue_to_resume_match(candidate_id)

    except Exception as exc:
        logging.error(f"[JD] analysis failed for {candidate_id}: {exc}")
        await files_collection.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": {"status": "jd analysis failed"}},
        )


# ───────── RQ-friendly sync wrapper ─────────
def analyse_jd(candidate_id: str):
    """Entry-point for RQ worker (sync)."""
    print("Analyse jd started")
    asyncio.run(_analyse_jd_async(candidate_id))