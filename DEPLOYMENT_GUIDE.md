# VANA Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Python 3.13+
- Docker installed
- Node.js 20+
- Google API key

### Local Development

1. **Backend Setup**
```bash
# Install dependencies
poetry install

# Set environment variables
cp .env.example .env
# Edit .env with your GOOGLE_API_KEY

# Start backend
python main.py
# Or for agentic features:
python main_agentic.py
```

2. **Frontend Setup**
```bash
# Navigate to UI directory
cd vana-ui

# Install dependencies
npm install

# Start development server
npm run dev
```

3. **Access Application**
- Frontend: http://localhost:5173
- Backend: http://localhost:8081
- Login: demo@vana.ai / vana-demo-2024

### Docker Deployment

1. **Using Docker Compose (Recommended)**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

2. **Production Build**
```bash
# Build production image
docker build -t vana-prod -f Dockerfile.prod .

# Run production container
docker run -d \
  --name vana-prod \
  -p 8080:8080 \
  --env-file .env \
  vana-prod:latest
```

## 🔍 Key Features to Test

### 1. ThinkingPanel
- Submit queries about security, data analysis, or architecture
- Watch the thinking panel show real-time agent orchestration
- Toggle thinking visibility with the "Show thinking" button

### 2. Agent Specialization
Test these queries to see different specialists:
- "What are the security vulnerabilities in this code?"
- "Analyze the data trends for the last quarter"
- "Review the architecture of this microservice"
- "How should I deploy this to production?"
- "Create test cases for this feature"
- "Design a responsive UI component"

### 3. Streaming Responses
- Responses stream in real-time
- Thinking steps appear as they happen
- Clean, formatted output from VANA

## 📋 Production Checklist

Before deploying to production:

- [ ] Set production GOOGLE_API_KEY
- [ ] Configure GOOGLE_CLOUD_PROJECT
- [ ] Update CORS origins in main.py
- [ ] Set up Redis for persistent memory (optional)
- [ ] Configure proper authentication (replace static login)
- [ ] Set up monitoring and logging
- [ ] Configure SSL/TLS certificates
- [ ] Set up backup strategy

## 🐛 Troubleshooting

### Backend Issues
```bash
# Check Python version
python --version  # Should be 3.13+

# Verify dependencies
poetry show

# Check logs
tail -f logs/vana.log
```

### Frontend Issues
```bash
# Clear cache and reinstall
cd vana-ui
rm -rf node_modules
npm install

# Check for build errors
npm run build
```

### Docker Issues
```bash
# Clean Docker resources
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check container logs
docker logs vana-prod
```

## 🌐 Cloud Deployment

### Google Cloud Run
```bash
# Build and push to GCR
docker build -t gcr.io/YOUR_PROJECT/vana:latest .
docker push gcr.io/YOUR_PROJECT/vana:latest

# Deploy to Cloud Run
gcloud run deploy vana \
  --image gcr.io/YOUR_PROJECT/vana:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### AWS ECS
1. Push image to ECR
2. Create ECS task definition
3. Deploy service with ALB

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vana
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vana
  template:
    metadata:
      labels:
        app: vana
    spec:
      containers:
      - name: vana
        image: vana-prod:latest
        ports:
        - containerPort: 8080
        env:
        - name: GOOGLE_API_KEY
          valueFrom:
            secretKeyRef:
              name: vana-secrets
              key: google-api-key
```

## 📊 Monitoring

- Health check: GET /health
- Metrics endpoint: GET /metrics (if enabled)
- Recommended: Prometheus + Grafana
- Log aggregation: ELK stack or Google Cloud Logging

## 🔒 Security Notes

1. **API Keys**: Never commit API keys to git
2. **Authentication**: Replace static auth before production
3. **CORS**: Configure allowed origins properly
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **SSL/TLS**: Always use HTTPS in production

## 📞 Support

For issues or questions:
1. Check logs for error details
2. Verify all environment variables are set
3. Ensure all dependencies are installed
4. Test with minimal configuration first