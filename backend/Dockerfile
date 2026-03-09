FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies (skip emergentintegrations - only available on Emergent platform)
RUN pip install --no-cache-dir -r requirements.txt || \
    (grep -v emergentintegrations requirements.txt > requirements_filtered.txt && \
     pip install --no-cache-dir -r requirements_filtered.txt)

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/audio_files

# Expose port
EXPOSE 8001

# Run the application
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
