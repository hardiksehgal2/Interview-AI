# Use Python 3.9 slim base image
FROM python:3.9-slim

# Set working directory in the container
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip 

# Copy requirements file (if you have one) or install dependencies directly
# If you use requirements.txt:
COPY requirements.txt .
RUN pip install -r requirements.txt

# If you don't have requirements.txt, uncomment and use this:
# RUN pip install fastapi uvicorn

# Copy the rest of the application
COPY . .

# Command to run the application - using port 8000 as you specified
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Expose the port the app runs on
EXPOSE 8000