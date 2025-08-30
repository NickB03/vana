# Local-First Build & Development Guide

## 🎯 Overview

This project has been configured with a **local-first** approach, prioritizing local development and testing before cloud deployment. This ensures stability, faster iteration, and reduced cloud costs during development.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- UV package manager

### Initial Setup
```bash
# Install dependencies
make install

# Set up local environment
make setup-local-env

# Start development servers
make dev
```

## 🏗️ Build Commands

### Standard Development
```bash
# Run full local build & test
make build-local

# Start backend only
make local-backend

# Start frontend only
make dev-frontend

# Run all services
make dev
```

### Docker Development
```bash
# Build Docker images
make docker-build

# Start all services with Docker
make docker-up

# View logs
make docker-logs

# Stop services
make docker-down

# Full restart
make docker-restart
```

### Testing
```bash
# Run all tests
make test

# Run linting
make lint

# Type checking
make typecheck

# Full build validation
make build-local
```

## 📁 Project Structure

```
vana/
├── app/                    # Backend Python application
├── frontend/              # Next.js frontend
├── tests/                 # Test suites
├── .github/workflows/     # CI/CD pipelines
│   ├── local-build.yml   # Local build pipeline
│   ├── main-ci.yml       # Main CI (local-focused)
│   └── deploy.yml        # Cloud deployment (disabled)
├── docker-compose.yml     # Local Docker services
├── Dockerfile.local       # Local development Docker
└── Makefile              # Build commands
```

## 🐳 Docker Services

The `docker-compose.yml` provides:
- **Backend**: FastAPI server on port 8000
- **Frontend**: Next.js on port 5173
- **PostgreSQL**: Database on port 5432
- **Redis**: Cache on port 6379

## 🔄 CI/CD Pipeline

### Active Workflows
1. **local-build.yml**: Primary CI pipeline for local builds
   - Runs on all branches
   - Tests, linting, type checking
   - Docker build validation
   - Performance testing

2. **main-ci.yml**: Comprehensive testing
   - Parallel test execution
   - Security scanning
   - Code quality checks

### Disabled Workflows
- **deploy.yml**: Cloud Run deployment (temporarily disabled)
  - Will be re-enabled after local stability is achieved

## 🛠️ Development Workflow

### 1. Local Development
```bash
# Start development
make dev

# Make changes to code...

# Run tests
make test

# Check code quality
make lint
```

### 2. Docker Testing
```bash
# Build and test with Docker
make docker-build
make docker-up

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:5173
```

### 3. CI Validation
```bash
# Push to branch
git push

# CI automatically runs:
# - Build validation
# - Tests
# - Security scans
# - Performance tests
```

## 📊 Monitoring & Debugging

### View Logs
```bash
# Docker logs
make docker-logs

# Specific service
docker-compose logs backend -f
docker-compose logs frontend -f
```

### Health Checks
```bash
# Backend health
curl http://localhost:8000/health

# Database status
docker-compose exec postgres pg_isready

# Redis ping
docker-compose exec redis redis-cli ping
```

## 🔧 Environment Configuration

### Local Environment Files
- `.env.local`: Local development configuration
- `.env.local.template`: Template for environment variables

### Key Environment Variables
```bash
# Backend
ENVIRONMENT=local
ALLOW_ORIGINS=*
LOG_LEVEL=INFO

# Frontend
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8000

# Database
POSTGRES_USER=vana
POSTGRES_PASSWORD=localdev
POSTGRES_DB=vana_dev
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Stop all services
make docker-down

# Check for running processes
lsof -i :8000
lsof -i :5173
```

#### Docker Build Failures
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

#### Test Failures
```bash
# Run specific test
uv run pytest tests/unit/test_specific.py -v

# Skip integration tests
uv run pytest tests/unit -v
```

## 📈 Performance Optimization

### Local Build Optimization
- Parallel test execution
- Docker layer caching
- Dependency caching
- Incremental builds

### Resource Usage
- Backend: 2GB RAM recommended
- Frontend: 1GB RAM recommended
- Database: 512MB RAM minimum
- Redis: 256MB RAM minimum

## 🔄 Migration to Cloud

When ready to deploy to cloud:

1. Ensure all local tests pass
2. Update GCP credentials
3. Re-enable deployment workflow
4. Uncomment cloud deployment in Makefile
5. Configure production environment variables

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 🤝 Contributing

1. Create feature branch
2. Run local tests: `make build-local`
3. Verify Docker build: `make docker-build`
4. Push for CI validation
5. Create pull request

## 📝 Notes

- Cloud deployment is temporarily disabled to focus on local stability
- All CI/CD pipelines are configured for local-first validation
- Docker Compose provides complete local development environment
- Performance and integration tests run locally before any deployment