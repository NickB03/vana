# CloudRun Staging Deployment Fixes

## Overview
This document summarizes the 4 critical fixes implemented to deploy VANA Phase 4 to CloudRun staging.

## Fixes Implemented

### 1. ✅ Dockerfile Updated for Frontend Build
- Added multi-stage build with Node.js Alpine for frontend
- Frontend is built in first stage, copied to Python stage
- Added PORT environment variable support for CloudRun
- Changed CMD to use uvicorn directly with PORT variable

### 2. ✅ CORS Configuration Updated
- Added CloudRun URLs to ALLOWED_ORIGINS in main.py:
  - `https://vana-dev-960076421399.us-central1.run.app`
  - `https://vana-staging-960076421399.us-central1.run.app`
- Maintains localhost for development

### 3. ✅ Static File Serving Added
- Added FastAPI StaticFiles import
- Mounted vana-ui/dist at root path (after all API routes)
- Added logging for frontend availability
- Only mounts if dist directory exists

### 4. ✅ PORT Environment Variable Support
- Updated main.py to use `os.getenv("PORT", "8081")`
- CloudRun sets PORT dynamically, we default to 8081

## Scripts Created

### deploy-staging.sh
- Deploys to `vana-staging` service (not vana-dev)
- Checks for Google API Key secret
- Uses `--no-traffic` flag for safe testing
- Provides test commands and next steps

### test-local-docker.sh
- Builds and runs Docker container locally
- Tests health and chat endpoints
- Helps verify changes before CloudRun deployment

## Testing Steps

1. **Local Docker Test**:
   ```bash
   ./test-local-docker.sh
   ```

2. **Deploy to Staging**:
   ```bash
   ./deploy-staging.sh
   ```

3. **Test Staging**:
   ```bash
   # Get staging URL
   STAGING_URL=$(gcloud run services describe vana-staging --region us-central1 --format "value(status.url)")
   
   # Test health
   curl $STAGING_URL/health
   
   # Test chat
   curl -X POST $STAGING_URL/chat -H "Content-Type: application/json" -d '{"message": "test"}'
   ```

4. **Route Traffic (when ready)**:
   ```bash
   gcloud run services update-traffic vana-staging --to-latest --region us-central1
   ```

## Important Notes

- Google API Key secret must exist: `google-api-key`
- Service account: `vana-vector-search-sa@analystai-454200.iam.gserviceaccount.com`
- RAG corpus: `projects/analystai-454200/locations/us-central1/ragCorpora/2305843009213693952`
- Staging does NOT affect vana-dev deployment

## Next Steps

1. Run local Docker test
2. Deploy to staging
3. Thoroughly test all features
4. Only update vana-dev when confident