# 🚀 Vana Deployment Guide

[![Cloud Run](https://img.shields.io/badge/Google%20Cloud-Cloud%20Run-blue)](https://cloud.google.com/run)
[![Docker](https://img.shields.io/badge/Docker-containerized-blue)](https://www.docker.com/)
[![Authentication](https://img.shields.io/badge/Auth-JWT%20%2B%20OAuth2-green)](https://tools.ietf.org/html/rfc6749)
[![FastAPI](https://img.shields.io/badge/FastAPI-backend-red)](https://fastapi.tiangolo.com/)

Comprehensive deployment guide for the Vana Virtual Autonomous Network Agents platform. This guide covers local development setup, Docker containerization, Google Cloud Run deployment, and production security hardening with the integrated authentication system and LiteLLM support.

## 📋 Table of Contents

- [🏗️ Architecture Overview](#️-architecture-overview)
- [⚡ Prerequisites & System Requirements](#-prerequisites--system-requirements)
- [🔧 Local Development Setup](#-local-development-setup)
- [🐳 Docker Configuration](#-docker-configuration)
- [🌐 Environment Variables Guide](#-environment-variables-guide)
- [🚀 Google Cloud Run Deployment](#-google-cloud-run-deployment)
- [🔐 Authentication & Security](#-authentication--security)
- [🤖 LiteLLM & Model Configuration](#-litellm--model-configuration)
- [🗄️ Database Setup](#️-database-setup)
- [🏥 Health Checks & Monitoring](#-health-checks--monitoring)
- [📈 Scaling Configuration](#-scaling-configuration)
- [📊 Backup & Recovery](#-backup--recovery)
- [🔄 CI/CD Pipeline Setup](#-cicd-pipeline-setup)
- [🐛 Troubleshooting Deployment Issues](#-troubleshooting-deployment-issues)
- [🛡️ Security Hardening for Production](#️-security-hardening-for-production)

## 🏗️ Architecture Overview

The Vana platform consists of multiple integrated components:

```mermaid
graph TB
    A[Client Applications] --> B[Google Cloud Load Balancer]
    B --> C[Cloud Run Service]
    C --> D[FastAPI Backend]
    D --> E[Authentication System]
    D --> F[LiteLLM/OpenRouter]
    D --> G[Session Storage]
    D --> H[Agent Network]
    
    I[PostgreSQL/SQLite] --> E
    J[Google Cloud Storage] --> G
    K[Vertex AI/OpenRouter] --> F
    L[Google Secret Manager] --> C
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#e8f5e8
    style D fill:#fff3e0
    style E fill:#ffebee
    style F fill:#f1f8e9
    style G fill:#fce4ec
    style H fill:#e0f2f1
```

### Core Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend API** | FastAPI + Uvicorn | REST API and SSE endpoints |
| **Authentication** | JWT + OAuth2 + RBAC | User management and security |
| **Model Integration** | LiteLLM + OpenRouter/Vertex AI | AI model abstraction layer |
| **Session Management** | SQLite/PostgreSQL + GCS | Persistent session storage |
| **Container Runtime** | Docker + Cloud Run | Serverless container deployment |
| **Infrastructure** | Terraform | Infrastructure as Code |

## ⚡ Prerequisites & System Requirements

### Development Environment
```bash
# Required tools with minimum versions
python >= 3.10, < 3.14
uv >= 0.6.12                    # Python package manager
node >= 18.0.0                  # Frontend development
docker >= 20.10.0               # Container runtime
gcloud >= 400.0.0               # Google Cloud CLI
terraform >= 1.5.0              # Infrastructure management
make >= 4.0                     # Build automation
```

### System Requirements

#### Minimum (Development)
- **CPU**: 2 cores
- **RAM**: 4GB
- **Disk**: 10GB available space
- **OS**: macOS, Linux, Windows (WSL2)

#### Recommended (Production)
- **CPU**: 4 cores
- **RAM**: 8GB
- **Disk**: 50GB available space
- **Network**: Stable internet connection

### Google Cloud Setup

```bash
# 1. Authenticate with Google Cloud
gcloud auth login
gcloud auth application-default login

# 2. Set your project
gcloud config set project analystai-454200

# 3. Enable required APIs
gcloud services enable run.googleapis.com \
  cloudbuild.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  vertexai.googleapis.com \
  iam.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com

# 4. Verify setup
gcloud config list
gcloud services list --enabled
```

## 🔧 Local Development Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/NickB03/vana.git
cd vana

# Install dependencies with uv (recommended)
make install

# Or manually with uv
uv sync --dev --extra jupyter
```

### 2. Environment Configuration

Create `.env.local` files for local development:

```bash
# Root directory: .env.local
cat > .env.local << 'EOF'
# API Keys
BRAVE_API_KEY=your_brave_api_key_from_console
OPENROUTER_API_KEY=your_openrouter_key_optional

# CORS for local development
ALLOW_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000

# Google Cloud Project
GOOGLE_CLOUD_PROJECT=analystai-454200
GOOGLE_CLOUD_LOCATION=us-central1

# Model Configuration
USE_OPENROUTER=false
GOOGLE_GENAI_USE_VERTEXAI=true
EOF

# App directory: app/.env.local
cat > app/.env.local << 'EOF'
# Authentication Configuration
AUTH_SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
AUTH_ACCESS_TOKEN_EXPIRE_MINUTES=30
AUTH_REFRESH_TOKEN_EXPIRE_DAYS=7
AUTH_BCRYPT_ROUNDS=12
AUTH_ENABLE_REGISTRATION=true
AUTH_REQUIRE_EMAIL_VERIFICATION=false
AUTH_REQUIRE_SSE_AUTH=false

# Database Configuration
SESSION_DB_URI=sqlite:////tmp/vana_sessions.db
AUTH_DATABASE_URL=sqlite:///./auth.db

# Google Cloud Project
GOOGLE_CLOUD_PROJECT=analystai-454200
ALLOW_ORIGINS=http://localhost:5173,http://localhost:3000
EOF
```

### 3. Initialize Databases

The system automatically initializes required databases:

```bash
# Start backend (auto-initializes databases)
make dev-backend

# Or manually initialize
python -c "from app.auth.database import init_auth_db; init_auth_db()"
```

### 4. Create Test User

```bash
# Create admin user for development
python -c """
from app.auth.database import get_auth_db
from app.auth.models import User, Role
from app.auth.security import get_password_hash

db = next(get_auth_db())

# Create admin user
admin_user = User(
    email='admin@localhost',
    username='admin', 
    first_name='Admin',
    last_name='User',
    hashed_password=get_password_hash('AdminPass123!'),
    is_active=True,
    is_superuser=True,
    is_verified=True
)

# Assign admin role
admin_role = db.query(Role).filter(Role.name == 'admin').first()
if admin_role:
    admin_user.roles.append(admin_role)

db.add(admin_user)
db.commit()
print('✅ Admin user created: admin@localhost / AdminPass123!')
"""
```

### 5. Start Development Servers

```bash
# Start both backend and frontend
make dev

# Or start individually
make dev-backend  # Backend on port 8000
make dev-frontend # Frontend on port 5173

# Or start with Streamlit playground
make playground   # Streamlit on port 8501
```

### 6. Verify Setup

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test authentication
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=AdminPass123!&grant_type=password"
```

## 🐳 Docker Configuration

### Dockerfile Overview

The project uses a multi-stage Docker build optimized for production:

```dockerfile
# Current Dockerfile (optimized)
FROM python:3.11-slim

# Install uv for fast dependency management
RUN pip install --no-cache-dir uv==0.6.12

WORKDIR /code

# Copy dependency files
COPY ./pyproject.toml ./README.md ./uv.lock* ./

# Copy source code
COPY ./app ./app

# Install dependencies (frozen lockfile for reproducibility)
RUN uv sync --frozen

# Build arguments
ARG COMMIT_SHA=""
ENV COMMIT_SHA=${COMMIT_SHA}

# Expose port 8080 (Cloud Run standard)
EXPOSE 8080

# Start command
CMD ["uv", "run", "uvicorn", "app.server:app", "--host", "0.0.0.0", "--port", "8080"]
```

### Local Docker Development

```bash
# Build image
docker build -t vana:local .

# Run container with environment variables
docker run -p 8000:8080 \
  -e GOOGLE_CLOUD_PROJECT=analystai-454200 \
  -e AUTH_SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))") \
  -e SESSION_DB_URI=sqlite:////tmp/vana_sessions.db \
  --name vana-dev \
  vana:local

# Test container
curl http://localhost:8000/health
```

### Docker Compose for Development

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  vana-backend:
    build: .
    ports:
      - "8000:8080"
    environment:
      - GOOGLE_CLOUD_PROJECT=analystai-454200
      - AUTH_SECRET_KEY=${AUTH_SECRET_KEY:-dev-secret-key}
      - SESSION_DB_URI=sqlite:////tmp/vana_sessions.db
      - AUTH_REQUIRE_SSE_AUTH=false
    volumes:
      - ./app:/code/app:ro
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: vana
      POSTGRES_USER: vana
      POSTGRES_PASSWORD: vana_dev_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Run with Docker Compose:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f vana-backend

# Stop services
docker-compose down
```

## 🌐 Environment Variables Guide

### Development Environment Variables

#### Required Variables

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project ID | `analystai-454200` |
| `AUTH_SECRET_KEY` | JWT token signing secret | `generated_hex_string` |
| `SESSION_DB_URI` | Session database connection | `sqlite:////tmp/vana_sessions.db` |

#### Authentication Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifetime |
| `AUTH_REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime |
| `AUTH_BCRYPT_ROUNDS` | `12` | Password hashing strength |
| `AUTH_ENABLE_REGISTRATION` | `true` | Allow new user registration |
| `AUTH_REQUIRE_SSE_AUTH` | `false` | Require auth for SSE (dev: false) |

#### Model Configuration Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_OPENROUTER` | `false` | Use OpenRouter instead of Vertex AI |
| `OPENROUTER_API_KEY` | None | OpenRouter API key |
| `GOOGLE_GENAI_USE_VERTEXAI` | `true` | Use Vertex AI for Gemini models |
| `GOOGLE_API_KEY` | None | Google AI Studio API key |

#### Optional Development Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BRAVE_API_KEY` | None | Brave Search API key |
| `ALLOW_ORIGINS` | `*` | CORS allowed origins |
| `LOG_LEVEL` | `INFO` | Logging level |
| `ENABLE_TRACING` | `true` | OpenTelemetry tracing |

### Production Environment Variables

#### Security-Critical Variables (Use Google Secret Manager)

```bash
# Store in Google Secret Manager
gcloud secrets create auth-secret-key --data-file=<(python -c "import secrets; print(secrets.token_hex(64))")
gcloud secrets create openrouter-api-key --data-file=<(echo "your_openrouter_key")
gcloud secrets create brave-api-key --data-file=<(echo "your_brave_key")

# Production database (Cloud SQL)
gcloud secrets create database-url --data-file=<(echo "postgresql://user:pass@/db?host=/cloudsql/project:region:instance")
```

#### Production-Optimized Values

```bash
# Security
AUTH_SECRET_KEY=fetch_from_secret_manager
AUTH_ACCESS_TOKEN_EXPIRE_MINUTES=15
AUTH_REFRESH_TOKEN_EXPIRE_DAYS=30
AUTH_BCRYPT_ROUNDS=14
AUTH_ENABLE_REGISTRATION=false
AUTH_REQUIRE_EMAIL_VERIFICATION=true
AUTH_REQUIRE_SSE_AUTH=true

# Database
SESSION_DB_URI=postgresql://user:pass@host:5432/vana
AUTH_DATABASE_URL=postgresql://user:pass@host:5432/vana_auth

# Performance
ALLOW_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
LOG_LEVEL=WARNING
ENABLE_TRACING=true

# Models (production should use Vertex AI)
USE_OPENROUTER=false
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=your-prod-project
```

## 🚀 Google Cloud Run Deployment

### Method 1: Quick Deployment (Recommended)

#### 1. Prepare Environment

```bash
# Set project and configure gcloud
gcloud config set project analystai-454200
gcloud auth configure-docker

# Create service account for Cloud Run
gcloud iam service-accounts create vana-service \
  --description="Vana application service account" \
  --display-name="Vana Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding analystai-454200 \
  --member="serviceAccount:vana-service@analystai-454200.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding analystai-454200 \
  --member="serviceAccount:vana-service@analystai-454200.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding analystai-454200 \
  --member="serviceAccount:vana-service@analystai-454200.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### 2. Store Secrets in Google Secret Manager

```bash
# Generate and store authentication secret
python -c "import secrets; print(secrets.token_hex(64))" | \
  gcloud secrets create auth-secret-key --data-file=-

# Store API keys (replace with your actual keys)
echo "your_openrouter_api_key" | \
  gcloud secrets create openrouter-api-key --data-file=-

echo "your_brave_api_key" | \
  gcloud secrets create brave-api-key --data-file=-

# Verify secrets
gcloud secrets list
```

#### 3. Deploy Backend to Cloud Run

```bash
# Method A: Using Make (simple)
make backend

# Method B: Direct gcloud deployment (more control)
gcloud run deploy vana \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 4Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10 \
  --port 8080 \
  --service-account vana-service@analystai-454200.iam.gserviceaccount.com \
  --set-env-vars GOOGLE_CLOUD_PROJECT=analystai-454200 \
  --set-env-vars GOOGLE_CLOUD_LOCATION=us-central1 \
  --set-env-vars GOOGLE_GENAI_USE_VERTEXAI=true \
  --set-secrets AUTH_SECRET_KEY=auth-secret-key:latest \
  --set-secrets OPENROUTER_API_KEY=openrouter-api-key:latest \
  --set-secrets BRAVE_API_KEY=brave-api-key:latest \
  --allow-unauthenticated \
  --labels created-by=vana,environment=production

# Method C: With Identity-Aware Proxy (for additional security)
make backend IAP=true
```

#### 4. Configure Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service vana \
  --domain api.yourdomain.com \
  --region us-central1

# Set up SSL certificate (automatic with Cloud Run)
gcloud run domain-mappings list
```

### Method 2: Infrastructure as Code with Terraform

#### 1. Initialize Terraform

```bash
# Navigate to Terraform configuration
cd deployment/terraform/dev

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Plan deployment
terraform plan -var-file=vars/env.tfvars -out=deployment.tfplan
```

#### 2. Review and Apply Infrastructure

```bash
# Review the plan
terraform show deployment.tfplan

# Apply infrastructure changes
terraform apply deployment.tfplan

# Verify resources
terraform state list
```

#### 3. Deploy Application

```bash
# Deploy backend service to created infrastructure
make setup-dev-env
make backend

# Verify deployment
DEPLOYMENT_URL=$(gcloud run services describe vana --region=us-central1 --format="value(status.url)")
curl "${DEPLOYMENT_URL}/health"
```

### Method 3: CI/CD Pipeline Setup

#### 1. GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  PROJECT_ID: analystai-454200
  SERVICE: vana
  REGION: us-central1

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup Google Cloud CLI
      uses: google-github-actions/setup-gcloud@v1
      with:
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        project_id: ${{ env.PROJECT_ID }}

    - name: Configure Docker
      run: gcloud auth configure-docker

    - name: Build and Push Docker Image
      run: |
        docker build -t gcr.io/$PROJECT_ID/$SERVICE:$GITHUB_SHA .
        docker push gcr.io/$PROJECT_ID/$SERVICE:$GITHUB_SHA

    - name: Deploy to Cloud Run
      run: |
        gcloud run deploy $SERVICE \
          --image gcr.io/$PROJECT_ID/$SERVICE:$GITHUB_SHA \
          --region $REGION \
          --platform managed \
          --allow-unauthenticated \
          --memory 4Gi \
          --cpu 2 \
          --set-env-vars COMMIT_SHA=$GITHUB_SHA

    - name: Run Health Check
      run: |
        URL=$(gcloud run services describe $SERVICE --region=$REGION --format="value(status.url)")
        curl -f $URL/health || exit 1
```

#### 2. Cloud Build Configuration

Create `cloudbuild.yaml`:

```yaml
steps:
# Build the container image
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'gcr.io/$PROJECT_ID/vana:$COMMIT_SHA', '.']

# Push the container image to Container Registry
- name: 'gcr.io/cloud-builders/docker'
  args: ['push', 'gcr.io/$PROJECT_ID/vana:$COMMIT_SHA']

# Deploy container image to Cloud Run
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  entrypoint: gcloud
  args:
  - 'run'
  - 'deploy'
  - 'vana'
  - '--image'
  - 'gcr.io/$PROJECT_ID/vana:$COMMIT_SHA'
  - '--region'
  - 'us-central1'
  - '--platform'
  - 'managed'
  - '--allow-unauthenticated'
  - '--memory'
  - '4Gi'
  - '--cpu'
  - '2'
  - '--set-env-vars'
  - 'COMMIT_SHA=$COMMIT_SHA'

options:
  logging: CLOUD_LOGGING_ONLY

images:
- 'gcr.io/$PROJECT_ID/vana:$COMMIT_SHA'
```

#### 3. Setup Cloud Build Trigger

```bash
# Create build trigger
gcloud builds triggers create github \
  --repo-name vana \
  --repo-owner NickB03 \
  --branch-pattern "^main$" \
  --build-config cloudbuild.yaml \
  --description "Deploy Vana to Cloud Run on main branch"
```

## 🔐 Authentication & Security

### Security Architecture

The Vana platform implements comprehensive security measures:

```mermaid
graph TB
    A[Client Request] --> B[Cloud Run Load Balancer]
    B --> C[Security Headers Middleware]
    C --> D[CORS Middleware]
    D --> E[Rate Limiting Middleware]
    E --> F[Authentication Middleware]
    F --> G[Authorization/RBAC]
    G --> H[Application Logic]
    
    I[JWT Tokens] --> F
    J[Refresh Tokens] --> K[Database]
    L[Google OAuth2] --> F
    M[Password Security] --> N[bcrypt + salt]
    
    style A fill:#e1f5fe
    style F fill:#ffebee
    style G fill:#f3e5f5
    style H fill:#e8f5e8
```

### Authentication Configuration

#### JWT Token Security

```bash
# Production JWT configuration
AUTH_SECRET_KEY=64_character_hex_string_from_secret_manager
AUTH_ALGORITHM=HS256
AUTH_ACCESS_TOKEN_EXPIRE_MINUTES=15  # Short-lived for security
AUTH_REFRESH_TOKEN_EXPIRE_DAYS=30    # Long-lived for convenience

# Token validation settings
JWT_ISSUER=vana-auth-system
JWT_AUDIENCE=vana-api
```

#### OAuth2 Compliance

The system supports OAuth2 flows:

```bash
# OAuth2 login (recommended)
curl -X POST "https://your-domain/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=SecurePass123!&grant_type=password"

# Token refresh
curl -X POST "https://your-domain/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "your_refresh_token"}'
```

#### Google Cloud IAM Integration

```bash
# Configure Google OAuth2
GOOGLE_CLIENT_ID=your-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=stored-in-secret-manager

# IAM role mapping
GOOGLE_ROLE_MAPPING='{
  "roles/owner": ["admin", "user"],
  "roles/editor": ["user"],
  "roles/viewer": ["viewer"]
}'
```

### Security Headers

Production security headers are automatically applied:

```python
# Applied security headers
SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none';",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY", 
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
}
```

### Rate Limiting

Configure rate limiting for different endpoints:

```python
# Rate limiting configuration
RATE_LIMITS = {
    "/auth/login": "5/minute",          # Login attempts
    "/auth/register": "3/hour",         # Registration attempts
    "/auth/refresh": "10/minute",       # Token refresh
    "/auth/forgot-password": "2/hour"   # Password reset
}
```

## 🤖 LiteLLM & Model Configuration

### Model Architecture

Vana supports multiple AI model providers through LiteLLM:

```mermaid
graph TB
    A[Client Request] --> B[FastAPI Backend]
    B --> C[LiteLLM Router]
    C --> D{Model Provider}
    D -->|Default| E[Google Vertex AI]
    D -->|Alternative| F[OpenRouter]
    D -->|Development| G[Google AI Studio]
    
    E --> H[Gemini 2.5 Pro/Flash]
    F --> I[Qwen 3 Coder]
    G --> J[Gemini Models]
    
    style C fill:#f1f8e9
    style E fill:#4285f4,color:#fff
    style F fill:#ff6b6b,color:#fff
    style G fill:#34a853,color:#fff
```

### Model Configuration Options

#### Option 1: Google Vertex AI (Production Recommended)

```bash
# Environment configuration
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=analystai-454200
USE_OPENROUTER=false

# Models used
CRITIC_MODEL=gemini-2.5-pro    # Analysis and evaluation
WORKER_MODEL=gemini-2.5-flash  # Generation and completion
```

Benefits:
- ✅ Enterprise-grade security and compliance
- ✅ Integrated with Google Cloud IAM
- ✅ High availability and SLA
- ✅ No additional API keys needed

#### Option 2: OpenRouter (Development/Cost-Effective)

```bash
# Environment configuration  
USE_OPENROUTER=true
OPENROUTER_API_KEY=your_openrouter_key
GOOGLE_GENAI_USE_VERTEXAI=false

# Models used
CRITIC_MODEL=openrouter/qwen/qwen-3-coder:free
WORKER_MODEL=openrouter/qwen/qwen-3-coder:free
```

Benefits:
- ✅ Access to multiple model providers
- ✅ Competitive pricing
- ✅ Free tier available
- ✅ Flexible model selection

#### Option 3: Google AI Studio (Development Only)

```bash
# Environment configuration
GOOGLE_GENAI_USE_VERTEXAI=false
GOOGLE_API_KEY=your_google_ai_studio_key
USE_OPENROUTER=false

# Models used (same as Vertex AI)
CRITIC_MODEL=gemini-2.5-pro
WORKER_MODEL=gemini-2.5-flash
```

### Model Setup for Production

#### 1. Vertex AI Setup (Recommended)

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Grant service account access to Vertex AI
gcloud projects add-iam-policy-binding analystai-454200 \
  --member="serviceAccount:vana-service@analystai-454200.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Test Vertex AI access
gcloud ai models list --region=us-central1
```

#### 2. OpenRouter Setup (Alternative)

```bash
# Store OpenRouter API key in Secret Manager
echo "your_openrouter_api_key" | \
  gcloud secrets create openrouter-api-key --data-file=-

# Grant service account access to secret
gcloud secrets add-iam-policy-binding openrouter-api-key \
  --member="serviceAccount:vana-service@analystai-454200.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Model Performance Considerations

| Provider | Latency | Cost | Reliability | Security |
|----------|---------|------|-------------|----------|
| **Vertex AI** | Low | Medium | High | Enterprise |
| **OpenRouter** | Medium | Low | Medium | Good |
| **AI Studio** | Low | Low | Medium | Basic |

**Production Recommendation**: Use Vertex AI for production workloads due to enterprise-grade security, reliability, and Google Cloud integration.

## 🗄️ Database Setup

### Database Architecture

Vana uses a multi-database approach:

```mermaid
graph TB
    A[Application] --> B[Session Database]
    A --> C[Authentication Database]
    
    B --> D{Environment}
    C --> E{Environment}
    
    D -->|Development| F[SQLite Local]
    D -->|Production| G[Cloud SQL PostgreSQL]
    
    E -->|Development| H[SQLite Local]
    E -->|Production| I[Cloud SQL PostgreSQL]
    
    J[GCS Backup] --> F
    J --> H
    
    style B fill:#e8f5e8
    style C fill:#ffebee
    style G,I fill:#4285f4,color:#fff
```

### Development Database Setup

#### SQLite Configuration (Default)

```bash
# Automatically configured paths
SESSION_DB_URI=sqlite:////tmp/vana_sessions.db
AUTH_DATABASE_URL=sqlite:///./auth.db

# Databases are automatically created and initialized
# Backup to GCS happens every 6 hours
```

#### Local PostgreSQL (Optional)

```bash
# Install PostgreSQL locally
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# Create databases
createdb vana_sessions
createdb vana_auth

# Configure environment
SESSION_DB_URI=postgresql://user:pass@localhost:5432/vana_sessions
AUTH_DATABASE_URL=postgresql://user:pass@localhost:5432/vana_auth
```

### Production Database Setup

#### Cloud SQL PostgreSQL (Recommended)

```bash
# Create Cloud SQL instance
gcloud sql instances create vana-postgres \
  --database-version=POSTGRES_15 \
  --tier=db-g1-small \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=20GB \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=04

# Create databases
gcloud sql databases create vana_sessions --instance=vana-postgres
gcloud sql databases create vana_auth --instance=vana-postgres

# Create database user
gcloud sql users create vana-user \
  --instance=vana-postgres \
  --password=secure_password

# Get connection name
INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe vana-postgres --format="value(connectionName)")
echo "Connection name: $INSTANCE_CONNECTION_NAME"
```

#### Database Connection Configuration

```bash
# Store database credentials in Secret Manager
echo "postgresql://vana-user:secure_password@/vana_sessions?host=/cloudsql/$INSTANCE_CONNECTION_NAME" | \
  gcloud secrets create session-db-uri --data-file=-

echo "postgresql://vana-user:secure_password@/vana_auth?host=/cloudsql/$INSTANCE_CONNECTION_NAME" | \
  gcloud secrets create auth-db-uri --data-file=-

# Update Cloud Run service to use Cloud SQL
gcloud run services update vana \
  --add-cloudsql-instances $INSTANCE_CONNECTION_NAME \
  --set-secrets SESSION_DB_URI=session-db-uri:latest \
  --set-secrets AUTH_DATABASE_URL=auth-db-uri:latest \
  --region us-central1
```

### Database Migrations

#### Authentication Database

```bash
# Initialize authentication tables
python -c "from app.auth.database import init_auth_db; init_auth_db()"

# Or run the initialization script
python -m app.auth.database
```

#### Session Database

The session database is automatically managed by the Google ADK framework and requires no manual migration.

### Database Backup and Recovery

#### SQLite Development Backup

```bash
# Manual backup to GCS
python -c "
from app.utils.session_backup import backup_session_db_to_gcs
backup_session_db_to_gcs(
    local_db_path='/tmp/vana_sessions.db',
    bucket_name='analystai-454200-vana-session-storage',
    project_id='analystai-454200'
)
print('Backup completed successfully')
"

# Manual restore from GCS
python -c "
from app.utils.session_backup import restore_session_db_from_gcs
restore_session_db_from_gcs(
    local_db_path='/tmp/vana_sessions.db',
    bucket_name='analystai-454200-vana-session-storage',
    project_id='analystai-454200'
)
print('Restore completed successfully')
"
```

#### Cloud SQL Automatic Backups

```bash
# Configure automated backups (already enabled during creation)
gcloud sql instances patch vana-postgres \
  --backup-start-time=03:00 \
  --backup-location=us-central1

# Create on-demand backup
gcloud sql backups create \
  --instance=vana-postgres \
  --description="Manual backup before deployment"

# List available backups
gcloud sql backups list --instance=vana-postgres
```

## 🏥 Health Checks & Monitoring

### Health Check Endpoints

#### Primary Health Check

```bash
# Basic health check
curl https://your-domain/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-08-10T10:30:00.000Z",
  "service": "vana", 
  "version": "1.0.0",
  "session_storage_enabled": true,
  "session_storage_uri": "gs://analystai-454200-vana-session-storage",
  "session_storage_bucket": "analystai-454200-vana-session-storage"
}
```

#### Authentication Health Check

```bash
# Authentication system health
curl https://your-domain/auth/health

# Expected response
{
  "status": "healthy",
  "database": "connected", 
  "user_count": 42,
  "jwt_signing": "operational",
  "timestamp": "2025-08-10T10:30:00Z"
}
```

### Cloud Run Health Check Configuration

```bash
# Configure Cloud Run health checks
gcloud run services update vana \
  --region us-central1 \
  --port 8080 \
  --http2 \
  --cpu-throttling \
  --max-instances 10 \
  --memory 4Gi \
  --concurrency 100 \
  --timeout 300 \
  --service-account vana-service@analystai-454200.iam.gserviceaccount.com

# Health check is automatically configured to use /health endpoint
```

### Monitoring and Alerting

#### Cloud Monitoring Setup

```bash
# Create notification channel (email)
gcloud alpha monitoring channels create \
  --display-name="Vana Alerts" \
  --type=email \
  --channel-labels=email_address=admin@yourdomain.com

# Create uptime check
gcloud monitoring uptime create \
  --display-name="Vana Health Check" \
  --http-check-path="/health" \
  --hostname="your-cloud-run-url" \
  --timeout=10s \
  --period=60s
```

#### Key Metrics to Monitor

| Metric | Threshold | Alert |
|--------|-----------|-------|
| **Request Latency** | > 5s | Warning |
| **Error Rate** | > 5% | Critical |
| **Memory Usage** | > 80% | Warning |
| **CPU Usage** | > 70% | Warning |
| **Instance Count** | = 0 | Critical |
| **Database Connections** | > 80% | Warning |

#### Looker Studio Dashboard

1. Access the [Vana Monitoring Dashboard](https://lookerstudio.google.com/reporting/create-new-dashboard)
2. Connect to Google Cloud Monitoring data source
3. Add these visualizations:
   - Request latency over time
   - Error rate trend
   - Instance count
   - Memory and CPU utilization
   - Database performance metrics

### Log Analysis

#### Structured Logging

```bash
# View application logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=vana" \
  --project=analystai-454200 \
  --limit=100 \
  --format=json

# Filter by severity
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
  --project=analystai-454200 \
  --limit=50

# Authentication-specific logs
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.message:'SSE connection'" \
  --project=analystai-454200 \
  --limit=20
```

#### Log-based Metrics

```bash
# Create log-based metric for authentication failures
gcloud logging metrics create auth_failures \
  --description="Count of authentication failures" \
  --log-filter='resource.type=cloud_run_revision AND jsonPayload.message:"Authentication failed"'

# Create log-based metric for SSE connections
gcloud logging metrics create sse_connections \
  --description="Count of SSE connections" \
  --log-filter='resource.type=cloud_run_revision AND jsonPayload.message:"SSE connection established"'
```

## 📈 Scaling Configuration

### Auto-scaling Setup

#### Cloud Run Auto-scaling Configuration

```bash
# Configure auto-scaling parameters
gcloud run services update vana \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 100 \
  --concurrency 1000 \
  --cpu-throttling \
  --memory 4Gi \
  --cpu 2

# Configure scaling metrics
gcloud run services update vana \
  --region us-central1 \
  --execution-environment gen2 \
  --cpu-boost \
  --session-affinity
```

#### Advanced Scaling Configuration

```yaml
# Cloud Run service configuration (YAML)
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  annotations:
    # Auto-scaling configuration
    autoscaling.knative.dev/minScale: "1"
    autoscaling.knative.dev/maxScale: "100"
    autoscaling.knative.dev/target: "80"
    
    # Performance optimizations
    run.googleapis.com/execution-environment: gen2
    run.googleapis.com/cpu-throttling: "false"
    run.googleapis.com/memory: "4Gi"
    run.googleapis.com/cpu: "2"
    
    # Session affinity for WebSocket/SSE
    run.googleapis.com/sessionAffinity: "true"
```

### Load Testing

#### Basic Load Testing

```bash
# Install load testing tools
pip install locust

# Create load test script
cat > locust_test.py << 'EOF'
from locust import HttpUser, task, between
import json
import random

class VanaLoadTest(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login and get token
        response = self.client.post("/auth/login", data={
            "username": "testuser",
            "password": "TestPass123!",
            "grant_type": "password"
        }, headers={"Content-Type": "application/x-www-form-urlencoded"})
        
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        
    @task(3)
    def health_check(self):
        self.client.get("/health")
    
    @task(2) 
    def auth_check(self):
        if hasattr(self, 'headers'):
            self.client.get("/auth/me", headers=self.headers)
    
    @task(1)
    def create_session(self):
        if hasattr(self, 'headers'):
            self.client.post(
                f"/api/apps/app/users/testuser{random.randint(1,1000)}/sessions",
                headers=self.headers
            )
EOF

# Run load test
locust -f locust_test.py --host=https://your-domain --users=50 --spawn-rate=5
```

#### Performance Benchmarking

```bash
# CPU and memory intensive test
cat > performance_test.py << 'EOF'
import asyncio
import aiohttp
import time
import statistics

async def benchmark_endpoint(session, url, concurrent_requests=50):
    start_time = time.time()
    latencies = []
    
    async def make_request():
        request_start = time.time()
        try:
            async with session.get(url) as response:
                await response.text()
                latencies.append(time.time() - request_start)
                return response.status
        except Exception as e:
            return 500
    
    # Create concurrent requests
    tasks = [make_request() for _ in range(concurrent_requests)]
    results = await asyncio.gather(*tasks)
    
    total_time = time.time() - start_time
    success_count = sum(1 for status in results if status == 200)
    
    print(f"Total time: {total_time:.2f}s")
    print(f"Successful requests: {success_count}/{concurrent_requests}")
    print(f"Request rate: {concurrent_requests/total_time:.2f} req/s")
    print(f"Average latency: {statistics.mean(latencies):.3f}s")
    print(f"95th percentile: {statistics.quantiles(latencies, n=20)[18]:.3f}s")

async def main():
    async with aiohttp.ClientSession() as session:
        await benchmark_endpoint(session, "https://your-domain/health")

asyncio.run(main())
EOF

python performance_test.py
```

### Performance Optimization

#### Application-Level Optimizations

```python
# app/config.py - Production optimizations
PRODUCTION_OPTIMIZATIONS = {
    # Connection pooling
    "database_pool_size": 20,
    "database_max_overflow": 30,
    "database_pool_pre_ping": True,
    "database_pool_recycle": 3600,
    
    # Caching
    "session_cache_ttl": 3600,
    "response_cache_ttl": 300,
    
    # Request handling
    "uvicorn_workers": 1,  # Cloud Run handles scaling
    "uvicorn_loop": "uvloop",
    "uvicorn_http": "httptools",
    "max_request_size": 16 * 1024 * 1024,  # 16MB
    
    # Security
    "trusted_hosts": ["your-domain.com"],
    "allowed_origins": ["https://your-domain.com"]
}
```

#### Infrastructure Optimizations

```bash
# Optimize Cloud Run configuration
gcloud run services update vana \
  --region us-central1 \
  --memory 8Gi \
  --cpu 4 \
  --concurrency 1000 \
  --max-instances 100 \
  --execution-environment gen2 \
  --cpu-boost

# Enable CDN for static content
gcloud compute backend-services update vana-backend \
  --enable-cdn \
  --cache-mode CACHE_ALL_STATIC
```

## 📊 Backup & Recovery

### Backup Strategy

#### Comprehensive Backup Plan

| Component | Method | Frequency | Retention |
|-----------|---------|-----------|-----------|
| **Session Database** | Automated GCS backup | Every 6 hours | 30 days |
| **Auth Database** | Cloud SQL backup | Daily | 30 days |
| **Application Code** | Git repository | On commit | Forever |
| **Configuration** | Secret Manager | On change | 30 versions |
| **Infrastructure** | Terraform state | On apply | 30 versions |

#### Automated Backup Setup

```bash
# Create backup storage bucket
gsutil mb -p analystai-454200 -c NEARLINE -l us-central1 \
  gs://analystai-454200-vana-backups

# Set lifecycle policy for cost optimization  
cat > lifecycle.json << 'EOF'
{
  "rule": [
    {
      "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
      "condition": {"age": 30}
    },
    {
      "action": {"type": "Delete"},
      "condition": {"age": 365}
    }
  ]
}
EOF

gsutil lifecycle set lifecycle.json gs://analystai-454200-vana-backups
```

#### Database Backup Procedures

```bash
# Manual session database backup
python -c "
from app.utils.session_backup import backup_session_db_to_gcs
import datetime

backup_name = f'manual-backup-{datetime.datetime.now().isoformat()}'
backup_session_db_to_gcs(
    local_db_path='/tmp/vana_sessions.db',
    bucket_name='analystai-454200-vana-backups',
    project_id='analystai-454200',
    backup_name=backup_name
)
print(f'Manual backup created: {backup_name}')
"

# Manual Cloud SQL backup
gcloud sql backups create \
  --instance=vana-postgres \
  --description="Pre-deployment backup $(date +%Y%m%d-%H%M%S)"

# Verify backups
gsutil ls gs://analystai-454200-vana-backups/
gcloud sql backups list --instance=vana-postgres
```

### Disaster Recovery

#### Recovery Procedures

```bash
# 1. Restore session database from backup
python -c "
from app.utils.session_backup import restore_session_db_from_gcs

restore_session_db_from_gcs(
    local_db_path='/tmp/vana_sessions_restored.db',
    bucket_name='analystai-454200-vana-backups', 
    project_id='analystai-454200',
    backup_name='specific-backup-name'  # or latest
)
print('Session database restored successfully')
"

# 2. Restore Cloud SQL from backup
BACKUP_ID=$(gcloud sql backups list --instance=vana-postgres --limit=1 --format="value(id)")
gcloud sql backups restore $BACKUP_ID \
  --restore-instance=vana-postgres-restored \
  --instance=vana-postgres

# 3. Redeploy application
gcloud run services replace service.yaml --region=us-central1

# 4. Update DNS/routing if needed
gcloud run domain-mappings create \
  --service vana \
  --domain api.yourdomain.com \
  --region us-central1
```

#### Recovery Testing

```bash
# Create disaster recovery test script
cat > test_recovery.sh << 'EOF'
#!/bin/bash

echo "Starting disaster recovery test..."

# 1. Create test backup
echo "Creating test backup..."
python -c "from app.utils.session_backup import backup_session_db_to_gcs; backup_session_db_to_gcs('/tmp/vana_sessions.db', 'analystai-454200-vana-backups', 'analystai-454200', 'dr-test')"

# 2. Simulate data loss
echo "Simulating data loss..."
rm -f /tmp/vana_sessions_test.db

# 3. Restore from backup  
echo "Restoring from backup..."
python -c "from app.utils.session_backup import restore_session_db_from_gcs; restore_session_db_from_gcs('/tmp/vana_sessions_test.db', 'analystai-454200-vana-backups', 'analystai-454200', 'dr-test')"

# 4. Verify restoration
if [ -f "/tmp/vana_sessions_test.db" ]; then
    echo "✅ Disaster recovery test PASSED"
    rm -f /tmp/vana_sessions_test.db
else
    echo "❌ Disaster recovery test FAILED" 
    exit 1
fi
EOF

chmod +x test_recovery.sh
./test_recovery.sh
```

## 🔄 CI/CD Pipeline Setup

### GitHub Actions Workflow

Create `.github/workflows/deploy-production.yml`:

```yaml
name: Production Deployment

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  PROJECT_ID: analystai-454200
  SERVICE: vana
  REGION: us-central1
  REGISTRY: gcr.io

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install uv
      run: pip install uv
      
    - name: Install dependencies
      run: uv sync --dev
      
    - name: Run tests
      run: |
        uv run pytest tests/unit -v
        uv run pytest tests/integration -v
      
    - name: Run linting
      run: |
        uv run ruff check .
        uv run mypy .

  security-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run security scan
      uses: securecodewarrior/github-action-add-sarif@v1
      with:
        sarif-file: security-scan.sarif

  build-and-deploy:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Google Cloud CLI
      uses: google-github-actions/setup-gcloud@v1
      with:
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        project_id: ${{ env.PROJECT_ID }}
    
    - name: Configure Docker
      run: gcloud auth configure-docker
    
    - name: Build Docker image
      run: |
        docker build \
          --build-arg COMMIT_SHA=${{ github.sha }} \
          -t ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/${{ env.SERVICE }}:${{ github.sha }} \
          -t ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/${{ env.SERVICE }}:latest \
          .
    
    - name: Push Docker image
      run: |
        docker push ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/${{ env.SERVICE }}:${{ github.sha }}
        docker push ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/${{ env.SERVICE }}:latest
    
    - name: Deploy to Cloud Run
      run: |
        gcloud run deploy ${{ env.SERVICE }} \
          --image ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/${{ env.SERVICE }}:${{ github.sha }} \
          --region ${{ env.REGION }} \
          --platform managed \
          --service-account vana-service@${{ env.PROJECT_ID }}.iam.gserviceaccount.com \
          --set-env-vars COMMIT_SHA=${{ github.sha }} \
          --set-secrets AUTH_SECRET_KEY=auth-secret-key:latest \
          --set-secrets OPENROUTER_API_KEY=openrouter-api-key:latest \
          --set-secrets BRAVE_API_KEY=brave-api-key:latest

    - name: Health Check
      run: |
        URL=$(gcloud run services describe ${{ env.SERVICE }} --region=${{ env.REGION }} --format="value(status.url)")
        echo "Testing health endpoint: $URL/health"
        
        for i in {1..30}; do
          if curl -f "$URL/health" > /dev/null 2>&1; then
            echo "✅ Health check passed"
            exit 0
          fi
          echo "Health check attempt $i failed, retrying in 10s..."
          sleep 10
        done
        
        echo "❌ Health check failed after 30 attempts"
        exit 1

    - name: Run smoke tests
      run: |
        URL=$(gcloud run services describe ${{ env.SERVICE }} --region=${{ env.REGION }} --format="value(status.url)")
        
        # Test authentication endpoint
        curl -f "$URL/auth/health" || exit 1
        
        # Test model endpoint (if accessible)
        # Add more smoke tests as needed
        
        echo "✅ All smoke tests passed"
```

## 🐛 Troubleshooting Deployment Issues

### Common Deployment Issues

#### 1. Container Build Failures

**Symptoms:**
- Docker build fails during `uv sync`
- Missing dependency errors
- Python version conflicts

**Solutions:**
```bash
# Clear Docker cache
docker system prune -f

# Rebuild with no cache
docker build --no-cache -t vana:debug .

# Check dependency conflicts
uv sync --verbose

# Validate pyproject.toml
uv check pyproject.toml
```

#### 2. Authentication Setup Issues

**Symptoms:**
- "Invalid credentials" during deployment
- Service account permission errors
- Secret Manager access denied

**Solutions:**
```bash
# Verify service account permissions
gcloud projects get-iam-policy analystai-454200 | grep vana-service

# Check secret access
gcloud secrets versions access latest --secret=auth-secret-key

# Test service account impersonation
gcloud auth activate-service-account --key-file=service-account.json
gcloud auth list
```

#### 3. Database Connection Issues  

**Symptoms:**
- "Connection refused" errors
- Database initialization failures
- Migration errors

**Solutions:**
```bash
# Test database connectivity
python -c "
from app.auth.database import get_auth_db
try:
    db = next(get_auth_db())
    print('✅ Database connection successful')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
"

# Recreate database tables
python -c "
from app.auth.database import init_auth_db
from app.auth.models import Base
init_auth_db()
print('Database reinitialized')
"

# Check Cloud SQL connection for production
gcloud sql connect vana-postgres --user=vana-user
```

#### 4. Environment Variable Issues

**Symptoms:**
- Missing configuration errors  
- Invalid secret references
- CORS policy violations

**Solutions:**
```bash
# Verify all required environment variables
cat > check_env.py << 'EOF'
import os
required_vars = [
    'GOOGLE_CLOUD_PROJECT',
    'AUTH_SECRET_KEY', 
    'SESSION_DB_URI',
]

missing = []
for var in required_vars:
    if not os.environ.get(var):
        missing.append(var)

if missing:
    print(f"❌ Missing environment variables: {missing}")
else:
    print("✅ All required environment variables present")
EOF

python check_env.py

# Update Cloud Run with missing variables
gcloud run services update vana \
  --set-env-vars MISSING_VAR=value \
  --region us-central1
```

#### 5. Model Provider Issues

**Symptoms:**
- Model API authentication errors
- Rate limiting from model providers
- Model unavailability errors

**Solutions:**
```bash
# Test Vertex AI access
gcloud ai models list --region=us-central1

# Test OpenRouter connection
python -c "
import os
import requests

api_key = os.environ.get('OPENROUTER_API_KEY')
if not api_key:
    print('❌ OpenRouter API key not found')
else:
    response = requests.get(
        'https://openrouter.ai/api/v1/models',
        headers={'Authorization': f'Bearer {api_key}'}
    )
    print(f'OpenRouter API status: {response.status_code}')
"

# Switch model providers if needed
# Update environment variables and redeploy
```

### Performance Issues

#### Memory and CPU Optimization

```bash
# Monitor resource usage
gcloud run services describe vana --region=us-central1 | grep -E "(cpu|memory)"

# Update resource allocation
gcloud run services update vana \
  --memory 8Gi \
  --cpu 4 \
  --region us-central1

# Enable CPU boost for cold starts
gcloud run services update vana \
  --cpu-boost \
  --region us-central1
```

#### Database Performance Tuning

```bash
# For Cloud SQL - optimize connection pooling
gcloud sql instances patch vana-postgres \
  --database-flags max_connections=100,shared_preload_libraries=pg_stat_statements

# Monitor slow queries
gcloud sql instances describe vana-postgres --format="value(databaseInstalledVersion)"
```

### Debugging Tools

#### Live Debugging

```bash
# Stream Cloud Run logs
gcloud run services logs tail vana --region=us-central1

# Debug container locally
docker run -it --entrypoint=/bin/bash vana:latest

# Test endpoints directly
curl -v https://your-domain/health
curl -v https://your-domain/auth/health
```

#### Monitoring and Alerts

```bash
# Set up error rate alerting
gcloud alpha monitoring policies create \
  --policy-from-file=error-rate-policy.yaml

# Create custom metrics
gcloud logging metrics create deployment_errors \
  --description="Deployment-related errors" \
  --log-filter='resource.type=cloud_run_revision AND severity>=ERROR'
```

## 🛡️ Security Hardening for Production

### Infrastructure Security

#### Network Security

```bash
# Create VPC for enhanced security
gcloud compute networks create vana-vpc --subnet-mode=custom

# Create private subnet
gcloud compute networks subnets create vana-subnet \
  --network=vana-vpc \
  --range=10.0.0.0/24 \
  --region=us-central1

# Configure Cloud NAT for outbound traffic
gcloud compute routers create vana-router \
  --network=vana-vpc \
  --region=us-central1

gcloud compute routers nats create vana-nat \
  --router=vana-router \
  --region=us-central1 \
  --nat-all-subnet-ip-ranges
```

#### Identity and Access Management

```bash
# Create least-privilege service account
gcloud iam service-accounts create vana-prod-service \
  --description="Production service account for Vana" \
  --display-name="Vana Production Service"

# Grant minimal required permissions
for role in roles/storage.objectAdmin roles/aiplatform.user roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding analystai-454200 \
    --member="serviceAccount:vana-prod-service@analystai-454200.iam.gserviceaccount.com" \
    --role="$role"
done

# Remove default compute service account access
gcloud run services update vana \
  --service-account=vana-prod-service@analystai-454200.iam.gserviceaccount.com \
  --region=us-central1
```

#### Secret Management

```bash
# Rotate all production secrets
python -c "import secrets; print(secrets.token_hex(64))" | \
  gcloud secrets versions add auth-secret-key --data-file=-

# Set up automatic secret rotation (manual process)
# 1. Generate new secrets
# 2. Update Secret Manager  
# 3. Deploy with new secret versions
# 4. Verify deployment health
# 5. Deactivate old secret versions
```

### Application Security

#### Security Headers Enhancement

```python
# Enhanced security headers for production
PRODUCTION_SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://api.yourdomain.com wss://api.yourdomain.com; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    ),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": (
        "camera=(), microphone=(), geolocation=(), "
        "payment=(), usb=(), magnetometer=(), "
        "accelerometer=(), gyroscope=()"
    )
}
```

#### Input Validation and Rate Limiting

```python
# Production rate limiting configuration
PRODUCTION_RATE_LIMITS = {
    "/auth/login": "3/minute",          # Stricter login limits
    "/auth/register": "1/hour",         # Very restrictive registration
    "/auth/refresh": "5/minute",        # Token refresh limit
    "/auth/forgot-password": "1/hour",  # Password reset limit
    "/api/": "100/minute",              # General API limit
    "global": "1000/hour"               # Global per-IP limit
}

# Input validation enhancement
SECURITY_VALIDATIONS = {
    "max_request_size": 1024 * 1024,    # 1MB max request
    "max_json_depth": 10,               # Prevent JSON bombs
    "max_array_length": 1000,           # Limit array sizes
    "allowed_content_types": [
        "application/json",
        "application/x-www-form-urlencoded",
        "multipart/form-data"
    ]
}
```

### Compliance and Auditing

#### Audit Logging Setup

```bash
# Enable Cloud Audit Logs
gcloud logging sinks create vana-audit-sink \
  bigquery.googleapis.com/projects/analystai-454200/datasets/audit_logs \
  --log-filter='protoPayload.serviceName="run.googleapis.com"'

# Create compliance monitoring dashboard
gcloud monitoring dashboards create \
  --config-from-file=compliance-dashboard.json
```

#### Data Privacy Compliance

```python
# GDPR/Privacy compliance features
PRIVACY_CONFIG = {
    # Data retention policies
    "session_retention_days": 90,
    "log_retention_days": 365,
    "user_data_retention_days": 1095,  # 3 years
    
    # Data minimization
    "log_pii_fields": False,
    "encrypt_sensitive_fields": True,
    "anonymize_user_ids_in_logs": True,
    
    # Right to be forgotten
    "enable_data_deletion": True,
    "data_export_format": "json",
    "deletion_verification": True
}
```

### Final Security Checklist

#### Pre-Production Security Review

- [ ] **Authentication & Authorization**
  - [ ] JWT tokens use secure, randomly generated secrets
  - [ ] Token expiration times are appropriately short
  - [ ] Refresh token rotation is implemented
  - [ ] RBAC permissions are properly configured

- [ ] **Network Security**
  - [ ] All traffic uses HTTPS/TLS
  - [ ] CORS is properly configured for production domains
  - [ ] Rate limiting is enabled and configured
  - [ ] Security headers are implemented

- [ ] **Data Protection**
  - [ ] Sensitive data is encrypted at rest
  - [ ] Database connections use encrypted connections
  - [ ] Secrets are stored in Google Secret Manager
  - [ ] PII is properly handled and anonymized in logs

- [ ] **Infrastructure Security**
  - [ ] Service accounts follow principle of least privilege
  - [ ] IAM roles are properly scoped
  - [ ] Network access is restricted where possible
  - [ ] Container images are scanned for vulnerabilities

- [ ] **Monitoring & Incident Response**
  - [ ] Security monitoring is configured
  - [ ] Alerting is set up for security events
  - [ ] Incident response procedures are documented
  - [ ] Regular security assessments are scheduled

---

## 📞 Support & Resources

### Documentation Links

- **Project Repository**: [https://github.com/NickB03/vana](https://github.com/NickB03/vana)
- **Google ADK Documentation**: [https://cloud.google.com/adk/docs](https://cloud.google.com/adk/docs)
- **Cloud Run Documentation**: [https://cloud.google.com/run/docs](https://cloud.google.com/run/docs)
- **FastAPI Documentation**: [https://fastapi.tiangolo.com/](https://fastapi.tiangolo.com/)
- **LiteLLM Documentation**: [https://litellm.vercel.app/](https://litellm.vercel.app/)

### Community & Support

- **Issues & Bug Reports**: [GitHub Issues](https://github.com/NickB03/vana/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/NickB03/vana/discussions)
- **Security Issues**: Contact maintainers directly

### Version Information

- **Deployment Guide Version**: v2.0.0
- **Last Updated**: January 2025
- **Compatible Vana Versions**: 0.1.0+
- **Maintainer**: Vana Development Team

---

*This comprehensive deployment guide covers all aspects of deploying the Vana platform from local development to production. For additional support or custom deployment scenarios, please refer to the project documentation or open an issue in the repository.*