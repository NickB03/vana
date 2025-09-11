# Migration Strategy: GCP to Free Services (1GB DO Droplet)

## Executive Summary

Complete migration strategy to eliminate GCP costs while maintaining CI/CD capabilities using only free services and the existing 1GB Digital Ocean droplet.

## 🎯 Service Replacements

### Current → New Service Mapping

| Current Service | New Service | Cost | Limitations |
|----------------|-------------|------|-------------|
| GCP Artifact Registry | GitHub Container Registry (ghcr.io) | FREE | Unlimited public repos, 1GB private |
| GCP Cloud Storage | GitHub Artifacts | FREE | 90-day retention, 500MB |  
| GCP Cloud Build | GitHub Actions + DO Runner | FREE | 2000 minutes/month |
| GCP Cloud Run | Docker on DO Droplet | $5/month | 1GB RAM constraint |

## 🚀 Implementation Strategy

### Phase 1: Infrastructure Setup (Day 1)

1. **GitHub Container Registry Setup**
   ```bash
   # Enable GitHub Container Registry
   echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
   
   # Update image references
   OLD: gcr.io/PROJECT-ID/vana
   NEW: ghcr.io/USERNAME/vana
   ```

2. **Digital Ocean Runner Configuration**
   ```bash
   # Already configured at 134.209.170.75
   # Optimize for 1GB RAM usage
   # Enable swap if not already done
   sudo fallocate -l 1G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### Phase 2: CI/CD Pipeline Optimization

#### Memory-Conscious Build Strategy

1. **Sequential vs Parallel Execution**
   - PR builds: Unit tests only, no Docker builds
   - Main branch: Full pipeline with memory management
   - Build artifacts: GitHub Artifacts (90-day retention)

2. **Docker Build Optimization**
   ```dockerfile
   # Multi-stage build with memory limits
   FROM python:3.11-slim as builder
   # Install dependencies
   
   FROM python:3.11-slim as runtime  
   # Copy only what's needed
   ```

3. **Smart Caching Strategy**
   ```yaml
   # Cache Docker layers
   - uses: actions/cache@v3
     with:
       path: /tmp/.buildx-cache
       key: ${{ runner.os }}-buildx-${{ github.sha }}
   ```

### Phase 3: Resource Management

#### 1GB RAM Allocation Strategy

| Process | RAM Allocation | Purpose |
|---------|---------------|---------|
| System/OS | 200MB | Ubuntu + SSH + monitoring |
| Docker builds | 600MB | Temporary during builds only |
| Running app | 400MB | Production container limit |
| Buffer/swap | 200MB | Emergency overflow |

#### Build Process Memory Management

```bash
# Pre-build cleanup
docker system prune -af --volumes
free -h

# Memory-limited build
docker build --memory=600m --memory-swap=600m

# Post-build cleanup
docker system prune -af
```

## 📁 File Organization

### New Workflow Files Created

1. **`.github/workflows/ci-cd-optimized.yml`**
   - Resource-optimized pipeline
   - Sequential builds for memory management
   - GitHub Container Registry integration

2. **`.github/workflows/cleanup.yml`**
   - Weekly automated cleanup
   - Resource monitoring
   - Container image management

3. **`.github/workflows/security-scan.yml`**
   - Free security scanning with GitHub tools
   - CodeQL analysis
   - Dependency vulnerability checks

4. **`docker-compose.prod.yml`**
   - Production deployment configuration
   - Memory limits and health checks
   - Resource constraints

5. **`scripts/deploy.sh`**
   - Automated deployment script
   - Resource checks and cleanup
   - Rollback capabilities

## 🔐 Security & Secrets Management

### Environment Variables Required

```bash
# GitHub Container Registry
GITHUB_TOKEN=ghp_xxxxx  # Personal Access Token with packages:write

# Application secrets
GOOGLE_API_KEY=xxxxx
NODE_ENV=production

# Optional security
PHOENIX_DEBUG_CODE=xxxxx  # For debug endpoint
```

### Security Features

1. **Free GitHub Security Tools**
   - CodeQL scanning (automated)
   - Dependabot alerts
   - Secret scanning
   - Container vulnerability scanning

2. **Production Security**
   - HTTPS termination via reverse proxy
   - Rate limiting
   - Security headers
   - Audit logging

## 📊 Performance Optimizations

### Build Performance

1. **Selective Testing Strategy**
   ```yaml
   # PR: Unit tests only (fast feedback)
   if: github.event_name == 'pull_request'
   run: pytest tests/ -k "not integration"
   
   # Main: Full test suite
   if: github.ref == 'refs/heads/main'
   run: pytest tests/
   ```

2. **Smart Build Triggers**
   - Skip builds on documentation changes
   - Draft PRs skip expensive operations
   - Only build Docker images on main branch

3. **Caching Strategy**
   ```yaml
   # Python dependencies
   - uses: actions/cache@v3
     with:
       path: ~/.cache/uv
       key: uv-${{ hashFiles('**/uv.lock') }}
   
   # Docker layer cache
   - uses: actions/cache@v3
     with:
       path: /tmp/.buildx-cache
       key: buildx-${{ github.sha }}
   ```

## 🔧 Deployment Strategy

### Production Deployment Process

1. **Zero-Downtime Deployment**
   ```bash
   # Pull new image
   docker pull ghcr.io/username/vana:latest
   
   # Stop old container
   docker stop vana-app
   
   # Start new container
   docker run -d --name vana-app-new ghcr.io/username/vana:latest
   
   # Verify health, then remove old
   curl -f localhost:8080/health && docker rm vana-app
   ```

2. **Resource Monitoring**
   ```bash
   # Pre-deployment check
   if [ $(free -m | awk 'NR==2{print $7}') -lt 300 ]; then
     echo "Insufficient memory for deployment"
     exit 1
   fi
   ```

3. **Rollback Strategy**
   ```bash
   # Keep last 2 images for quick rollback
   docker images --format "table {{.Repository}}:{{.Tag}}" | tail -n +3 | xargs docker rmi
   ```

## 💰 Cost Analysis

### Before (GCP)
- Cloud Build: $20/month
- Artifact Registry: $10/month
- Cloud Storage: $5/month
- **Total: $35/month**

### After (Free Services)
- GitHub Actions: FREE (2000 min/month)
- GitHub Container Registry: FREE
- GitHub Artifacts: FREE
- Digital Ocean: $5/month (existing)
- **Total: $5/month**

**Monthly Savings: $30 (86% reduction)**

## 🚨 Constraints & Limitations

### Resource Constraints
- **Memory**: 1GB total (600MB for builds, 400MB for runtime)
- **Storage**: 25GB (need regular cleanup)
- **CPU**: Shared droplet performance

### Service Limitations
- **GitHub Artifacts**: 90-day retention only
- **Container Registry**: 1GB limit for private repos
- **Build Time**: Sequential builds are slower

### Mitigation Strategies
1. **Memory Management**
   - Enable swap space
   - Clean builds between operations
   - Monitor resource usage

2. **Storage Management**
   - Weekly automated cleanup
   - Retention policies for logs
   - Container image pruning

3. **Performance Optimization**
   - Smart build triggers
   - Efficient Docker images
   - Parallel operations where safe

## 🎛️ Monitoring & Alerts

### Health Monitoring
```bash
# System health check
free -h && df -h && docker ps

# Application health
curl -f http://localhost:8080/health
```

### Automated Alerts
- Low memory warnings (< 200MB available)
- Disk space alerts (> 80% usage)
- Failed deployments
- Security scan failures

## 🚀 Migration Timeline

### Week 1: Setup & Testing
- [ ] Configure GitHub Container Registry
- [ ] Test new workflows on feature branch
- [ ] Validate deployment process

### Week 2: Production Migration
- [ ] Update production workflows
- [ ] Migrate container images
- [ ] Monitor resource usage

### Week 3: Optimization
- [ ] Fine-tune resource limits
- [ ] Optimize build performance
- [ ] Implement monitoring

### Week 4: Documentation & Training
- [ ] Update deployment documentation
- [ ] Team training on new process
- [ ] Performance review

## 🔄 Rollback Plan

If issues arise:

1. **Immediate Rollback**
   ```bash
   # Revert to previous workflows
   git revert <migration-commits>
   
   # Use backup container images
   docker run -d --name vana-app gcr.io/old-project/vana:backup
   ```

2. **GCP Re-activation**
   - Re-enable GCP services
   - Restore previous container registry
   - Update deployment scripts

## 📋 Success Metrics

### Performance Targets
- Build time: < 10 minutes
- Deployment time: < 5 minutes  
- Memory usage: < 80% of available
- Disk usage: < 70% of available

### Cost Targets
- Monthly infrastructure cost: < $10
- Zero GCP charges
- Maintain 99% uptime

## 🛡️ Risk Mitigation

### High Risk Items
1. **Memory exhaustion during builds**
   - Mitigation: Sequential builds, swap space, monitoring
   
2. **Storage constraints**
   - Mitigation: Automated cleanup, retention policies
   
3. **Build failures due to resource limits**
   - Mitigation: Graceful fallbacks, retry logic

### Contingency Plans
- Keep GCP services active for 30 days post-migration
- Maintain backup deployment scripts
- Document rollback procedures

## 📝 Implementation Checklist

### Pre-Migration
- [ ] Review current resource usage
- [ ] Backup current configurations
- [ ] Test workflows in staging

### Migration Day
- [ ] Deploy new workflows
- [ ] Update container registries
- [ ] Monitor resource usage
- [ ] Verify all services operational

### Post-Migration
- [ ] Monitor for 48 hours
- [ ] Optimize based on metrics
- [ ] Decommission GCP resources
- [ ] Update documentation

---

**Next Steps**: Begin Phase 1 implementation by configuring GitHub Container Registry and testing the optimized workflows on a feature branch.