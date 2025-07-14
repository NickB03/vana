# Multi-stage build for efficiency
FROM node:18-alpine AS frontend-build
WORKDIR /app/vana-ui
# Copy frontend package files
COPY vana-ui/package*.json ./
RUN npm ci
# Copy frontend source
COPY vana-ui/ ./
# Set production API URL as build arg
ARG VITE_API_URL=https://vana-staging-960076421399.us-central1.run.app
ENV VITE_API_URL=$VITE_API_URL
# Build frontend with production settings
RUN npm run build

# Python backend stage
FROM python:3.13-slim
WORKDIR /app

# Install Node.js for any runtime needs (optional)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry

# Copy dependency files first (better caching)
COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false && poetry install --no-root --only main

# Copy backend source
COPY . .

# Copy built frontend from build stage
COPY --from=frontend-build /app/vana-ui/dist ./vana-ui/dist

# Verify installations
RUN ls -l /usr/local/lib/python3.13/site-packages/google && \
    ls -l vana-ui/dist/index.html

# Expose the port
EXPOSE 8081

# Use PORT env var for CloudRun compatibility
ENV PORT=8081

# Enable ADK Event Streaming in production
ENV USE_ADK_EVENTS=true

# Run the application
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8081}"]
