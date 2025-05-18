# backend/app/queue/orchestrator.py
from rq import Queue
from .q import redis_connection
from .jd_analysis import analyse_jd
from .resume_matching import filter_candidate
from .question_generator import create_interview_questions

jd_queue = Queue("jd_analyse",connection=redis_connection)
resume_queue = Queue("resume_matching",connection=redis_connection)
questions_queue = Queue("questions_generator",connection=redis_connection)

def start_pipeline(candidate_id: str):
    """
    Starts the pipeline by enqueueing the first job (JD Analysis).
    """
    jd_queue.enqueue(analyse_jd, candidate_id)

def continue_to_resume_match(candidate_id: str):
    """
    Enqueues the resume matching task after JD analysis.
    """
    resume_queue.enqueue(filter_candidate, candidate_id)

def continue_to_question_gen(candidate_id: str):
    """
    Enqueues the interview question generation task after resume match.
    """
    questions_queue.enqueue(create_interview_questions, candidate_id)

