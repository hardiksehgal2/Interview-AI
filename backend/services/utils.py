import base64
from typing import IO
import PyPDF2


def pdf_to_base64(pdf_file: IO[bytes]) -> str:
    pdf_bytes = pdf_file.read()
    return base64.b64encode(pdf_bytes).decode('utf-8')


def base64_to_pdf_bytes(base64_string: str) -> bytes:
    return base64.b64decode(base64_string)


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