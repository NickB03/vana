# Environment Variable Migration Rollback Plan

## Quick Rollback Procedures

### Emergency Rollback (< 5 minutes)

If critical issues occur during migration, follow these steps immediately:

#### 1. Immediate Service Restoration

```bash
# Option A: Docker Compose Rollback
cd /Users/nick/Development/vana
docker-compose down
git checkout HEAD~1 -- app/configuration/environment.py
docker-compose up --build -d

# Option B: Process Restart with Environment Override
export ENVIRONMENT=production  # Set to current production value
export NODE_ENV=production      # Ensure both are set for compatibility
supervisorctl restart vana      # Or your process manager

# Option C: Direct File Restoration
cp app/configuration/environment.py.backup app/configuration/environment.py
systemctl restart vana
```

#### 2. Cloud Run Rollback (Production)

```bash
# Immediate traffic rollback to previous revision
gcloud run services update-traffic vana \
  --region us-central1 \
  --to-revisions=LATEST-1=100 \
  --quiet

# Verify rollback success
curl -f https://vana-analystai-454200.a.run.app/health
```

#### 3. Kubernetes/Container Rollback

```bash
# Rollback deployment
kubectl rollout undo deployment/vana

# Check rollout status
kubectl rollout status deployment/vana

# Verify pods are healthy
kubectl get pods -l app=vana
```

### Validation After Rollback

```bash
# 1. Health Check
curl -f http://localhost:8000/health | jq '.environment'

# 2. Environment Detection Test
python -c "
from app.configuration.environment import get_current_config
print('Environment:', get_current_config().environment.value)
"

# 3. Log Check (no migration errors)
docker-compose logs backend | grep -E "(migration|NODE_ENV|ENVIRONMENT)" | tail -20

# 4. Service Functionality Test
curl -f http://localhost:8000/health
curl -f http://localhost:3000  # Frontend health
```

## Detailed Rollback Scenarios

### Scenario 1: Environment Detection Conflicts

**Symptoms:**
- Health check shows conflicts
- Application logs show environment variable warnings
- Inconsistent behavior between services

**Rollback Steps:**

```bash
# 1. Immediate fix - set both variables to same value
export NODE_ENV=production
export ENVIRONMENT=production

# 2. Restart services
docker-compose restart backend

# 3. Verify resolution
curl http://localhost:8000/health | jq '.environment.conflicts'  # Should be null

# 4. Plan proper fix for next deployment
echo "TODO: Fix environment variable conflicts in next release"
```

### Scenario 2: Template Injection Failures

**Symptoms:**
- Docker Compose fails to start
- Missing environment variables in containers
- Template rendering errors

**Rollback Steps:**

```bash
# 1. Restore original template
git checkout HEAD~1 -- app/configuration/templates.py

# 2. Regenerate configurations
python -c "
from app.configuration.templates import TemplateEngine
engine = TemplateEngine()
engine.generate_docker_compose('docker-compose.yml')
"

# 3. Restart with restored configuration
docker-compose down && docker-compose up --build
```

### Scenario 3: CI/CD Pipeline Failures

**Symptoms:**
- Deployment failures
- Environment variables not set in Cloud Run
- Build process errors

**Rollback Steps:**

```bash
# 1. Revert workflow file
git checkout HEAD~1 -- .github/workflows/deploy.yml

# 2. Re-trigger deployment with original configuration
gh workflow run deploy.yml

# 3. Monitor deployment
gh run list --workflow=deploy.yml

# 4. Verify production deployment
curl -f https://vana-analystai-454200.a.run.app/health
```

## Rollback Decision Matrix

| Issue Severity | Rollback Action | Time to Execute | Risk Level |
|---------------|----------------|-----------------|------------|
| **Critical** - Service down | Emergency rollback + Cloud Run traffic switch | < 2 minutes | Low |
| **High** - Environment conflicts | Environment variable override + restart | < 5 minutes | Low |
| **Medium** - Template issues | File restoration + regeneration | < 10 minutes | Medium |
| **Low** - Logging/monitoring | Configuration adjustment | < 30 minutes | Low |

## Pre-Rollback Checklist

Before executing rollback:

- [ ] **Identify the issue**: Confirm it's migration-related
- [ ] **Check impact scope**: Single service vs. entire application
- [ ] **Verify rollback safety**: Ensure rollback won't cause data loss
- [ ] **Notify team**: Alert relevant stakeholders
- [ ] **Prepare monitoring**: Set up logging to track rollback success

## Post-Rollback Actions

After successful rollback:

### 1. Immediate (0-30 minutes)

- [ ] Verify all services are healthy
- [ ] Check key application functionality
- [ ] Monitor error logs for 15 minutes
- [ ] Update team on rollback status

### 2. Short-term (1-24 hours)

- [ ] Document the issue and rollback process
- [ ] Analyze root cause
- [ ] Plan fix for the issue
- [ ] Review migration process for improvements

### 3. Long-term (1-7 days)

- [ ] Implement fixes
- [ ] Test fixes in staging
- [ ] Update migration plan
- [ ] Schedule next migration attempt

## Rollback Testing

### Pre-Migration Rollback Test

```bash
#!/bin/bash
# Test rollback procedures before actual migration

# 1. Create backup
cp app/configuration/environment.py app/configuration/environment.py.backup

# 2. Simulate migration issue
sed -i 's/NODE_ENV/BROKEN_ENV/g' app/configuration/environment.py

# 3. Test rollback procedure
cp app/configuration/environment.py.backup app/configuration/environment.py
docker-compose restart backend

# 4. Verify rollback success
curl -f http://localhost:8000/health

echo "Rollback test completed successfully"
```

### Rollback Validation Script

```python
#!/usr/bin/env python3
"""Validate rollback success."""

import requests
import sys
import os

def validate_rollback():
    """Validate that rollback was successful."""
    issues = []
    
    try:
        # Test health endpoint
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code != 200:
            issues.append(f"Health check failed: {response.status_code}")
        
        health_data = response.json()
        
        # Check environment configuration
        if "environment" not in health_data:
            issues.append("Environment info missing from health check")
        
        env_info = health_data.get("environment", {})
        
        # Check for conflicts (should be none after rollback)
        if env_info.get("conflicts"):
            issues.append(f"Environment conflicts still present: {env_info['conflicts']}")
        
        # Verify current environment is valid
        current_env = env_info.get("current")
        valid_envs = ["development", "staging", "production", "local", "testing"]
        if current_env not in valid_envs:
            issues.append(f"Invalid environment: {current_env}")
        
        # Test application functionality
        # Add more specific tests here based on your application
        
        if not issues:
            print("✅ Rollback validation successful")
            print(f"   Environment: {current_env}")
            print(f"   Source: {env_info.get('source')}")
            return True
        else:
            print("❌ Rollback validation failed:")
            for issue in issues:
                print(f"   - {issue}")
            return False
            
    except requests.RequestException as e:
        print(f"❌ Failed to connect to service: {e}")
        return False
    except Exception as e:
        print(f"❌ Validation error: {e}")
        return False

if __name__ == "__main__":
    success = validate_rollback()
    sys.exit(0 if success else 1)
```

## Emergency Contacts

During rollback situations, contact:

1. **Primary**: System Administrator
2. **Secondary**: Lead Developer  
3. **Escalation**: DevOps Team Lead

## Rollback Lessons Learned

Keep track of rollback incidents:

### Incident Report Template

```markdown
## Rollback Incident Report

**Date**: [Date and time]
**Duration**: [How long rollback took]
**Issue**: [What went wrong]
**Root Cause**: [Why it happened]
**Rollback Method**: [Which rollback procedure was used]
**Success**: [Was rollback successful?]
**Follow-up Actions**: [What needs to be done next]

### Timeline
- [Time] Issue detected
- [Time] Rollback initiated  
- [Time] Rollback completed
- [Time] Service validated

### Lessons Learned
- [What can be improved]
- [Changes to make to process]
- [Additional monitoring needed]
```

## Automated Rollback Triggers

Consider implementing automated rollback for:

- Health check failures lasting > 2 minutes
- Error rate spike > 10x normal
- Environment variable conflicts detected
- Critical dependency failures

```bash
#!/bin/bash
# Automated rollback trigger script

HEALTH_URL="http://localhost:8000/health"
ERROR_THRESHOLD=5

# Monitor health endpoint
for i in {1..5}; do
    if ! curl -f "$HEALTH_URL" > /dev/null 2>&1; then
        ((ERROR_COUNT++))
    fi
    sleep 10
done

if [ $ERROR_COUNT -ge $ERROR_THRESHOLD ]; then
    echo "Health check failures exceeded threshold. Initiating rollback..."
    ./scripts/emergency_rollback.sh
fi
```

---

This rollback plan provides comprehensive procedures for any migration issues while ensuring minimal downtime and clear recovery paths.