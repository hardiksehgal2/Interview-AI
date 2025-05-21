import base64
from typing import IO

def pdf_to_base64(pdf_file: IO[bytes]) -> str:
    pdf_bytes = pdf_file.read()
    return base64.b64encode(pdf_bytes).decode('utf-8')

def base64_to_pdf_bytes(base64_string: str) -> bytes:
    return base64.b64decode(base64_string)