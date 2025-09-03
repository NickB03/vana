# Environment Variable Migration Plan: Standardizing on NODE_ENV

## Executive Summary

This document outlines a comprehensive, backwards-compatible migration plan to standardize on `NODE_ENV` across the entire Vana codebase, while maintaining zero-downtime deployments and providing clear rollback procedures.

## Current State Analysis

### Environment Variable Usage Patterns

1. **Python Backend (Inconsistent)**
   - `app/configuration/environment.py:469`: `ENVIRONMENT` → `ENV` → `"development"`
   - `app/models.py:20,51`: `NODE_ENV` for development checks
   - `app/server.py:31,107`: `NODE_ENV` for development/production checks

2. **Frontend/Node.js (Consistent)**
   - `frontend/next.config.ts:20`: `NODE_ENV`
   - `.env.local`: Both `NODE_ENV` and `ENVIRONMENT` set

3. **Templates & Infrastructure (Mixed)**
   - `templates.py:490`: Injects `ENV={{ environment }}`
   - `docker-compose.yml`: Uses both variables
   - GitHub workflows: Uses `ENVIRONMENT`

### Risk Assessment

- **High Risk**: Production deployments using `ENVIRONMENT`
- **Medium Risk**: Template injection systems
- **Low Risk**: Development environment changes

## Migration Strategy: Phased Approach

### Phase 1: Implement Backwards-Compatible Fallback (Priority: Critical)

**Objective**: Ensure zero-downtime migration by implementing fallback logic

**Changes Required**:

1. **Update `app/configuration/environment.py`**
   ```python
   def _detect_current_environment(self) -> None:
       """Detect current environment with NODE_ENV priority and backwards compatibility."""
       # Priority order: NODE_ENV → ENVIRONMENT → ENV → default
       env_name = (
           os.environ.get("NODE_ENV") or 
           os.environ.get("ENVIRONMENT") or 
           os.environ.get("ENV") or 
           "development"
       )
       
       # Log migration status for monitoring
       if os.environ.get("NODE_ENV") and os.environ.get("ENVIRONMENT"):
           if os.environ.get("NODE_ENV") != os.environ.get("ENVIRONMENT"):
               logger.warning(
                   f"Environment variable conflict: NODE_ENV={os.environ.get('NODE_ENV')} "
                   f"vs ENVIRONMENT={os.environ.get('ENVIRONMENT')}. Using NODE_ENV."
               )
       elif not os.environ.get("NODE_ENV") and os.environ.get("ENVIRONMENT"):
           logger.info(
               f"Using legacy ENVIRONMENT={os.environ.get('ENVIRONMENT')}. "
               f"Please migrate to NODE_ENV."
           )
       
       try:
           self.current_environment = Environment(env_name.lower())
       except ValueError:
           logger.warning(f"Unknown environment {env_name}, defaulting to development")
           self.current_environment = Environment.DEVELOPMENT
   ```

2. **Create Environment Variable Validator**
   ```python
   # New file: app/utils/env_validator.py
   import os
   import logging
   from typing import Optional, Dict, Any

   logger = logging.getLogger(__name__)

   class EnvironmentVariableValidator:
       """Validates and normalizes environment variables during migration."""
       
       @staticmethod
       def validate_and_normalize() -> Dict[str, Any]:
           """Validate environment variables and suggest corrections."""
           issues = []
           suggestions = []
           
           node_env = os.environ.get("NODE_ENV")
           environment = os.environ.get("ENVIRONMENT") 
           env = os.environ.get("ENV")
           
           # Check for conflicts
           if node_env and environment and node_env != environment:
               issues.append(f"NODE_ENV ({node_env}) != ENVIRONMENT ({environment})")
               suggestions.append("Set both to the same value or remove ENVIRONMENT")
           
           # Check for deprecated usage
           if environment and not node_env:
               suggestions.append(f"Migrate ENVIRONMENT={environment} to NODE_ENV={environment}")
           
           if env and not node_env:
               suggestions.append(f"Migrate ENV={env} to NODE_ENV={env}")
           
           return {
               "issues": issues,
               "suggestions": suggestions,
               "normalized_env": node_env or environment or env or "development",
               "migration_complete": bool(node_env and not environment and not env)
           }
   ```

**Testing Strategy for Phase 1**:
```bash
# Test backwards compatibility
export ENVIRONMENT=staging
python -c "from app.configuration.environment import get_current_config; print(get_current_config().environment)"

export NODE_ENV=production  
export ENVIRONMENT=staging
python -c "from app.configuration.environment import get_current_config; print(get_current_config().environment)"  # Should use NODE_ENV

unset ENVIRONMENT NODE_ENV
export ENV=testing
python -c "from app.configuration.environment import get_current_config; print(get_current_config().environment)"
```

**Rollback Plan**: No changes to existing behavior - only adds NODE_ENV support

### Phase 2: Update Templates and Infrastructure (Priority: High)

**Objective**: Update template injection to use NODE_ENV while maintaining backwards compatibility

**Changes Required**:

1. **Update `app/configuration/templates.py`**
   ```python
   # Update template context injection
   def get_environment_for_template(self) -> str:
       """Get environment variable for template injection with migration support."""
       # Use NODE_ENV if available, fallback to environment for backwards compatibility
       node_env = os.environ.get("NODE_ENV")
       if node_env:
           return node_env
       
       # Fallback to legacy detection
       return self.current_environment.value
   
   # Update template context
   context = {
       # ... existing context ...
       "environment": self.get_environment_for_template(),
       # Add both for transition period
       "node_env": os.environ.get("NODE_ENV", self.current_environment.value),
       "legacy_env": os.environ.get("ENVIRONMENT", self.current_environment.value),
   }
   ```

2. **Update Docker Compose Template**
   ```yaml
   # In templates - update line 490
   environment:
     - NODE_ENV={{ node_env }}
     {% if legacy_env != node_env %}
     - ENVIRONMENT={{ legacy_env }}  # Backwards compatibility
     {% endif %}
     - PORT={{ app_port }}
   ```

**Testing Strategy for Phase 2**:
```bash
# Test template generation with various environment combinations
python -c "
from app.configuration.templates import TemplateEngine
engine = TemplateEngine()
# Test with NODE_ENV only, both set, legacy only
"
```

### Phase 3: Update CI/CD and Deployment Configurations (Priority: High)

**Objective**: Migrate deployment configurations to use NODE_ENV while maintaining rollback capability

**Changes Required**:

1. **Update `.github/workflows/deploy.yml`**
   ```yaml
   # Line 138: Update staging deployment
   --set-env-vars "NODE_ENV=staging,ENVIRONMENT=staging,COMMIT_SHA=${{ github.sha }}" \
   
   # Line 243: Update production deployment  
   --set-env-vars "NODE_ENV=production,ENVIRONMENT=production,COMMIT_SHA=${{ github.sha }}" \
   ```

2. **Update `docker-compose.yml`**
   ```yaml
   # Backend service
   environment:
     - NODE_ENV=local
     - ENVIRONMENT=local  # Backwards compatibility during migration
     - ALLOW_ORIGINS=*
     - LOG_LEVEL=INFO
   
   # Frontend service
   environment:
     - NODE_ENV=production  # Already correct
     # ... other vars remain the same
   ```

**Testing Strategy for Phase 3**:
```bash
# Test deployment with new environment variables
docker-compose up --build
curl -f http://localhost:8000/health

# Test CI workflow (dry-run)
# Verify both NODE_ENV and ENVIRONMENT are set in Cloud Run
```

### Phase 4: Remove Legacy Variables (Priority: Medium)

**Objective**: Remove `ENVIRONMENT` and `ENV` variables after confirming NODE_ENV works everywhere

**Changes Required** (after 2-4 week transition period):

1. **Update environment detection to NODE_ENV only**
2. **Remove legacy variables from templates**
3. **Update documentation**

**Prerequisites for Phase 4**:
- [ ] All deployments using NODE_ENV
- [ ] Monitoring shows no legacy variable usage
- [ ] All teams notified and systems updated

## Implementation Timeline

| Phase | Duration | Risk Level | Prerequisites |
|-------|----------|------------|---------------|
| Phase 1 | 1-2 days | Low | Code review, unit tests |
| Phase 2 | 2-3 days | Medium | Phase 1 complete, integration tests |
| Phase 3 | 3-5 days | High | Phase 2 complete, staging deployment |
| Phase 4 | 1-2 days | Low | 2-4 week observation period |

## Detailed Code Changes

### 1. Core Environment Detection

```python
# app/configuration/environment.py - Enhanced detection method
def _detect_current_environment(self) -> None:
    """Detect current environment with NODE_ENV priority."""
    # Migration-friendly priority order
    env_sources = [
        ("NODE_ENV", os.environ.get("NODE_ENV")),
        ("ENVIRONMENT", os.environ.get("ENVIRONMENT")), 
        ("ENV", os.environ.get("ENV")),
        ("default", "development")
    ]
    
    # Find first non-empty value
    env_name = None
    source = None
    for src, val in env_sources:
        if val:
            env_name = val
            source = src
            break
    
    # Log migration status for monitoring
    self._log_migration_status(env_sources, source, env_name)
    
    try:
        self.current_environment = Environment(env_name.lower())
    except ValueError:
        logger.warning(f"Unknown environment {env_name}, defaulting to development")
        self.current_environment = Environment.DEVELOPMENT

def _log_migration_status(self, env_sources: list, source: str, env_name: str) -> None:
    """Log migration status for monitoring and debugging."""
    node_env = os.environ.get("NODE_ENV")
    environment = os.environ.get("ENVIRONMENT")
    env = os.environ.get("ENV")
    
    # Detect migration state
    if node_env and not (environment or env):
        logger.info(f"✅ Migration complete: Using NODE_ENV={node_env}")
    elif node_env and (environment or env):
        if node_env == environment:
            logger.info(f"⚠️ Migration in progress: NODE_ENV and ENVIRONMENT both set to {node_env}")
        else:
            logger.warning(f"🚨 Conflict: NODE_ENV={node_env} vs ENVIRONMENT={environment}")
    elif environment and not node_env:
        logger.warning(f"🔄 Legacy mode: Using ENVIRONMENT={environment}. Please set NODE_ENV.")
    elif env and not (node_env or environment):
        logger.warning(f"🔄 Legacy mode: Using ENV={env}. Please set NODE_ENV.")
```

### 2. Migration Utilities

```python
# app/utils/migration_helper.py
import os
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class MigrationStatus:
    """Track environment variable migration status."""
    current_env: str
    source: str
    conflicts: List[str]
    recommendations: List[str]
    migration_complete: bool

class EnvironmentMigrationHelper:
    """Utility class to help with environment variable migration."""
    
    @staticmethod
    def get_migration_status() -> MigrationStatus:
        """Get current migration status."""
        node_env = os.environ.get("NODE_ENV")
        environment = os.environ.get("ENVIRONMENT")
        env = os.environ.get("ENV")
        
        # Determine current environment and source
        if node_env:
            current_env = node_env
            source = "NODE_ENV"
        elif environment:
            current_env = environment
            source = "ENVIRONMENT"
        elif env:
            current_env = env
            source = "ENV"
        else:
            current_env = "development"
            source = "default"
        
        # Check for conflicts
        conflicts = []
        if node_env and environment and node_env != environment:
            conflicts.append(f"NODE_ENV ({node_env}) != ENVIRONMENT ({environment})")
        if node_env and env and node_env != env:
            conflicts.append(f"NODE_ENV ({node_env}) != ENV ({env})")
        if environment and env and environment != env:
            conflicts.append(f"ENVIRONMENT ({environment}) != ENV ({env})")
        
        # Generate recommendations
        recommendations = []
        if environment and not node_env:
            recommendations.append(f"Set NODE_ENV={environment} and remove ENVIRONMENT")
        if env and not node_env:
            recommendations.append(f"Set NODE_ENV={env} and remove ENV")
        if conflicts:
            recommendations.append("Resolve environment variable conflicts before proceeding")
        
        migration_complete = bool(node_env and not environment and not env)
        
        return MigrationStatus(
            current_env=current_env,
            source=source,
            conflicts=conflicts,
            recommendations=recommendations,
            migration_complete=migration_complete
        )
    
    @staticmethod
    def validate_migration() -> bool:
        """Validate that migration is safe to proceed."""
        status = EnvironmentMigrationHelper.get_migration_status()
        
        if status.conflicts:
            logger.error(f"Migration validation failed: {status.conflicts}")
            return False
        
        logger.info(f"Migration validation passed: {status.source}={status.current_env}")
        return True
```

### 3. Health Check Integration

```python
# app/server.py - Add migration status to health check
@app.get("/health")
async def health_check() -> dict[str, str | bool | None]:
    """Health check endpoint with migration status."""
    from app.utils.migration_helper import EnvironmentMigrationHelper
    
    migration_status = EnvironmentMigrationHelper.get_migration_status()
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "vana",
        "version": "1.0.0",
        "environment": {
            "current": migration_status.current_env,
            "source": migration_status.source,
            "migration_complete": migration_status.migration_complete,
            "conflicts": migration_status.conflicts if migration_status.conflicts else None
        },
        "session_storage_enabled": session_service_uri is not None,
    }
```

## Testing Strategy

### Comprehensive Test Matrix

| Test Scenario | NODE_ENV | ENVIRONMENT | ENV | Expected Result | Test Command |
|---------------|----------|-------------|-----|----------------|--------------|
| NODE_ENV only | production | - | - | production (NODE_ENV) | `NODE_ENV=production python test_env.py` |
| Legacy ENVIRONMENT | - | staging | - | staging (ENVIRONMENT) | `ENVIRONMENT=staging python test_env.py` |
| Legacy ENV | - | - | testing | testing (ENV) | `ENV=testing python test_env.py` |
| NODE_ENV priority | production | staging | testing | production (NODE_ENV) | `NODE_ENV=production ENVIRONMENT=staging ENV=testing python test_env.py` |
| Conflict detection | production | staging | - | production + warning | `NODE_ENV=production ENVIRONMENT=staging python test_env.py` |
| All empty | - | - | - | development (default) | `python test_env.py` |

### Test Script

```python
#!/usr/bin/env python3
# test_env_migration.py
"""Test script for environment variable migration."""

import os
import subprocess
import sys
from typing import Dict, Any

def test_environment_detection(env_vars: Dict[str, str], expected: str, expected_source: str) -> bool:
    """Test environment detection with given variables."""
    # Clear existing environment variables
    for var in ["NODE_ENV", "ENVIRONMENT", "ENV"]:
        if var in os.environ:
            del os.environ[var]
    
    # Set test variables
    for key, value in env_vars.items():
        os.environ[key] = value
    
    try:
        from app.configuration.environment import get_current_config
        from app.utils.migration_helper import EnvironmentMigrationHelper
        
        config = get_current_config()
        status = EnvironmentMigrationHelper.get_migration_status()
        
        success = (
            config.environment.value == expected and
            status.source == expected_source
        )
        
        print(f"✅ PASS: {env_vars} → {expected} ({expected_source})" if success 
              else f"❌ FAIL: {env_vars} → {config.environment.value} ({status.source}), expected {expected} ({expected_source})")
        
        return success
        
    except Exception as e:
        print(f"❌ ERROR: {env_vars} → Exception: {e}")
        return False
    finally:
        # Cleanup
        for key in env_vars:
            if key in os.environ:
                del os.environ[key]

def main():
    """Run migration tests."""
    tests = [
        ({}, "development", "default"),
        ({"NODE_ENV": "production"}, "production", "NODE_ENV"),
        ({"ENVIRONMENT": "staging"}, "staging", "ENVIRONMENT"), 
        ({"ENV": "testing"}, "testing", "ENV"),
        ({"NODE_ENV": "production", "ENVIRONMENT": "staging"}, "production", "NODE_ENV"),
        ({"NODE_ENV": "production", "ENV": "testing"}, "production", "NODE_ENV"),
        ({"ENVIRONMENT": "staging", "ENV": "testing"}, "staging", "ENVIRONMENT"),
        ({"NODE_ENV": "production", "ENVIRONMENT": "production"}, "production", "NODE_ENV"),
    ]
    
    passed = 0
    total = len(tests)
    
    print("🧪 Running environment variable migration tests...\n")
    
    for env_vars, expected, expected_source in tests:
        if test_environment_detection(env_vars, expected, expected_source):
            passed += 1
    
    print(f"\n📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✅ All tests passed! Migration is ready.")
        sys.exit(0)
    else:
        print("❌ Some tests failed. Fix issues before proceeding.")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## Monitoring and Validation

### Production Monitoring

1. **Health Check Monitoring**
   - Monitor `/health` endpoint for migration status
   - Alert on environment variable conflicts
   - Track migration completion percentage

2. **Log Monitoring**
   - Search for migration warnings: `"Legacy mode"`, `"Conflict:"`  
   - Track NODE_ENV usage adoption
   - Monitor for deployment issues

3. **Metrics Collection**
   ```python
   # Add to app/utils/metrics.py
   import os
   from opentelemetry import metrics

   meter = metrics.get_meter(__name__)
   
   # Track environment variable usage
   env_source_counter = meter.create_counter(
       "environment_variable_source",
       description="Track which environment variable is being used"
   )
   
   def track_env_usage():
       source = "NODE_ENV" if os.environ.get("NODE_ENV") else \
                "ENVIRONMENT" if os.environ.get("ENVIRONMENT") else \
                "ENV" if os.environ.get("ENV") else "default"
       
       env_source_counter.add(1, {"source": source})
   ```

## Rollback Procedures

### Emergency Rollback

If issues occur during migration:

1. **Immediate Rollback (< 5 minutes)**
   ```bash
   # Revert environment.py to original state
   git checkout HEAD~1 -- app/configuration/environment.py
   
   # Redeploy immediately
   docker-compose down && docker-compose up --build
   ```

2. **Cloud Run Rollback**
   ```bash
   # Rollback to previous revision
   gcloud run services update-traffic vana \
     --region us-central1 \
     --to-revisions=LATEST-1=100
   ```

3. **Environment Variable Rollback**
   ```bash
   # Re-add legacy variables if needed
   export ENVIRONMENT=production  # Restore legacy variable
   export NODE_ENV=production     # Ensure both are set during rollback
   ```

### Rollback Validation

```bash
# Verify rollback success
curl -f http://localhost:8000/health | jq '.environment'

# Check logs for errors
docker-compose logs backend | grep -i error

# Validate all services are healthy
docker-compose ps
```

## Communication Plan

### Stakeholder Notification

1. **Pre-Migration (1 week before)**
   - Email all development teams
   - Update deployment documentation
   - Add migration status to team dashboard

2. **During Migration**
   - Real-time updates in team chat
   - Migration progress dashboard
   - Immediate notification of any issues

3. **Post-Migration**
   - Summary report with metrics
   - Updated documentation
   - Lessons learned session

### Documentation Updates

1. **Environment Setup Guides**
   - Update all `.env` examples to use NODE_ENV
   - Add migration notes to README
   - Update deployment guides

2. **Development Guidelines**
   - Coding standards updated
   - Environment variable naming conventions
   - Migration checklist for new services

## Success Criteria

### Migration Complete When:

- [ ] All services using NODE_ENV as primary variable
- [ ] No conflicts detected in health checks
- [ ] All deployments successful with new configuration
- [ ] Legacy variables removed from all configurations
- [ ] Documentation updated
- [ ] Team training completed

### Performance Targets:

- **Zero downtime** during migration
- **< 5 minutes** rollback time if needed
- **100%** environment detection accuracy
- **No performance degradation**

## Post-Migration Cleanup

### After 30 Days:

1. Remove backwards compatibility code
2. Remove legacy environment variables from all configurations
3. Update monitoring to remove migration-specific alerts
4. Archive migration documentation
5. Conduct post-mortem and document lessons learned

---

This migration plan ensures a safe, backwards-compatible transition to NODE_ENV while maintaining operational excellence and providing clear rollback procedures at every step.