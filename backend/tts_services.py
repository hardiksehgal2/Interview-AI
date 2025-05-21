import pyttsx3
import tempfile
import os

async def text_to_speech(text: str) -> bytes:
    engine = pyttsx3.init()
    
    # Set properties
    engine.setProperty('rate', 180)  # Default is 150, higher is faster
    
    # Save to bytes buffer
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_audio:
        engine.save_to_file(text, temp_audio.name)
        engine.runAndWait()
        temp_audio_path = temp_audio.name
    
    with open(temp_audio_path, 'rb') as audio_file:
        audio_bytes = audio_file.read()
    
    os.unlink(temp_audio_path)
    return audio_bytes