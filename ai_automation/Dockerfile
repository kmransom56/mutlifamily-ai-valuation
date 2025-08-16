# AI Automation Service Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/
COPY config/ ./config/
COPY models/ ./models/

# Create necessary directories
RUN mkdir -p logs models config scripts

# Set Python path
ENV PYTHONPATH=/app/src

# Create non-root user for security
RUN groupadd -r aiuser && useradd -r -g aiuser aiuser
RUN chown -R aiuser:aiuser /app
USER aiuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Default command
CMD ["python", "src/anomaly_detection.py"]