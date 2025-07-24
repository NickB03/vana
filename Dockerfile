# Backend-only Dockerfile for VANA (frontend archived)
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

# Copy application code
COPY --chown=vanauser:vanauser . .

# Switch to non-root user
USER vanauser

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8081

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8081

# Run the application
CMD ["python", "main.py"]