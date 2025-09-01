# Docker Deployment Guide

This guide provides comprehensive instructions for deploying the VANA application using Docker in both development and production environments.

## Overview

The VANA application consists of:
- **Frontend**: Next.js 15 application with SSE streaming
- **Backend**: Python FastAPI with Google SDK integration
- **Database**: PostgreSQL for data persistence
- **Cache**: Redis for session and caching
- **Reverse Proxy**: Nginx for production load balancing

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Nginx    │───▶│  Frontend   │    │   Backend   │
│ (Port 80)   │    │ (Port 3000) │◀──▶│ (Port 8080) │
└─────────────┘    └─────────────┘    └─────────────┘
                           │                   │
                           ▼                   ▼
                   ┌─────────────┐    ┌─────────────┐
                   │ PostgreSQL  │    │    Redis    │
                   │ (Port 5432) │    │ (Port 6379) │
                   └─────────────┘    └─────────────┘
```

## Development Deployment

### Prerequisites
- Docker and Docker Compose installed
- Node.js 20+ (for local development)
- Git repository cloned

### Quick Start
```bash
# Clone the repository
git clone https://github.com/NickB03/vana.git
cd vana

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

### Environment Configuration
Create a `.env.local` file in the project root:
```bash
# Database
POSTGRES_USER=vana
POSTGRES_PASSWORD=localdev
POSTGRES_DB=vana_dev
POSTGRES_URL=postgresql://vana:localdev@postgres:5432/vana_dev

# Redis
REDIS_URL=redis://redis:6379

# Authentication
AUTH_SECRET=your-local-development-secret-key
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-local-development-secret-key

# API Keys (get from respective providers)
XAI_API_KEY=your-xai-api-key
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token

# VANA Backend
VANA_BASE_URL=http://backend:8080
NEXT_PUBLIC_VANA_BASE_URL=http://localhost:8000

# Google Cloud (optional)
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Production Deployment

### Prerequisites
- Docker and Docker Compose installed on production server
- Domain name configured (optional)
- SSL certificates (for HTTPS)
- Environment variables configured

### Production Setup
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# Or with environment file
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### Production Environment Variables
Create a `.env.prod` file:
```bash
# Database (use managed database in production)
POSTGRES_USER=vana_prod
POSTGRES_PASSWORD=secure-production-password
POSTGRES_DB=vana_production
POSTGRES_URL=postgresql://vana_prod:secure-password@your-db-host:5432/vana_production

# Redis (use managed Redis in production)
REDIS_URL=redis://your-redis-host:6379
REDIS_PASSWORD=secure-redis-password

# Authentication (generate secure secrets)
AUTH_SECRET=your-super-secure-production-secret-64-chars-long
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secure-production-secret-64-chars-long

# API Keys
XAI_API_KEY=your-production-xai-api-key
BLOB_READ_WRITE_TOKEN=your-production-blob-token

# VANA Backend
VANA_BASE_URL=http://backend:8080
NEXT_PUBLIC_VANA_BASE_URL=https://your-domain.com

# Frontend URL for CORS
FRONTEND_URL=https://your-domain.com

# Google Cloud
GOOGLE_PROJECT_ID=your-production-project-id
GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json
```

## SSL/HTTPS Configuration

### Using Let's Encrypt
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificates
sudo certbot --nginx -d your-domain.com

# Update nginx.conf to enable HTTPS block
# Restart nginx container
docker-compose restart nginx
```

### Using Custom Certificates
```bash
# Place certificates in ssl/ directory
mkdir ssl
cp your-cert.pem ssl/cert.pem
cp your-key.pem ssl/key.pem

# Update nginx.conf HTTPS block
# Restart services
docker-compose -f docker-compose.prod.yml restart
```

## Monitoring and Maintenance

### Health Checks
```bash
# Check service health
docker-compose ps

# View service logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs postgres
docker-compose logs redis

# Check application health
curl http://localhost/health
curl http://localhost:8000/health
```

### Database Backup
```bash
# Backup database
docker-compose exec postgres pg_dump -U vana_prod vana_production > backup.sql

# Restore database
docker-compose exec -T postgres psql -U vana_prod vana_production < backup.sql
```

### Scaling Services
```bash
# Scale frontend instances
docker-compose up -d --scale frontend=3

# Scale backend instances
docker-compose up -d --scale backend=2
```

## Troubleshooting

### Common Issues

1. **Frontend not accessible**
   - Check if port 3000 is exposed
   - Verify environment variables
   - Check nginx configuration

2. **Backend API errors**
   - Verify database connection
   - Check environment variables
   - Review backend logs

3. **Database connection issues**
   - Ensure PostgreSQL is running
   - Verify connection string
   - Check network connectivity

4. **Build failures**
   - Clear Docker cache: `docker system prune -a`
   - Rebuild images: `docker-compose build --no-cache`
   - Check Dockerfile syntax

### Performance Optimization

1. **Enable caching**
   - Configure Redis properly
   - Set appropriate cache headers
   - Use CDN for static assets

2. **Database optimization**
   - Use connection pooling
   - Optimize queries
   - Regular maintenance

3. **Container optimization**
   - Use multi-stage builds
   - Minimize image size
   - Set resource limits

## Security Considerations

1. **Environment Variables**
   - Never commit secrets to git
   - Use Docker secrets in production
   - Rotate keys regularly

2. **Network Security**
   - Use internal networks
   - Limit exposed ports
   - Configure firewall rules

3. **Container Security**
   - Use non-root users
   - Keep images updated
   - Scan for vulnerabilities

## Support

For issues and questions:
- Check logs: `docker-compose logs`
- Review configuration files
- Consult the troubleshooting section
- Create an issue in the repository
