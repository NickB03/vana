# Multi-stage build for VANA Agent System (Cloud Build Optimized)
# Stage 1: Build dependencies with Poetry and Python 3.13
FROM python:3.13-slim AS builder

WORKDIR /app

# Install Poetry
RUN pip install --no-cache-dir poetry==1.8.3

# Copy Poetry configuration files
COPY pyproject.toml poetry.lock* ./

# Configure Poetry: Don't create virtual env, install to system
RUN poetry config virtualenvs.create false

# Install build dependencies and Python packages with Poetry
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        python3-dev \
        git \
        build-essential && \
    poetry install --only=main --no-dev && \
    # Clean up build dependencies to reduce image size
    apt-get purge -y --auto-remove gcc python3-dev git build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Stage 2: Optimized runtime image
FROM python:3.13-slim

WORKDIR /app

# Copy installed packages from builder stage
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Create non-root user for security
RUN groupadd -r vana && useradd -r -g vana vana

# Copy application code with proper ownership
COPY --chown=vana:vana . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/data && \
    chown -R vana:vana /app/logs /app/data && \
    chmod 755 /app/logs /app/data

# Set environment variables for production (Cloud Run compatible)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    VANA_ENV=production \
    VANA_HOST=0.0.0.0 \
    GOOGLE_GENAI_USE_VERTEXAI=True \
    LOG_LEVEL=INFO \
    # Cloud Run will set PORT automatically, but provide fallback
    PORT=8080

# Switch to non-root user
USER vana

# Expose port for Cloud Run (Cloud Run will override this)
EXPOSE 8080

# Health check for container monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:${PORT:-8080}/health')" || exit 1

# Run the application
CMD ["python", "main.py"]
