# Multi-stage build for VANA Multi-Agent System
# Stage 1: Build dependencies
FROM python:3.13-slim AS builder

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install build dependencies and Python packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc python3-dev && \
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    apt-get purge -y --auto-remove gcc python3-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Stage 2: Runtime image
FROM python:3.13-slim

WORKDIR /app

# Copy installed packages from builder stage
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    VANA_ENV=production \
    VANA_HOST=0.0.0.0 \
    VANA_PORT=8080 \
    PORT=8080

# Expose port for Cloud Run
EXPOSE 8080

# Run the application with Uvicorn
CMD ["python", "main.py"]
