# main.py - FastAPI Backend for Code Analysis
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

app = FastAPI(title="Code Analysis API", version="1.0.0")

# Configure CORS for your Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your Next.js frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class TestResult(BaseModel):
    testCase: Dict[str, Any]
    result: Dict[str, Any]
    passed: bool

class CodeSubmission(BaseModel):
    user_id: str              # Who submitted? "student_123"
    problem_id: int           # Which problem? 1, 2, 3...
    problem_title: str        # Problem name: "Square of Number"
    code: str                 # The actual code they wrote
    language: str             # "python", "java", etc.
    test_results: List[TestResult]  # List of all test results
    all_tests_passed: bool    # Did everything work?
    passed_tests: int         # How many tests passed? 3
    total_tests: int          # How many total tests? 5
    submission_time: str      # When was it submitted?
    is_manual_run: Optional[bool] = False  # Was it just "Run Code" or "Run Tests"? 

class AIAnalysis(BaseModel):
    code_quality_score: int
    feedback: str
    suggestions: List[str]
    complexity_analysis: str
    best_practices: List[str]

# In-memory storage (use a database in production)
submissions_db = []
user_progress = {}

@app.get("/")
async def root():
    return {"message": "Code Analysis API is running!"}

@app.post("/api/analyze-code", response_model=Dict[str, Any])
async def analyze_code(submission: CodeSubmission):
    """
    Analyze submitted code and provide AI feedback
    """
    try:
        # Store submission
        submission_data = submission.dict()
        submission_data["analyzed_at"] = datetime.now().isoformat()
        submissions_db.append(submission_data)
        
        # Update user progress
        if submission.user_id not in user_progress:
            user_progress[submission.user_id] = {
                "solved_problems": set(),
                "total_submissions": 0,
                "languages_used": set()
            }
        
        user_progress[submission.user_id]["total_submissions"] += 1
        user_progress[submission.user_id]["languages_used"].add(submission.language)
        
        # 🔥 FIXED: Only count as solved if it's a real test run (not manual execution)
        if submission.all_tests_passed and not submission.is_manual_run:
            user_progress[submission.user_id]["solved_problems"].add(submission.problem_id)
        
        # AI Analysis (placeholder - integrate with your AI service)
        ai_analysis = await perform_ai_analysis(submission)
        
        return {
            "status": "success",
            "submission_id": len(submissions_db),
            "ai_analysis": ai_analysis,
            "user_stats": {
                "total_submissions": user_progress[submission.user_id]["total_submissions"],
                "problems_solved": len(user_progress[submission.user_id]["solved_problems"]),
                "languages_used": list(user_progress[submission.user_id]["languages_used"])
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

async def perform_ai_analysis(submission: CodeSubmission) -> AIAnalysis:
    """
    Perform AI analysis on the submitted code
    Replace this with actual AI service calls (OpenAI, Claude, etc.)
    """
    
    # Basic analysis based on code patterns
    code = submission.code.lower()
    suggestions = []
    best_practices = []
    
    # Language-specific analysis
    if submission.language == "python":
        if "input().split()" in submission.code:
            best_practices.append("Good use of input().split() for parsing")
        if len(submission.code.split('\n')) < 10:
            suggestions.append("Consider adding comments for better readability")
        if "try:" not in code and "except:" not in code:
            suggestions.append("Consider adding error handling with try-except blocks")
    
    elif submission.language == "java":
        if "public static void main" in submission.code:
            best_practices.append("Proper Java main method structure")
        if "scanner" in code:
            best_practices.append("Good use of Scanner for input")
        if submission.code.count('{') != submission.code.count('}'):
            suggestions.append("Check bracket matching")
    
    # Complexity analysis
    lines_of_code = len([line for line in submission.code.split('\n') if line.strip()])
    if lines_of_code < 5:
        complexity = "Simple - straightforward solution"
    elif lines_of_code < 15:
        complexity = "Moderate - well-structured solution"
    else:
        complexity = "Complex - consider breaking into functions"
    
    # Code quality score
    base_score = 70
    if submission.all_tests_passed:
        base_score += 20
    if len(best_practices) > 0:
        base_score += 5
    if "def " in code or "function" in code:  # Functions used
        base_score += 5
    
    # Generate feedback
    if submission.is_manual_run:
        feedback = f"🔧 Code execution test completed. Your {submission.language} code ran successfully. "
        feedback += "Use 'Run Tests' to test against the actual problem requirements."
    elif submission.all_tests_passed:
        feedback = f"🎉 Excellent work! Your {submission.language} solution passed all {submission.total_tests} test cases. "
        if submission.language == "python":
            feedback += "Your Python code is clean and efficient."
        elif submission.language == "java":
            feedback += "Your Java implementation follows good practices."
        else:
            feedback += f"Your {submission.language} solution demonstrates good problem-solving skills."
    else:
        feedback = f"Good attempt! You passed {submission.passed_tests} out of {submission.total_tests} test cases. "
        feedback += "Review the failed test cases to identify edge cases or logic errors."
    
    return AIAnalysis(
        code_quality_score=min(100, base_score),
        feedback=feedback,
        suggestions=suggestions,
        complexity_analysis=complexity,
        best_practices=best_practices
    )

@app.get("/api/user/{user_id}/progress")
async def get_user_progress(user_id: str):
    """Get user's coding progress"""
    if user_id not in user_progress:
        return {"message": "User not found", "progress": None}
    
    progress = user_progress[user_id]
    return {
        "user_id": user_id,
        "problems_solved": len(progress["solved_problems"]),
        "total_submissions": progress["total_submissions"],
        "languages_used": list(progress["languages_used"]),
        "solved_problem_ids": list(progress["solved_problems"])
    }

@app.get("/api/submissions")
async def get_all_submissions(limit: int = 10):
    """Get recent submissions for admin/debugging"""
    return {
        "submissions": submissions_db[-limit:],
        "total_count": len(submissions_db)
    }

@app.post("/api/problems/add")
async def add_custom_problem(problem_data: Dict[str, Any]):
    """Add a new coding problem (for admin use)"""
    # In production, store in database
    # For now, just return success
    return {
        "status": "success",
        "message": "Problem added successfully",
        "problem_id": len(submissions_db) + 1000  # Mock ID
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "total_submissions": len(submissions_db)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)