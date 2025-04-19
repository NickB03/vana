# Deployment Guide

## Prerequisites
- Docker Desktop installed
- Google Cloud SDK configured
- Python 3.11+ and pip
- Node.js 18+ and npm (for frontend)

## Architecture Diagram
[View system architecture](docs/ARCHITECTURE.md#system-diagram)

## Backend Deployment (Python)
### Production
```bash
# Build and push Docker image
docker build -t gcr.io/$(gcloud config get-value project)/vana-server:latest .
docker push gcr.io/$(gcloud config get-value project)/vana-server:latest

# Deploy to Cloud Run
gcloud run deploy vana-server \
  --image gcr.io/$(gcloud config get-value project)/vana-server:latest \
  --set-env-vars=GEMINI_API_KEY=...,SUPABASE_URL=...,SUPABASE_KEY=... \
  --region=us-central1 \
  --allow-unauthenticated \
  --min-instances=1 \
  --max-instances=10

# Verify deployment
curl "https://$(gcloud run services describe vana-server --format='value(url)')" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

### Local Development
```bash
# Install dependencies
pip install -U uvicorn[standard] gunicorn n8n supabase-client korvus

# Start local server
uvicorn main:app --reload

# Access API documentation
http://localhost:8000/docs
```

## Frontend Deployment (Lovable UI)
### Production
```bash
cd lovable_ui
npm install
npm run build
gsutil -m cp -r build gs://your-frontend-bucket
```

### Local Development
```bash
cd lovable_ui
npm install
npm run dev
```

## Database Setup
### Supabase
```bash
supabase init
supabase db create vana
supabase db schema push
supabase storage buckets create assets
```

### Korvus Vector DB
```bash
# Build and deploy Korvus service
cd korvus_config
docker build -t korvus-service:latest .
docker run -p 5432:5432 --name korvus-container korvus-service:latest
```

## CI/CD Pipeline
### GitHub Actions Example
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          cd korvus_config
          pip install -r requirements.txt

      - name: Build Docker images
        run: |
          docker build -t vana-server:latest .
          docker build -t korvus-service:latest korvus_config/

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy vana-server \
            --image gcr.io/$(gcloud config get-value project)/vana-server:latest \
            --set-env-vars=GEMINI_API_KEY=...,SUPABASE_URL=...,SUPABASE_KEY=... \
            --region=us-central1 \
            --allow-unauthenticated \
            --min-instances=1 \
            --max-instances=10

      - name: Deploy frontend
        run: |
          cd lovable_ui
          npm run build
          gsutil -m cp -r build gs://your-frontend-bucket
```

## Environment Variables
All services require these variables:
```env
# Required
GEMINI_API_KEY=your_gemini_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
VANA_ADMIN_EMAIL=admin@example.com
VANA_ADMIN_PASSWORD=secure_password

# Optional
DEBUG=true
LOG_LEVEL=debug
CORS_ORIGINS=http://localhost:3000
```

## Monitoring
- Check Cloud Run logs: `gcloud run logs vana-server`
- Monitor Supabase database: `supabase db logs`
- View agent activity: `psql -h supabase-url -U postgres -d vana_db -c "SELECT * FROM view_agent_activity_recent;"`

## Rollback Strategy
1. Identify problematic commit: `git log --oneline`
2. Rollback deployment: `gcloud run services rollback vana-server --to-revision=COMMIT_HASH`
3. Restore database from backup: `supabase db restore --from backup_id`
