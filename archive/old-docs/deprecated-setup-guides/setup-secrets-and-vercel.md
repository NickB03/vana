# Setup Guide: GitHub Secrets & Vercel Configuration

## Part 1: GitHub Secret - GCP Service Account Key

### Step 1: Create a Google Cloud Service Account

1. **Open Google Cloud Console**
   ```bash
   # Or use gcloud CLI
   gcloud iam service-accounts create github-actions-ci \
     --display-name="GitHub Actions CI/CD" \
     --project=analystai-454200
   ```

2. **Via Console UI**:
   - Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
   - Click "CREATE SERVICE ACCOUNT"
   - Name: `github-actions-ci`
   - ID: `github-actions-ci` (auto-generated)
   - Click "CREATE AND CONTINUE"

### Step 2: Grant Required Permissions

Add these roles to the service account:

```bash
# Using gcloud CLI
PROJECT_ID=analystai-454200
SA_EMAIL=github-actions-ci@${PROJECT_ID}.iam.gserviceaccount.com

# Container Registry permissions
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"

# Cloud Run permissions
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

# Service Account User (to act as other service accounts)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Artifact Registry (if using instead of Container Registry)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.admin"
```

**Or via Console UI**, add these roles:
- `Storage Admin` (for Container Registry)
- `Cloud Run Admin` (for deployments)
- `Service Account User` (to impersonate service accounts)
- `Artifact Registry Admin` (if using Artifact Registry)

### Step 3: Create and Download the Key

```bash
# Using gcloud CLI
gcloud iam service-accounts keys create ~/github-actions-key.json \
  --iam-account=${SA_EMAIL} \
  --project=${PROJECT_ID}
```

**Or via Console UI**:
1. Click on the service account
2. Go to "KEYS" tab
3. Click "ADD KEY" > "Create new key"
4. Choose "JSON" format
5. Click "CREATE" (key will download automatically)

### Step 4: Add the Key to GitHub Secrets

1. **Go to your repository on GitHub**
   - Navigate to: https://github.com/NickB03/vana

2. **Access Settings**
   - Click "Settings" tab
   - In left sidebar, click "Secrets and variables" > "Actions"

3. **Create New Secret**
   - Click "New repository secret"
   - Name: `GCP_SA_KEY`
   - Value: Copy and paste the ENTIRE content of the JSON key file
   
   ```json
   {
     "type": "service_account",
     "project_id": "analystai-454200",
     "private_key_id": "...",
     "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n",
     "client_email": "github-actions-ci@analystai-454200.iam.gserviceaccount.com",
     "client_id": "...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "..."
   }
   ```
   
   - Click "Add secret"

4. **Delete the local key file** (for security)
   ```bash
   rm ~/github-actions-key.json
   ```

### Step 5: Verify the Secret Works

```bash
# Push a change to trigger the workflow
git add .
git commit -m "test: verify GCP authentication"
git push origin main

# Check the workflow
gh run list --limit 1
gh run view
```

---

## Part 2: Vercel Configuration

### Option A: Automatic Setup (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Link your project**
   ```bash
   # Run from repository root
   cd /Users/nick/Development/vana
   vercel link
   
   # Answer the prompts:
   # ? Set up "~/Development/vana"? [Y/n] Y
   # ? Which scope should contain your project? (Select your account)
   # ? Link to existing project? [y/N] N
   # ? What's your project's name? vana
   # ? In which directory is your code located? ./frontend
   ```

4. **Deploy to verify**
   ```bash
   vercel --prod
   ```

### Option B: Manual Setup via Dashboard

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**

2. **Import Git Repository**
   - Click "Add New..." > "Project"
   - Select "Import Git Repository"
   - Choose "GitHub"
   - Select `NickB03/vana` repository

3. **Configure Project Settings**

   **Framework Preset**: Next.js
   
   **Root Directory**: `frontend` ⚠️ IMPORTANT
   
   **Build Settings**:
   - Build Command: `npm run build` (or leave as default)
   - Output Directory: `.next` (or leave as default)
   - Install Command: `npm install`

4. **Environment Variables**
   Add these environment variables:
   
   | Name | Value (Production) | Value (Preview) |
   |------|-------------------|-----------------|
   | `NEXT_PUBLIC_API_URL` | `https://vana-analystai-454200.a.run.app` | `https://vana-staging-analystai-454200.a.run.app` |
   | `NEXT_PUBLIC_ENVIRONMENT` | `production` | `staging` |
   | `NODE_ENV` | `production` | `production` |

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

### Step 3: Connect GitHub Integration

1. **In Vercel Dashboard**:
   - Go to your project
   - Click "Settings" > "Git"
   - Ensure GitHub integration is connected

2. **Configure Deploy Hooks** (Optional):
   - Settings > Git > Deploy Hooks
   - Create hook for production deployments
   - Save the webhook URL

3. **Set Production Branch**:
   - Settings > Git > Production Branch
   - Set to `main`

### Step 4: Verify Vercel Deployment

1. **Check Deployment Status**
   ```bash
   # Using CLI
   vercel ls
   
   # Get deployment URL
   vercel inspect <deployment-url>
   ```

2. **Test the Deployment**
   ```bash
   # Test production
   curl https://vana.vercel.app
   
   # Test preview (from a PR)
   curl https://vana-<pr-number>.vercel.app
   ```

3. **Check Build Logs**
   - In Vercel Dashboard > Project > Deployments
   - Click on any deployment to see logs

---

## Part 3: Testing Everything Together

### 1. Test CI/CD Pipeline

```bash
# Create a test branch
git checkout -b test-cicd-pipeline

# Make a small change
echo "# Test" >> README.md

# Commit and push
git add .
git commit -m "test: verify CI/CD pipeline"
git push origin test-cicd-pipeline

# Create a PR
gh pr create --title "Test CI/CD Pipeline" --body "Testing the complete setup"

# Watch the checks
gh pr checks --watch
```

### 2. Verify All Services

✅ **GitHub Actions should**:
- Run tests without cancellation
- Build and push Docker image
- Deploy to Cloud Run staging

✅ **Vercel should**:
- Create preview deployment for PR
- Show preview URL in PR comments
- Deploy frontend successfully (no 404)

### 3. Monitor Deployment

```bash
# Check GitHub Actions
gh run list --workflow=main-ci.yml
gh run list --workflow=deploy.yml

# Check Cloud Run
gcloud run services describe vana-staging --region=us-central1

# Check Vercel
vercel ls
```

---

## Troubleshooting

### GitHub Actions Issues

**Error: "Permission denied" when pushing to GCR**
```bash
# Verify service account has Storage Admin role
gcloud projects get-iam-policy analystai-454200 \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-actions-ci@analystai-454200.iam.gserviceaccount.com"
```

**Error: "Invalid key format"**
- Ensure you copied the ENTIRE JSON content
- Check for no extra whitespace or characters
- Verify JSON is valid: `echo '$SECRET' | jq .`

### Vercel Issues

**404 Error on Deployment**
```bash
# Verify root directory setting
vercel inspect --json | jq '.rootDirectory'
# Should output: "frontend"

# Check build output
vercel logs <deployment-url>
```

**Environment Variables Not Working**
- Go to Settings > Environment Variables
- Ensure they're set for correct environments
- Redeploy after changing: `vercel --prod --force`

**Build Failures**
```bash
# Check locally first
cd frontend
npm install
npm run build

# If it works locally but not on Vercel:
# Clear cache and redeploy
vercel --prod --force --no-cache
```

---

## Security Best Practices

### For GitHub Secrets

1. **Rotate Keys Regularly**
   ```bash
   # Create new key every 90 days
   gcloud iam service-accounts keys create new-key.json \
     --iam-account=${SA_EMAIL}
   
   # Update GitHub secret
   # Delete old key
   gcloud iam service-accounts keys delete <old-key-id> \
     --iam-account=${SA_EMAIL}
   ```

2. **Use Minimal Permissions**
   - Only grant roles needed for CI/CD
   - Use separate service accounts for different environments
   - Enable audit logging

3. **Monitor Usage**
   ```bash
   # Check key usage
   gcloud iam service-accounts keys list \
     --iam-account=${SA_EMAIL}
   ```

### For Vercel

1. **Use Environment Variables**
   - Never hardcode sensitive data
   - Use different values for preview vs production
   - Rotate API keys regularly

2. **Restrict Deployments**
   - Set up deployment protection rules
   - Require reviews for production
   - Use preview deployments for testing

3. **Monitor Access**
   - Review team members regularly
   - Check deployment logs
   - Set up alerts for failures

---

## Quick Reference

### Required GitHub Secrets
```
GCP_SA_KEY - Google Cloud Service Account JSON key
```

### Required Vercel Environment Variables
```
NEXT_PUBLIC_API_URL - Backend API URL
NEXT_PUBLIC_ENVIRONMENT - Environment name (staging/production)
```

### Important Files
```
/vercel.json - Vercel configuration
/.vercelignore - Files to exclude from deployment
/frontend/next.config.ts - Next.js configuration
/.github/workflows/deploy.yml - Deployment workflow
```

### Useful Commands
```bash
# GitHub Actions
gh secret list
gh run list
gh workflow view deploy.yml

# Google Cloud
gcloud run services list
gcloud container images list

# Vercel
vercel ls
vercel inspect <url>
vercel logs <url>
vercel env ls
```

---

## Next Steps

After completing this setup:

1. ✅ Verify CI/CD pipeline runs successfully
2. ✅ Check Vercel preview deployments work
3. ✅ Test production deployment (with approval)
4. 📝 Document any custom settings
5. 🔄 Set up monitoring and alerts
6. 📅 Schedule regular key rotation

## Support

If you encounter issues:
1. Check the workflow logs in GitHub Actions
2. Review Vercel deployment logs
3. Verify all permissions are correctly set
4. Check the troubleshooting section above