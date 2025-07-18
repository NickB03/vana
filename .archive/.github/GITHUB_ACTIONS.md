# GitHub Actions Configuration

This directory contains GitHub Actions workflows for the VANA project.

## Workflows

### 1. `basic-ci.yml` - Basic CI (No Secrets Required)
**Purpose**: Basic continuous integration that runs on every push/PR  
**Requirements**: None - works without any repository secrets  
**Runs**: Code quality checks, production parity tests (without endpoints)

### 2. `ci.yml` - Full CI/CD Pipeline (Secrets Required)
**Purpose**: Complete CI/CD pipeline with deployment and performance testing  
**Requirements**: Repository secrets (see below)  
**Runs**: Full test suite, security audit, deployment, performance testing

## Required Repository Secrets

To enable the full CI/CD pipeline (`ci.yml`), configure these secrets in your GitHub repository:

### Google Cloud Platform Secrets
- **`GCP_SA_KEY`**: Google Cloud Service Account key (JSON format)
- **`GCP_PROJECT_ID`**: Google Cloud Project ID (e.g., `analystai-454200`)

### Deployment Secrets  
- **`VANA_PROD_URL`**: Production deployment URL for performance testing

## Setting Up Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each required secret with its value

### Example GCP Service Account Key Setup:
```bash
# Create service account
gcloud iam service-accounts create vana-github-actions

# Grant necessary permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:vana-github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Create and download key
gcloud iam service-accounts keys create key.json \
  --iam-account=vana-github-actions@PROJECT_ID.iam.gserviceaccount.com
```

## Workflow Behavior

### Without Secrets
- Only `basic-ci.yml` runs
- Provides code quality validation
- Tests core functionality without external dependencies

### With Secrets
- Both workflows run
- Full deployment pipeline activated
- Performance testing against production

## Troubleshooting

### Common Issues

1. **Python 3.13 vs 3.12**: GitHub Actions uses Python 3.12 for compatibility
2. **Missing dependencies**: Workflows install all dependencies via Poetry
3. **Production parity**: Tests use the new production parity framework

### Debug Steps

1. Check workflow logs in GitHub Actions tab
2. Review uploaded artifacts (test reports, security reports)
3. Verify secret values are set correctly
4. Ensure service account has proper permissions

## Production Parity Testing

The workflows use the new production parity testing framework:
- `tests/framework/production_parity_validator.py` - Environment validation
- `tests/run_production_parity_tests.py` - Comprehensive test runner

This ensures CI tests match production environment behavior.