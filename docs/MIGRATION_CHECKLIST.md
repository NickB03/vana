# Environment Variable Migration Checklist

## Pre-Migration Checklist

### Planning & Preparation

- [ ] **Review current environment variable usage**
  - [ ] Identified all files using `ENVIRONMENT`, `ENV`, or `NODE_ENV`
  - [ ] Documented current deployment configurations  
  - [ ] Mapped environment variables in Docker, CI/CD, and production

- [ ] **Test migration utilities**
  - [ ] Run `python scripts/test_env_migration.py` - all tests pass
  - [ ] Verify backwards compatibility with existing deployments
  - [ ] Test rollback procedures in staging environment

- [ ] **Prepare rollback plan**
  - [ ] Create backup of current configuration files
  - [ ] Document rollback procedures for each environment
  - [ ] Test emergency rollback in staging (< 5 minutes)

- [ ] **Team preparation**
  - [ ] Notify all stakeholders of migration timeline
  - [ ] Schedule migration during low-traffic period
  - [ ] Ensure team availability for monitoring

## Migration Phase 1: Backwards-Compatible Fallback

**Objective**: Implement NODE_ENV support while maintaining existing functionality

### Code Changes

- [x] **Update `app/configuration/environment.py`**
  - [x] Implement priority order: NODE_ENV → ENVIRONMENT → ENV → default
  - [x] Add migration status logging
  - [x] Maintain backwards compatibility

- [x] **Create migration utilities**
  - [x] Implement `app/utils/migration_helper.py`
  - [x] Add migration status detection
  - [x] Create validation functions

- [x] **Update health check endpoint**
  - [x] Add migration status to `/health` response
  - [x] Include conflict detection
  - [x] Provide monitoring data

### Testing Phase 1

- [ ] **Unit tests**
  - [ ] Run `python scripts/test_env_migration.py`
  - [ ] All test scenarios pass (16+ test cases)
  - [ ] Performance test passes (< 1ms average)
  - [ ] Integration test with environment manager passes

- [ ] **Manual testing**
  - [ ] Test with `NODE_ENV` only: `NODE_ENV=production python -c "from app.configuration.environment import get_current_config; print(get_current_config().environment)"`
  - [ ] Test with legacy vars: `ENVIRONMENT=staging python -c "..."`  
  - [ ] Test priority order: `NODE_ENV=production ENVIRONMENT=staging python -c "..."`
  - [ ] Verify conflict detection: `NODE_ENV=prod ENVIRONMENT=staging python -c "..."`

- [ ] **Health check validation**
  - [ ] Start server: `python -m uvicorn app.server:app --port 8000`
  - [ ] Check health: `curl http://localhost:8000/health | jq '.environment'`
  - [ ] Verify migration status is reported correctly

### Deployment Phase 1

- [ ] **Local deployment**
  - [ ] Deploy changes to local development environment
  - [ ] Verify no breaking changes
  - [ ] Test both NODE_ENV and legacy variable scenarios

- [ ] **Staging deployment** 
  - [ ] Deploy to staging environment
  - [ ] Run full test suite
  - [ ] Monitor logs for migration warnings
  - [ ] Verify staging health endpoint shows migration status

**Rollback criteria**: If any tests fail or deployment issues occur, rollback immediately.

## Migration Phase 2: Template and Infrastructure Updates

**Objective**: Update template injection and Docker configurations

### Code Changes

- [ ] **Update `app/configuration/templates.py`**
  - [ ] Add NODE_ENV to template context
  - [ ] Maintain ENVIRONMENT for backwards compatibility
  - [ ] Update Docker Compose template generation

- [ ] **Update configuration templates**
  - [ ] Modify template to inject both NODE_ENV and ENVIRONMENT
  - [ ] Add conditional logic for transition period
  - [ ] Test template generation with various scenarios

### Testing Phase 2

- [ ] **Template testing**
  - [ ] Generate test templates with NODE_ENV only
  - [ ] Generate test templates with both variables
  - [ ] Generate test templates with legacy variables only
  - [ ] Verify all templates render correctly

- [ ] **Docker Compose testing**
  - [ ] Test `docker-compose up` with new templates
  - [ ] Verify environment variables are set correctly in containers
  - [ ] Test both backend and frontend services
  - [ ] Confirm no service startup issues

### Deployment Phase 2

- [ ] **Local Docker testing**
  - [ ] `docker-compose down && docker-compose up --build`
  - [ ] Verify all services start successfully
  - [ ] Check container environment variables: `docker-compose exec backend env | grep ENV`

- [ ] **Staging deployment**
  - [ ] Deploy template updates
  - [ ] Regenerate Docker Compose configurations
  - [ ] Test full application stack
  - [ ] Verify template injection works correctly

## Migration Phase 3: CI/CD and Deployment Updates

**Objective**: Update deployment pipelines to use NODE_ENV

### Configuration Updates

- [ ] **Update `.github/workflows/deploy.yml`**
  - [ ] Set both NODE_ENV and ENVIRONMENT in Cloud Run deployments
  - [ ] Update staging deployment environment variables
  - [ ] Update production deployment environment variables
  - [ ] Maintain backwards compatibility during transition

- [ ] **Update `docker-compose.yml`**
  - [ ] Add NODE_ENV to backend service
  - [ ] Keep ENVIRONMENT for transition period
  - [ ] Update environment variable documentation

- [ ] **Update production configurations**
  - [ ] Cloud Run service configurations
  - [ ] Kubernetes deployment manifests (if applicable)
  - [ ] Environment variable secrets/config maps

### Testing Phase 3

- [ ] **CI/CD pipeline testing**
  - [ ] Test deployment workflow (dry-run)
  - [ ] Verify environment variables are set correctly
  - [ ] Check both staging and production configurations
  - [ ] Test rollback procedures

- [ ] **Deployment testing**
  - [ ] Deploy to staging with new CI/CD configuration
  - [ ] Verify Cloud Run environment variables
  - [ ] Test application functionality post-deployment
  - [ ] Monitor for any deployment issues

### Deployment Phase 3

- [ ] **Staging deployment**
  - [ ] Deploy using updated CI/CD pipeline
  - [ ] Monitor deployment logs
  - [ ] Verify environment variables: `gcloud run services describe vana-staging --region us-central1 --format="get(spec.template.spec.template.spec.containers[0].env)"`
  - [ ] Test full application functionality

- [ ] **Production deployment**
  - [ ] Deploy during maintenance window
  - [ ] Monitor deployment process closely
  - [ ] Verify production health endpoint
  - [ ] Monitor application logs for 30 minutes post-deployment

## Migration Phase 4: Legacy Variable Removal

**Objective**: Remove ENVIRONMENT and ENV variables after transition period

**Prerequisites**:
- [ ] All environments using NODE_ENV
- [ ] No conflicts detected for 2+ weeks  
- [ ] All teams notified and updated
- [ ] Monitoring confirms no legacy variable usage

### Code Changes

- [ ] **Remove legacy support**
  - [ ] Update environment detection to NODE_ENV only
  - [ ] Remove ENVIRONMENT/ENV fallback logic
  - [ ] Remove migration status logging (keep basic logging)

- [ ] **Clean up templates**
  - [ ] Remove ENVIRONMENT variable injection
  - [ ] Update template documentation
  - [ ] Simplify template logic

### Testing Phase 4

- [ ] **Comprehensive testing**
  - [ ] Update test suite to remove legacy scenarios
  - [ ] Test that ENVIRONMENT/ENV are ignored
  - [ ] Verify NODE_ENV is required in production
  - [ ] Test error handling for missing NODE_ENV

### Deployment Phase 4

- [ ] **Final cleanup deployment**
  - [ ] Remove legacy variables from all configurations
  - [ ] Update documentation
  - [ ] Deploy cleanup changes
  - [ ] Verify migration is complete

## Post-Migration Validation

### Immediate Validation (0-2 hours)

- [ ] **Service health**
  - [ ] All services responding to health checks
  - [ ] No error spikes in application logs
  - [ ] Response times within normal ranges
  - [ ] All environment variables resolved correctly

- [ ] **Functionality testing**
  - [ ] Core application features working
  - [ ] Authentication/authorization working
  - [ ] Database connections successful
  - [ ] External API integrations working

### Short-term Validation (2-24 hours)

- [ ] **Monitoring and alerting**
  - [ ] No environment-related errors in logs
  - [ ] All health checks passing
  - [ ] Application performance stable
  - [ ] No user-reported issues

- [ ] **Cross-service integration**
  - [ ] Frontend-backend communication working
  - [ ] Database queries executing correctly
  - [ ] Third-party integrations stable
  - [ ] Background jobs processing

### Long-term Validation (1-7 days)

- [ ] **Stability confirmation**
  - [ ] No environment-related incidents
  - [ ] All deployments using NODE_ENV only
  - [ ] Performance metrics stable
  - [ ] User satisfaction maintained

## Rollback Conditions

Immediate rollback triggers:
- [ ] Service downtime > 2 minutes
- [ ] Error rate increase > 10x baseline  
- [ ] Environment variable conflicts detected
- [ ] Critical functionality breaking
- [ ] User-facing issues reported

## Success Criteria

Migration is successful when:
- [x] **Backwards compatibility maintained** - No existing deployments broken
- [ ] **NODE_ENV is primary** - All new deployments use NODE_ENV
- [ ] **Conflicts resolved** - No environment variable conflicts detected
- [ ] **Documentation updated** - All guides and examples use NODE_ENV
- [ ] **Team adoption** - All team members using NODE_ENV in development
- [ ] **Monitoring in place** - Health checks show migration status
- [ ] **Legacy variables removed** - ENVIRONMENT and ENV no longer used

## Documentation Updates

- [ ] **Developer guides**
  - [ ] Update environment setup instructions
  - [ ] Update deployment documentation
  - [ ] Update troubleshooting guides

- [ ] **Operations documentation**
  - [ ] Update runbooks to use NODE_ENV
  - [ ] Update monitoring and alerting guides
  - [ ] Update incident response procedures

## Final Migration Report

After completion, document:
- [ ] **Migration timeline** - Actual vs. planned
- [ ] **Issues encountered** - And how they were resolved
- [ ] **Lessons learned** - Process improvements for future migrations
- [ ] **Performance impact** - Before/after metrics
- [ ] **Team feedback** - Developer experience improvements

---

**Note**: This checklist should be completed sequentially. Do not proceed to the next phase until all items in the current phase are completed and validated.