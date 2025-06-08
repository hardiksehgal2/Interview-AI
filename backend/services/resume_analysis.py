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


class WorkExperience(BaseModel):
    company: str
    position: str
    employment_type: Optional[str]  # Full-time, Part-time, Contract, Internship
    start_date: Optional[str] = Field(description="Use YYYY-MM format")
    end_date: Optional[str] = Field(description="Use 'Present' for current roles, else use YYYY-MM format")
    duration: Optional[str] = Field(description=" e.g., 2 years 3 months")
    location: Optional[str]
    key_details: Optional[str] = Field(description="Details of the role, responsibilities, and achievements in bullet points")
    technologies_used: List[str]


class Education(BaseModel):
    institution: str
    degree: str
    field_of_study: Optional[str]
    specialization: Optional[str]
    start_date: Optional[str] = Field(description="Use YYYY-MM format")
    end_date: Optional[str] = Field(description="Use 'Present' for current roles, else use YYYY-MM format")
    duration: Optional[str] = Field(description=" e.g., 2 years 3 months")
    location: Optional[str]
    score: Optional[Dict[str, float]] = Field(description="Academic score in format {'type': score} where type can be 'gpa', 'cgpa', 'percentage', 'percentile' or any other with their value")
    relevant_coursework: List[str]
    key_details: Optional[str] = Field(description="Details of the course, projects, and achievements in bullet points")


class Certification(BaseModel):
    name: str
    issuing_organization: str
    issue_date: Optional[str] = Field(description="Use YYYY-MM format")
    credential_url: Optional[str]


class Project(BaseModel):
    title: str
    description: str
    start_date: Optional[str] = Field(description="Use YYYY-MM format")
    end_date: Optional[str] = Field(description="Use 'Present' for current roles, else use YYYY-MM format")
    duration: Optional[str] = Field(description="e.g., 2 years 3 months")
    technologies_used: List[str]
    key_details: Optional[str] = Field(description="Details of the role, responsibilities, and achievements in bullet points")
    project_url: Optional[str]
    github_url: Optional[str]


class Language(BaseModel):
    language: str
    proficiency: str = Field(description="Proficiency level such as Native, Fluent, Intermediate, Basic. Default is 'Fluent'")


class Skill(BaseModel):
    skill_name: str
    category: str  # Technical, Soft Skills, Tools, Programming Languages, etc.


class Publication(BaseModel):
    title: str
    doi: Optional[str]
    url: Optional[str]
    key_details: Optional[str] = Field(description="Details of the publication, findings, contributions, etc.")


class Award(BaseModel):
    title: str
    issuing_organization: str
    date_received: Optional[str] = Field(description="Use YYYY-MM format")
    description: Optional[str]


class Contact(BaseModel):
    email: Optional[str]
    contact_numbers: Optional[List[str]]
    linkedin: Optional[str]
    github: Optional[str]
    website: Optional[str]
    twitter: Optional[str]
    address: Optional[str]


class ResumeDetails(BaseModel):
    candidate_name: str
    contact_info: Contact
    professional_summary: Optional[str]
    total_experience_years: Optional[float]
    work_experience: List[WorkExperience]
    education: List[Education]
    skills: List[Skill]
    certifications: List[Certification]
    projects: List[Project]
    languages: List[Language]
    publications: List[Publication]
    awards: List[Award]
    interests: List[str]
    hobbies: List[str]


class ResumeMatchAnalysis(BaseModel):
    analysis_report: str = Field(description="Detailed analysis report of the resume against the job description")
    overall_match_score: int = Field(description="Overall match score between 1-100 based on skills, experience, and requirements alignment")
    matching_skills: List[str]
    missing_skills: List[str]
    additional_skills: List[str] = Field(description="Skills candidate has but not required")


async def extract_resume_details(resume_text: str) -> Dict[str, Any]:
    prompt = f"""
Extract key details from the resume text provided in the input and structure them in the specified format:
1. Personal information (full name, email, phone, location)
2. Professional summary
3. Work experience with company names, positions, dates, and key responsibilities
4. Education details with institutions, degrees, and dates
5. Technical and soft skills
6. Certifications if any
7. Languages if mentioned
8. Estimate total years of professional experience
9. Projects with titles, descriptions, and technologies used
10. Publications if any
11. Awards if any
12. Interests and hobbies if mentioned

"""
    
    try:
        response = await acompletion(
            model="gemini/gemini-2.5-flash-preview-04-17",
            messages=[
                {"role": "system", "content": prompt}, 
                {"role": "user", "content": "Candidate Resume:\n" + resume_text}
            ],
            temperature=0.2,
            response_format=ResumeDetails,
        )
        
        llm_response = json.loads(response['choices'][0]['message']['content'])
        print(f"Resume details extracted:\n{json.dumps(llm_response, indent=2)}\n\n")
        
        return llm_response

    except Exception as e:
        print(f"Error extracting resume details: {e}")
        raise e


async def match_resume_with_jd(resume_data: dict = None, resume_text: str = None, jd_text: str = None) -> Dict[str, Any]:
    resume_input = json.dumps(resume_data) if resume_data else resume_text
    
    if not resume_input or not jd_text:
        raise ValueError("Both resume data/text and job description text must be provided.")
    
    prompt = f"""
Analyze the resume data in the input against the job description and provide a comprehensive matching analysis based on the following:
1. Overall match score (1-100) based on skills, experience, and requirements alignment
2. Detailed analysis points about the resume's strengths and weaknesses for this role
3. List of skills from resume that match the job requirements
4. List of important skills mentioned in JD but missing from resume

Be objective and constructive in your analysis. Focus on both technical skills and soft skills alignment.

---

<Job Description>
{jd_text}
</Job Description>

"""
    
    try:
        response = await acompletion(
            model="gemini/gemini-2.5-flash-preview-04-17",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": resume_input}
            ],
            temperature=0.3,
            response_format=ResumeMatchAnalysis,
        )
        
        llm_response = json.loads(response['choices'][0]['message']['content'])
        print(f"Resume-JD Analysis:\n{json.dumps(llm_response, indent=2)}\n\n")
        
        return llm_response

    except Exception as e:
        print(f"Error in resume-JD matching analysis: {e}")
        raise e

