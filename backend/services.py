import PyPDF2
from typing import IO, Dict, Any, List
from litellm import acompletion
import json
from model_schema import ResumeAnalysisResult
import tempfile
from gtts import gTTS
import os
from dotenv import load_dotenv

load_dotenv()

os.environ['GEMINI_API_KEY'] = os.getenv('GEMINI_API_KEY')
os.environ['GROQ_API_KEY'] = os.getenv('GROQ_API_KEY')
# os.environ['LITELLM_LOG'] = "DEBUG"


def extract_text_from_pdf_stream(pdf_stream: IO[bytes]) -> str:
    text = ""
    try:
        reader = PyPDF2.PdfReader(pdf_stream)
        for page_num in range(len(reader.pages)):
            page = reader.pages[page_num]
            text += page.extract_text() or ""
    except Exception as e:
        print(f"Error extracting text from PDF stream: {e}")
    return text


async def text_to_speech(text: str) -> bytes:   
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_audio:
        tts = gTTS(text=text, lang='en', slow=False)
        tts.save(temp_audio.name)
        temp_audio_path = temp_audio.name

    with open(temp_audio_path, 'rb') as audio_file:
        audio_bytes = audio_file.read()

    os.unlink(temp_audio_path)

    return audio_bytes


async def call_llm_for_interview_prep(resume_text: str, jd_text: str) -> Dict[str, Any]:
    prompt = f"""
Given the following job description and resume text, extract candidate name, email and generate 3 to 5 interview questions that will help assess the candidate's suitability for the role.
- The questions should be relevant to both the job description and the candidate's background as presented in the resume.
- The first question should be an introductory question to get to know the candidate better. You should directly ask the candidate to introduce themselves, with a greeting.
- The questions should prioritize the candidate's experience and skills as they relate to the job description.

Resume Text:
---
{resume_text}
---

Job Description Text:
---
{jd_text}
---
"""
    try:

        response = await acompletion(
            model="gemini/gemini-2.5-flash-preview-04-17",  #"groq/qwen-qwq-32b", # 
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format=ResumeAnalysisResult,
        )
        
        llm_response = json.loads(response['choices'][0]['message']['content'])
        print(llm_response)
             
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
            temperature=0.7,
        )
        print(response)
        
        follow_up_question = response['choices'][0]['message']['content']
        return follow_up_question.strip()

    except Exception as e:
        print(f"Error generating follow-up question: {e}")
        # Fallback response
        return "That's interesting. Could you elaborate more on that point?"