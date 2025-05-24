from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()
groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))


async def transcribe_audio(audio_data):
    """
    Speech recognition using Groq API.
    """
    try:
        transcription = groq_client.audio.transcriptions.create(
            file=("audio.webm", audio_data),
            model="whisper-large-v3",
            response_format="json",
            language="en",
            temperature=0.2
        )
        return transcription.text
    except Exception as e:
        print(f"Error transcribing audio: {str(e)}")
        raise e