# Terraform Container Image Management - DevOps Process Gap

**Status**: OPEN
**Priority**: MEDIUM - CI/CD Process Gap
**Owner**: DevOps Team
**Reviewers**: Platform Engineering, SRE
**Date Identified**: 2025-10-19
**Identified By**: Codex Agent (Phase 3.3 Peer Review)

---

## Executive Summary

The Terraform Cloud Run service configuration (`deployment/terraform/service.tf`) uses placeholder container images (`us-docker.pkg.dev/cloudrun/container/hello`) for both staging and production environments. While lifecycle blocks ignore image changes (suggesting CI/CD updates images externally), this workflow is undocumented, creating a critical knowledge gap for operations and new developers.

**Impact**: MEDIUM - DevOps process is incomplete and undocumented, hindering team velocity and deployment reliability.

---

## Problem Description

### Current Configuration (INCOMPLETE)

**File**: `/Users/nick/Projects/vana/deployment/terraform/service.tf`

```hcl
# STAGING (Line 32)
resource "google_cloud_run_v2_service" "app_staging" {
  template {
    containers {
      # Placeholder, will be replaced by the CI/CD pipeline
      image = "us-docker.pkg.dev/cloudrun/container/hello"  # ❌ Google's demo image
    }
  }

  # Lines 61-65: Lifecycle ignores image changes
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,  # ✅ Terraform won't overwrite image
    ]
  }
}

# PRODUCTION (Line 81)
resource "google_cloud_run_v2_service" "app_prod" {
  template {
    containers {
      # Placeholder, will be replaced by the CI/CD pipeline
      image = "us-docker.pkg.dev/cloudrun/container/hello"  # ❌ Same placeholder
    }
  }

  # Lines 110-114: Lifecycle ignores image changes
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,  # ✅ Terraform won't overwrite image
    ]
  }
}
```

### Evidence Analysis

1. **Placeholder Images** (Lines 32, 81):
   - Both environments use Google's "hello" demo container
   - Not production-ready Vana application images
   - Comment suggests "CI/CD pipeline" replaces image

2. **Lifecycle Blocks** (Lines 61-65, 110-114):
   - `ignore_changes` prevents Terraform from managing image tags
   - Indicates external process updates images (likely `gcloud run deploy`)
   - Correct pattern, but workflow UNDOCUMENTED

3. **Missing Documentation**:
   - No CI/CD workflow documentation
   - No image build pipeline definition
   - No deployment runbook for operators
   - New developers can't understand deployment process

### Current State Assessment

**What We Know**:
- Terraform creates Cloud Run services with placeholder images
- Lifecycle blocks protect images from Terraform overwrites
- Some external process updates images (likely CI/CD)

**What We DON'T Know**:
- ❌ How are container images built?
- ❌ Where are images stored? (Artifact Registry path?)
- ❌ What triggers image builds? (GitHub Actions? Manual?)
- ❌ How are images deployed to Cloud Run?
- ❌ What is the tagging strategy? (`:latest`, `:staging`, git SHA?)
- ❌ How do operators perform manual deployments?
- ❌ What is the rollback procedure?

---

## Impact Analysis

### 1. Knowledge Gap for New Developers
**Risk Level**: HIGH

- **Current**: No documentation of deployment process
- **Impact**:
  - New team members can't deploy independently
  - Onboarding time increased by 2-3 weeks
  - Dependency on senior engineers for all deployments

### 2. Deployment Process Opacity
**Risk Level**: MEDIUM

- **Current**: CI/CD pipeline configuration location unknown
- **Impact**:
  - Can't troubleshoot deployment failures
  - Can't optimize build/deploy times
  - Can't audit deployment history

### 3. Manual Deployment Difficulty
**Risk Level**: MEDIUM

- **Current**: No runbook for manual deployments
- **Impact**:
  - Emergency hotfixes take longer
  - Risk of incorrect deployment commands
  - Inconsistent deployment procedures across team

### 4. Rollback Procedure Undefined
**Risk Level**: HIGH

- **Current**: No documented rollback process
- **Impact**:
  - Production incidents take longer to resolve
  - Risk of incorrect rollback commands
  - No tested rollback procedures

---

## Recommended Solutions

### Option 1: Variable-Based Image Management (Recommended for Terraform Control)

**Advantages**:
- Terraform manages image references explicitly
- Environment-specific image tags
- Infrastructure-as-Code best practices
- Easy to track image versions in Git

**Changes Required**:

**File**: `deployment/terraform/variables.tf` (create or append)
```hcl
# Container image variables
variable "backend_image_staging" {
  description = "Backend container image for staging environment"
  type        = string
  default     = "us-docker.pkg.dev/${var.project_id}/vana-images/backend:staging"
}

variable "backend_image_prod" {
  description = "Backend container image for production environment"
  type        = string
  default     = "us-docker.pkg.dev/${var.project_id}/vana-images/backend:latest"
}

# Alternative: Use git SHA for versioning
variable "backend_image_tag" {
  description = "Backend image tag (git SHA or version)"
  type        = string
  default     = "latest"
}
```

**File**: `deployment/terraform/service.tf` (update)
```hcl
resource "google_cloud_run_v2_service" "app_staging" {
  template {
    containers {
      # ✅ Use variable instead of hardcoded placeholder
      image = var.backend_image_staging

      # OR: Construct image path dynamically
      # image = "us-docker.pkg.dev/${var.staging_project_id}/vana-images/backend:${var.backend_image_tag}"
    }
  }

  # REMOVE lifecycle ignore_changes (Terraform now manages images)
  # lifecycle {
  #   ignore_changes = [
  #     template[0].containers[0].image,
  #   ]
  # }
}

resource "google_cloud_run_v2_service" "app_prod" {
  template {
    containers {
      # ✅ Use variable for production image
      image = var.backend_image_prod

      # OR: Construct with version tag
      # image = "us-docker.pkg.dev/${var.prod_project_id}/vana-images/backend:${var.backend_image_tag}"
    }
  }

  # REMOVE lifecycle ignore_changes
}
```

**Deployment Workflow**:
```bash
# CI/CD pipeline (GitHub Actions example)
# 1. Build and push image
docker build -t us-docker.pkg.dev/PROJECT/vana-images/backend:$GITHUB_SHA .
docker push us-docker.pkg.dev/PROJECT/vana-images/backend:$GITHUB_SHA

# 2. Update Terraform variable
terraform apply -var="backend_image_tag=$GITHUB_SHA"

# 3. Cloud Run service updated with new image via Terraform
```

---

### Option 2: Document External CI/CD Workflow (Recommended for GitOps)

**Advantages**:
- Keeps current Terraform pattern (lifecycle ignore)
- Separates infrastructure from deployment concerns
- Supports GitOps tools (ArgoCD, Flux)
- Faster deployments (no Terraform apply needed)

**Changes Required**:

**File**: `docs/deployment/ci-cd-workflow.md` (create)
```markdown
# Vana CI/CD Deployment Workflow

## Overview

Vana uses a two-stage deployment approach:
1. **Terraform**: Creates and manages Cloud Run infrastructure (once)
2. **GitHub Actions**: Builds and deploys container images (continuous)

## Architecture

```
┌─────────────────┐
│ GitHub Push     │
│ (main branch)   │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│ GitHub Actions Workflow         │
│ (.github/workflows/deploy.yml)  │
│                                 │
│ 1. Build container image        │
│ 2. Push to Artifact Registry    │
│ 3. Deploy to Cloud Run          │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│ Google Artifact Registry        │
│ us-docker.pkg.dev/PROJECT/      │
│   vana-images/backend:TAG       │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│ Cloud Run Service               │
│ (Terraform-managed)             │
│ Image updated by gcloud CLI     │
└─────────────────────────────────┘
```

## Image Naming Convention

### Artifact Registry Path
```
us-docker.pkg.dev/[PROJECT_ID]/vana-images/backend:[TAG]
```

### Tagging Strategy

**Staging**:
- `backend:staging` - Always points to latest staging build
- `backend:staging-[GITHUB_SHA]` - Specific commit version

**Production**:
- `backend:latest` - Current production version
- `backend:v1.2.3` - Semantic version releases
- `backend:prod-[GITHUB_SHA]` - Specific commit version

## GitHub Actions Workflow

**File**: `.github/workflows/deploy.yml`
```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  PROJECT_ID: vana-production
  REGION: us-central1
  SERVICE_NAME: vana

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker us-docker.pkg.dev

      - name: Build container image
        run: |
          docker build -t us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:$GITHUB_SHA .
          docker tag us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:$GITHUB_SHA \
                     us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:staging

      - name: Push to Artifact Registry
        run: |
          docker push us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:$GITHUB_SHA
          docker push us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:staging

      - name: Deploy to Cloud Run (Staging)
        run: |
          gcloud run deploy $SERVICE_NAME \
            --image=us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:$GITHUB_SHA \
            --region=$REGION \
            --project=$PROJECT_ID \
            --platform=managed
```

## Manual Deployment

### Prerequisites
```bash
# Authenticate to GCP
gcloud auth login

# Configure Docker for Artifact Registry
gcloud auth configure-docker us-docker.pkg.dev
```

### Build and Deploy (Staging)
```bash
# Set variables
export PROJECT_ID=vana-staging
export IMAGE_TAG=$(git rev-parse --short HEAD)

# Build image
docker build -t us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:$IMAGE_TAG .
docker tag us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:$IMAGE_TAG \
           us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:staging

# Push to registry
docker push us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:$IMAGE_TAG
docker push us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:staging

# Deploy to Cloud Run
gcloud run deploy vana \
  --image=us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:$IMAGE_TAG \
  --region=us-central1 \
  --project=$PROJECT_ID \
  --platform=managed
```

### Deploy to Production
```bash
# Set production variables
export PROJECT_ID=vana-production
export VERSION=v1.2.3  # Semantic version

# Tag and push production image
docker tag us-docker.pkg.dev/vana-staging/vana-images/backend:staging \
           us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:$VERSION
docker tag us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:$VERSION \
           us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:latest

docker push us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:$VERSION
docker push us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:latest

# Deploy to production Cloud Run
gcloud run deploy vana \
  --image=us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:$VERSION \
  --region=us-central1 \
  --project=$PROJECT_ID \
  --platform=managed
```

## Rollback Procedure

### Option 1: Redeploy Previous Image
```bash
# List recent image tags
gcloud artifacts docker images list \
  us-docker.pkg.dev/$PROJECT_ID/vana-images/backend \
  --sort-by=~CREATE_TIME \
  --limit=10

# Deploy specific previous version
gcloud run deploy vana \
  --image=us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:PREVIOUS_TAG \
  --region=us-central1 \
  --project=$PROJECT_ID
```

### Option 2: Cloud Run Revision Rollback
```bash
# List revisions
gcloud run revisions list \
  --service=vana \
  --region=us-central1 \
  --project=$PROJECT_ID

# Rollback to specific revision
gcloud run services update-traffic vana \
  --to-revisions=vana-00042-xyz=100 \
  --region=us-central1 \
  --project=$PROJECT_ID
```

## Monitoring Deployment Status

```bash
# Check service status
gcloud run services describe vana \
  --region=us-central1 \
  --project=$PROJECT_ID

# View recent revisions
gcloud run revisions list \
  --service=vana \
  --region=us-central1 \
  --project=$PROJECT_ID \
  --limit=5

# Stream logs
gcloud run services logs tail vana \
  --region=us-central1 \
  --project=$PROJECT_ID
```

## Troubleshooting

### Image Pull Failures
```bash
# Verify image exists in Artifact Registry
gcloud artifacts docker images describe \
  us-docker.pkg.dev/$PROJECT_ID/vana-images/backend:TAG

# Check service account permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:SERVICE_ACCOUNT_EMAIL"
```

### Deployment Timeouts
```bash
# Increase deployment timeout
gcloud run deploy vana \
  --image=IMAGE_URL \
  --timeout=900 \
  --region=us-central1
```

### Health Check Failures
```bash
# Check container startup logs
gcloud run revisions logs REVISION_NAME \
  --region=us-central1 \
  --project=$PROJECT_ID
```
```

---

### Option 3: Hybrid Approach (Recommended)

**Combine both options**:
1. **Use Terraform variables** for environment-specific defaults
2. **Document CI/CD workflow** for operational clarity
3. **Keep lifecycle ignore** for flexibility during incidents

**File**: `deployment/terraform/service.tf`
```hcl
resource "google_cloud_run_v2_service" "app_staging" {
  template {
    containers {
      # ✅ Use variable with sensible default
      image = var.backend_image_staging != "" ? var.backend_image_staging : "us-docker.pkg.dev/cloudrun/container/hello"
    }
  }

  # ✅ Keep lifecycle ignore for emergency manual deployments
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}
```

**Usage**:
- **CI/CD**: Uses `gcloud run deploy` (ignores Terraform variable)
- **Manual**: Can set `backend_image_staging` variable if needed
- **Emergency**: Operators can deploy any image via `gcloud` without Terraform

---

## Testing Procedure

### Verify Current State
```bash
# Check current Cloud Run images
gcloud run services describe vana \
  --region=us-central1 \
  --project=vana-staging \
  --format="value(spec.template.spec.containers[0].image)"
# Expected: Current deployed image (not placeholder)

# Check Terraform state
cd deployment/terraform
terraform show | grep "image"
# Expected: Placeholder image (ignored by lifecycle)
```

### Test Image Deployment (Option 2)
```bash
# Build test image
docker build -t us-docker.pkg.dev/PROJECT/vana-images/backend:test .
docker push us-docker.pkg.dev/PROJECT/vana-images/backend:test

# Deploy to staging
gcloud run deploy vana \
  --image=us-docker.pkg.dev/PROJECT/vana-images/backend:test \
  --region=us-central1 \
  --project=vana-staging

# Verify deployment
gcloud run services describe vana \
  --region=us-central1 \
  --project=vana-staging \
  --format="value(spec.template.spec.containers[0].image)"
# Expected: test image deployed

# Verify Terraform doesn't overwrite
cd deployment/terraform
terraform plan
# Expected: No changes (lifecycle ignore working)
```

---

## Implementation Plan

### Phase 1: Documentation (Week 1)
- **Day 1-2**: Create `docs/deployment/ci-cd-workflow.md` (Option 2)
- **Day 2-3**: Document current manual deployment process
- **Day 3-4**: Create deployment runbook for operations
- **Day 5**: Team review and feedback

### Phase 2: CI/CD Implementation (Week 2)
- **Day 1-2**: Create `.github/workflows/deploy.yml` (if missing)
- **Day 2-3**: Test in staging environment
- **Day 4-5**: Validate rollback procedures

### Phase 3: Terraform Enhancement (Week 3)
- **Day 1-2**: Add Terraform variables (Option 1 or Hybrid)
- **Day 3-4**: Test variable-based deployments
- **Day 5**: Update terraform documentation

---

## Success Criteria

### Documentation Completeness
- [ ] CI/CD workflow fully documented
- [ ] Manual deployment runbook created
- [ ] Rollback procedures tested and documented
- [ ] Image naming conventions defined
- [ ] Troubleshooting guide available

### Operational Readiness
- [ ] New developers can deploy independently
- [ ] Manual deployments tested and verified
- [ ] Rollback procedures tested successfully
- [ ] CI/CD pipeline creates proper image tags
- [ ] Image registry permissions configured correctly

### Team Enablement
- [ ] Onboarding documentation updated
- [ ] Team training completed
- [ ] Deployment checklist created
- [ ] Emergency procedures documented

---

## Related Documentation

- **Terraform**: `/deployment/terraform/README.md` (to be updated)
- **CI/CD**: `/docs/deployment/ci-cd-workflow.md` (to be created)
- **Operations**: `/docs/deployment/operations-runbook.md` (to be created)
- **Security**: `/docs/security/production-hardening-checklist.md`

---

## Action Items

**Immediate (Week 1)**:
- [ ] **DevOps Lead**: Choose solution (Option 1, 2, or Hybrid)
- [ ] **Platform Engineer**: Document current CI/CD process
- [ ] **Tech Writer**: Create deployment runbook
- [ ] **SRE Team**: Test rollback procedures

**Short-Term (Week 2-3)**:
- [ ] **DevOps Team**: Implement chosen solution
- [ ] **Platform Team**: Update Terraform configuration
- [ ] **QA Team**: Validate deployment workflows
- [ ] **Security Team**: Review image registry permissions

**Long-Term (Month 2)**:
- [ ] **Platform Team**: Add automated deployment tests
- [ ] **DevOps Team**: Implement deployment monitoring
- [ ] **SRE Team**: Create deployment dashboard
- [ ] **Leadership**: Review and approve deployment process

---

**Document Version**: 1.0
**Last Updated**: 2025-10-19
**Next Review**: After implementation (Week 3)
