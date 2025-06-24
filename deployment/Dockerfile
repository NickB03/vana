# Multi-stage build for VANA Enhanced Multi-Agent System
# Enhanced with reasoning capabilities and version tracking

# Stage 1: Build dependencies
FROM python:3.13-slim AS builder

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install build dependencies and Python packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc python3-dev git curl && \
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    apt-get purge -y --auto-remove gcc python3-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Stage 2: Runtime image
FROM python:3.13-slim

WORKDIR /app

# Install git for version tracking (minimal install)
RUN apt-get update && \
    apt-get install -y --no-install-recommends git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder stage
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Build arguments for version tracking
ARG BUILD_ID="unknown"
ARG COMMIT_SHA="unknown" 
ARG BUILD_TIMESTAMP="unknown"
ARG ENVIRONMENT="development"
ARG ENHANCED_REASONING="true"
ARG PRODUCTION_BUILD="false"

# Set environment variables including version tracking
ENV PYTHONUNBUFFERED=1 \
    VANA_ENV=production \
    VANA_HOST=0.0.0.0 \
    VANA_PORT=8000 \
    PORT=8000 \
    BUILD_ID=${BUILD_ID} \
    BUILD_NUMBER=${BUILD_ID} \
    COMMIT_SHA=${COMMIT_SHA} \
    BUILD_TIMESTAMP=${BUILD_TIMESTAMP} \
    BUILDER=docker \
    ENVIRONMENT=${ENVIRONMENT} \
    ENHANCED_REASONING_ENABLED=${ENHANCED_REASONING} \
    PRODUCTION_BUILD=${PRODUCTION_BUILD}

# Generate version manifest at build time
RUN python scripts/generate_version_manifest.py

# Create a non-root user for security (production best practice)
RUN useradd --create-home --shell /bin/bash vana && \
    chown -R vana:vana /app /tmp

# Switch to non-root user
USER vana

# Expose port for Cloud Run
EXPOSE 8000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health', timeout=5)"

# Run the application with Uvicorn
CMD ["python", "main.py"]
