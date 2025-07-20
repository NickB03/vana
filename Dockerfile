# ADK-compliant Dockerfile for Cloud Run deployment
FROM python:3.13-slim

# Install build dependencies for packages that need compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create non-root user for security (ADK best practice)
RUN adduser --disabled-password --gecos "" vanauser && \
    chown -R vanauser:vanauser /app

# Copy application source
COPY . .

# Switch to non-root user
USER vanauser

# Set user PATH for local bin
ENV PATH="/home/vanauser/.local/bin:$PATH"

# Use PORT environment variable for Cloud Run compatibility
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8081}"]