# Change from python:3.9-slim to:
FROM python:3.11-slim

# Set working directory in the container
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc ffmpeg libespeak1 libasound2-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*


# Upgrade pip
COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
# Command to run the application - using port 8000 as you specified
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Expose the port the app runs on