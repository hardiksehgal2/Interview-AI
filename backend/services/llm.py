from typing import IO, Dict, Any, List
from litellm import acompletion
import json
from .model_schema import ResumeAnalysisResult, InterviewAnalysis
from .mongo_op import get_jd_by_id, update_interview_data, update_candidate_report
import os
from dotenv import load_dotenv

load_dotenv()

os.environ['GEMINI_API_KEY'] = os.getenv('GEMINI_API_KEY')
os.environ['GROQ_API_KEY'] = os.getenv('GROQ_API_KEY')
# os.environ['LITELLM_LOG'] = "DEBUG"


async def call_llm_for_interview_prep(resume_text: str, jd_text: str) -> Dict[str, Any]:
    prompt = f"""
Given the following job description and resume text, extract candidate name, email and generate 2 interview questions that will help assess the candidate's suitability for the role.
- The questions should be relevant to both the job description and the candidate's background as presented in the resume.
- The first question should be an introductory question to get to know the candidate better. You should directly ask the candidate to introduce themselves, with a greeting.
- The questions should prioritize the candidate's experience and skills as they relate to the job description.

Resume Text:
```
{resume_text}
```

Job Description Text:
```
{jd_text}
```
"""
    try:
        response = await acompletion(
            model="gemini/gemini-2.5-flash-preview-04-17",  #"groq/qwen-qwq-32b", # 
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            response_format=ResumeAnalysisResult,
        )
        
        llm_response = json.loads(response['choices'][0]['message']['content'])
        print(f"AI analysis:\n{llm_response}\n\n")
             
        return llm_response

    except Exception as e:
        print(f"Error in LLM analysis: {e}")
        raise e


async def get_follow_up_question(message_history: List[Dict[str, str]], interview_data: dict) -> str:
    system_prompt = f"""You are an AI interviewer conducting a job interview.

CANDIDATE INFORMATION:
- Name: {interview_data.get('candidate_name')}

- RESUME TEXT: {interview_data.get('resume_text', '')}...

---

YOUR TASK:
Generate ONE thoughtful follow-up question based on the candidate's most recent response.
Your follow-up should:
1. Probe deeper into their answer
2. Ask for specific examples if they were vague
3. Challenge assumptions if appropriate
4. Evaluate their critical thinking
5. Relate to the job position they're interviewing for

Be conversational and sound natural. Your response should ONLY contain the follow-up question text.
Do not add any commentary, explanations, or notes.
"""

    system_message = {"role": "system", "content": system_prompt}
    
    messages = [system_message] + message_history
    
    try:
        response = await acompletion(
            model="gemini/gemini-2.5-flash-preview-04-17",
            messages=messages,
            temperature=0.6,
        )
        print(response)
        
        follow_up_question = response['choices'][0]['message']['content']
        return follow_up_question.strip()

    except Exception as e:
        print(f"Error generating follow-up question: {e}")
        # Fallback response
        return "That's interesting. Could you elaborate more on that point?"


async def generate_candidate_report(interview_data: dict) -> Dict[str, Any]:
    SYSTEM_PROMPT = """
You are an Interview analyzer. You are given a transcript of an interview history which is a list of messages between an interviewer and a candidate, resume text and the job description.
You need to analyze the interview and the job description and provide a report on the interview. 
The report should include:
1. A brief summary of the interview.
2. The candidate's strengths.
3. The candidate's weaknesses.
4. Suggestions for improvement or areas to focus on in future interviews.
The analysis should be concise and to the point, focusing on the candidate's performance in relation to the job description and their resume.

"""
    try:
        jd_data = await get_jd_by_id(interview_data['jd_id'])
        jd_text = jd_data.get("jd_text")

        transcript = ""
        for msg in interview_data['message_history']:
            role = "Interviewer" if msg.get("role") == "assistant" else "Candidate"
            content = msg.get("content", "")
            transcript += f"{role}: {content}\n\n"
        
        INPUT_PROMPT = f"""
Please analyze this interview and provide a analysis report.

Candidate Name: {interview_data['candidate_name']}
Candidate Email: {interview_data['candidate_email']}

Job Description:
{jd_text}

Resume:
{interview_data['resume_text']}

Interview Transcript:
{transcript}
"""

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": INPUT_PROMPT}
        ]

        response = await acompletion(
            model="gemini/gemini-2.5-flash-preview-04-17",
            messages=messages,
            response_format=InterviewAnalysis,
            temperature=0.5,
        )

        response_content = json.loads(response['choices'][0]['message']['content'])
        print(f"AI interview analysis:\n{response_content}\n\n")

        await update_candidate_report(interview_data['_id'], response_content, "summary_generated")

    except Exception as e:
        error_msg = f"Error generating candidate report: {str(e)}"
        print(error_msg)
        try:
            await update_candidate_report(interview_data['_id'], {"error": error_msg}, "summary_error")
        except Exception as update_error:
            print(f"Error updating status after failure: {str(update_error)}")


async def process_interview_completion(interview_data: dict, message_history: list):
    """
    Background task to process interview completion - generate report and update status.
    """
    try:
        print(f"Processing completed interview {interview_data.get('_id')}...")
        update_result = await update_interview_data(
            interview_id=interview_data.get("_id"), 
            status="interview_completed", 
            message_history=message_history
        )
        if "error" in update_result:
            print(f"Error in background task: {update_result['error']}")
        
        interview_data['message_history'] = message_history
        
        await generate_candidate_report(interview_data)
    except Exception as e:
        print(f"Background task error: {str(e)}")
