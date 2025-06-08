from typing import IO, Dict, Any, List
from litellm import acompletion
import json
from .model_schema import ResumeAnalysisResult, InterviewAnalysis
from .mongo_op import get_jd_by_id, update_interview_data, update_candidate_report
import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import json

load_dotenv()

os.environ['GEMINI_API_KEY'] = os.getenv('GEMINI_API_KEY')
os.environ['GROQ_API_KEY'] = os.getenv('GROQ_API_KEY')


class DetailedAnalysis(BaseModel):
    summary: str = Field(description="A concise summary of the candidate's overall performance in the interview.")
    strengths: str = Field(description="A list of the candidate's key strengths demonstrated during the interview, with specific examples.")
    areas_for_improvement: str = Field(description="A list of the candidate's weaknesses or areas for improvement, with constructive feedback.")
    communication_analysis: str = Field(description="Detailed analysis of communication skills, including clarity, conciseness, confidence, use of professional vocabulary, and the frequency and impact of filler words (e.g., 'um', 'like').")
    technical_proficiency: str = Field(description="In-depth assessment of the candidate's technical knowledge and problem-solving skills, referencing specific answers against the job description and resume.")
    behavioral_competencies: str = Field(description="Evaluation of behavioral skills like teamwork, leadership, and problem-solving. Note if the candidate used structured responses like the STAR method and assess the quality of their examples.")


class CandidateReport(BaseModel):
    technical_score: float = Field(ge=0, le=100, description="Score for technical skills based on correctness, depth, and relevance of answers to the job requirements.")
    communication_score: float = Field(ge=0, le=100, description="Score for communication ability, factoring in clarity, vocabulary, listening skills, and minimal use of filler words.")
    behavioral_score: float = Field(ge=0, le=100, description="Score for behavioral competencies and alignment with desired soft skills and team culture.")
    overall_score: float = Field(ge=0, le=100, description="A weighted average score reflecting the overall assessment of the candidate's performance.")
    analysis: DetailedAnalysis = Field(description="A detailed breakdown of the candidate's performance across different areas.")


async def generate_candidate_report(interview_data: dict) -> Dict[str, Any]:
    SYSTEM_PROMPT = """
You are a highly experienced AI Talent Acquisition Specialist. Your task is to perform a deep, multi-faceted analysis of a candidate's interview performance. You will be given a job description, the candidate's resume, and the full transcript of their interview.

Your analysis must be objective, critical, and detailed. Go beyond surface-level answers to evaluate the nuances of the candidate's responses, including the communication style and structure.

### Your analysis must cover the following dimensions:

1. **Technical Proficiency (Weight: 50%)**:
  - Assess the depth and accuracy of the technical answers. How well do the skills, as demonstrated in the interview, align with the requirements in the Job Description and the experience on the Resume?
  - Evaluate the problem-solving and analytical skills. Did he/she provide clear, logical solutions?
  - Note any discrepancies between the resume and the demonstrated knowledge.

2. **Communication Skills (Weight: 30%)**:
  - **Clarity and Conciseness**: Were answers clear, to the point, and easy to understand?
  - **Vocabulary & Tone**: Did he/she use professional language and relevant technical terminology? Was the tone confident and engaging?
  - **Filler Words**: Critically analyze the use of filler words (e.g., "um," "ah," "like," "you know"). Comment on whether the frequency was distracting or indicated a lack of confidence.
  - **Listening Skills**: Did he/she listen carefully to the questions before answering, or interrupted or misinterpreted them?

3. **Behavioral Competencies (Weight: 20%)**:
  - Assess responses to behavioral questions. Did he/she use frameworks like the STAR (Situation, Task, Action, Result) method to structure the answers?
  - Evaluate the demonstration of soft skills (e.g., teamwork, leadership, adaptability) through any examples.

**Scoring**:
- Provide a score from 0 to 100 for each dimension: `technical_score`, `communication_score`, and `behavioral_score`.
- Calculate an `overall_score` from 0 to 100. This must be a weighted average based on the weights provided above (50% Technical, 30% Communication, 20% Behavioral).

"""
    try:
        jd_data = await get_jd_by_id(interview_data['jd_id'])
        jd_text = jd_data.get("jd_text", "Not Available")

        transcript = ""
        for msg in interview_data['message_history']:
            role = "Interviewer" if msg.get("role") == "assistant" else "Candidate"
            content = msg.get("content", "")
            transcript += f"{role}: {content}\n\n"
        
        INPUT_PROMPT = f"""
Please analyze the following interview materials and generate a detailed candidate report based on the system instructions.

**Candidate Name**: {interview_data['candidate_name']}
**Candidate Email**: {interview_data['candidate_email']}

**Job Description**:
---
{jd_text}
---

**Resume**:
---
{interview_data['resume_text']}
---

**Interview Transcript**:
---
{transcript}
---
"""

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": INPUT_PROMPT}
        ]

        response = await acompletion(
            model="gemini/gemini-1.5-pro-latest",  # Using a more powerful model for deeper analysis
            messages=messages,
            response_model=CandidateReport, # Use the new, detailed Pydantic model
            temperature=0.3,
        )

        response_content = json.loads(response['choices'][0]['message']['content'])
        print(f"AI Interview Analysis Report:\n{json.dumps(response_content, indent=2)}\n\n")

        await update_candidate_report(interview_data['_id'], response_content, "summary_generated")
        return response_content

    except Exception as e:
        error_msg = f"Error generating candidate report: {str(e)}"
        print(error_msg)
        try:
            await update_candidate_report(interview_data['_id'], {"error": error_msg}, "summary_error")
        except Exception as update_error:
            print(f"Error updating status after failure: {str(update_error)}")
        raise e
