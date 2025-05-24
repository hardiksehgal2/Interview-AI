import os
from sarvamai import SarvamAI
from dotenv import load_dotenv
import httpx

load_dotenv()
sarvam_client = SarvamAI(api_subscription_key=os.getenv('SARVAMAI_API_KEY'))


async def text_to_speech_sarvam_base64_array(text):
    """
    Convert text to speech using Sarvam API and return base64 audio array
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.sarvam.ai/text-to-speech",
            headers={
                "api-subscription-key": os.getenv('SARVAMAI_API_KEY')
            },
            json={
                "text": text,
                "target_language_code": "en-IN",
                "speech_sample_rate": 16000,
                "enable_preprocessing": True
            },
        )
    
    response.raise_for_status()
    response_data = response.json()
    
    return response_data.get("audios", [])
