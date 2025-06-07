from dotenv import load_dotenv
import os
from threading import Lock


class Environment:
    _instance = None
    _lock = Lock()

    def __new__(cls):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super().__new__(cls)
                    cls._instance._load_env()
        return cls._instance

    def _load_env(self):
        load_dotenv(dotenv_path="config/.env")
        self.COMPANY_COLLECTION = os.getenv("COMPANY_COLLECTION")
        self.MONGO_URI = os.getenv("MONGO_URI")
        self.GROQ_API_KEY = os.getenv("GROQ_API_KEY")
        self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
        self.SARVAMAI_API_KEY = os.getenv("SARVAMAI_API_KEY")
        self.DATABASE_NAME = os.getenv("DATABASE_NAME")
        self.JD_COLLECTION = os.getenv("JD_COLLECTION")
        self.RESUME_COLLECTION = os.getenv("RESUME_COLLECTION")
        self.INTERVIEW_DATA_COLLECTION = os.getenv("INTERVIEW_DATA_COLLECTION")