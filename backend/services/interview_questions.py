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


class InterviewQuestion(BaseModel):
    question: str = Field(description="The interview question.")
    category: str = Field(description="Category of the question (e.g., Technical, Behavioral, Situational, Resume-specific).")
    topic: str = Field(description="The specific skill or experience the question targets.")

class InterviewQuestions(BaseModel):
    introduction_questions: List[str] = Field(description="Ice-breaker and introductory questions.")
    technical_questions: List[str] = Field(description="Questions to assess technical skills mentioned in the JD and resume.")
    behavioral_questions: List[str] = Field(description="Questions to assess soft skills and past behavior in professional situations.")
    situational_questions: List[str] = Field(description="Hypothetical scenarios to evaluate problem-solving and decision-making skills.")
    project_deep_dive_questions: List[str] = Field(description="Specific questions about projects and work experience listed in the resume.")


async def generate_interview_questions(resume_data: dict = None, resume_text: str = None, jd_text: str = None) -> Dict[str, Any]:
    resume_input = json.dumps(resume_data, indent=2) if resume_data else resume_text
    
    if not resume_input or not jd_text:
        raise ValueError("Both resume data/text and job description text must be provided.")
    
    prompt = f"""
As an expert technical recruiter, your task is to generate a comprehensive set of interview questions based on the provided job description and the candidate's resume. The questions should be insightful, probing, and tailored to assess the candidate's suitability for the role.

Analyze the alignment and gaps between the resume and the job description to formulate your questions.

**Job Description:**
<JobDescription>
{jd_text}
</JobDescription>

**Candidate's Resume:**
<Resume>
{resume_input}
</Resume>

Please generate a variety of questions and categorize them as follows:
- **Introduction Questions:** To start the conversation and understand the candidate's motivations.
- **Technical Questions:** To verify the technical skills and knowledge claimed in the resume against the job requirements.
- **Behavioral Questions:** To evaluate past behavior and soft skills using the STAR method (Situation, Task, Action, Result).
- **Situational Questions:** To assess problem-solving abilities with hypothetical scenarios relevant to the role.
- **Project Deep Dive Questions:** To delve into specific projects or work experiences from the resume, focusing on the candidate's individual contribution, challenges faced, and outcomes.

Your output must be in a structured JSON format.
"""
    
    try:
        response = await acompletion(
            model="gemini/gemini-1.5-flash",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": "Generate the interview questions."}
            ],
            temperature=0.4,
            response_model=InterviewQuestions,
        )
        
        llm_response = json.loads(response['choices'][0]['message']['content'])
        print(f"Generated Interview Questions:\n{json.dumps(llm_response, indent=2)}\n\n")
        
        return llm_response

    except Exception as e:
        print(f"Error generating interview questions: {e}")
        raise e