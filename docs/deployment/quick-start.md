# VANA Quick Start Deployment Guide

**Time to Deploy**: 5-10 minutes  
**Status**: ✅ TESTED AND VERIFIED  

## 🚀 Choose Your Deployment Path

### Option A: Production Deployment (Recommended)
**For**: Production use, team deployments, reliable setup  
**Time**: 5 minutes  

### Option B: Local Development  
**For**: Development, testing, local experimentation  
**Time**: 2 minutes  

---

## 🌐 Option A: Production Deployment

### Prerequisites Check
```bash
# Verify you have these installed:
python --version  # Should show 3.13.x
gcloud --version  # Should show Google Cloud SDK
```

### Step 1: Authenticate with Google Cloud
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Step 2: Deploy to Production
```bash
# Clone and navigate to project
cd vana

# Deploy (with automatic validation)
./deployment/deploy-prod.sh
```

### Step 3: Confirm Deployment
When prompted:
```
⚠️  Deploy to PRODUCTION? This will affect live users. (y/N): y
```

### Step 4: Verify Deployment
The script will automatically:
- Build your application (~3 minutes)
- Deploy to Cloud Run
- Test the health endpoint
- Display your service URL

**Expected Output:**
```
✅ Production deployment complete!
🌐 Service URL: https://vana-prod-xyz-uc.a.run.app
🔍 Health check: https://vana-prod-xyz-uc.a.run.app/health
✅ Health check passed
🎉 VANA Production deployment successful!
```

---

## 🖥️ Option B: Local Development

### Step 1: Install Dependencies
```bash
# Ensure Python 3.13+ is active
python --version

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Optional Configuration
```bash
# Create local API key file (optional)
echo "GOOGLE_API_KEY=your-api-key-here" > .env.local
```
**Note**: Application works without API key but shows warnings

### Step 3: Start Application
```bash
# Method 1: Direct Python
python main.py

# Method 2: Using Uvicorn (recommended)
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Step 4: Access Your Application
- **Main Application**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **Dashboard**: http://localhost:8000/dashboard
- **API Documentation**: http://localhost:8000/docs

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### "gcloud: command not found"
```bash
# Install Google Cloud SDK
# Visit: https://cloud.google.com/sdk/docs/install
```

#### "Not authenticated with gcloud"
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

#### "python: No module named 'fastapi'"
```bash
# Install dependencies
pip install -r requirements.txt
```

#### "GOOGLE_API_KEY not set"
This is a warning only. Application continues to work.
```bash
# Optional: Add API key
echo "GOOGLE_API_KEY=your-key" > .env.local
```

#### "Health check failed"
- Wait 30 seconds and try again
- Check Cloud Run logs in Google Console
- Verify environment variables are set

---

## 📋 Verification Checklist

### Production Deployment ✅
- [ ] Service URL accessible
- [ ] Health endpoint returns 200 OK
- [ ] Dashboard loads without errors
- [ ] API documentation available at /docs

### Local Development ✅
- [ ] Application starts without errors
- [ ] http://localhost:8000 accessible
- [ ] Health check passes
- [ ] No critical errors in logs

---

## 🎯 Next Steps

### After Production Deployment
1. **Bookmark your service URL** for easy access
2. **Test the dashboard** at `{your-url}/dashboard`
3. **Review the API docs** at `{your-url}/docs`
4. **Set up monitoring** (optional)

### After Local Setup
1. **Explore the codebase** in `agents/` directory
2. **Try the API endpoints** using the documentation
3. **Modify configuration** in `.env.local` as needed
4. **Set up your IDE** for development

---

## 🔍 What Gets Deployed

### Cloud Run Service Includes:
- **26 AI tools** ready for use
- **Google ADK integration** for enhanced capabilities
- **Vector Search** for intelligent memory
- **FastAPI application** with automatic documentation
- **Health monitoring** and logging
- **Auto-scaling** (0-10 instances)

### Resource Allocation:
- **Memory**: 2 GiB
- **CPU**: 2 vCPU
- **Region**: us-central1
- **Scaling**: 0-10 instances

---

## 🆘 Getting Help

### If Something Goes Wrong
1. **Check the logs**: 
   - Production: Google Cloud Console → Cloud Run → Service Logs
   - Local: Check terminal output

2. **Verify requirements**:
   - Python 3.13+ ✅
   - All dependencies installed ✅
   - Google Cloud authenticated ✅

3. **Common fixes**:
   - Restart the application
   - Re-run authentication
   - Check API quotas

### Support Resources
- **Health Endpoint**: Always check `/health` first
- **API Docs**: Use `/docs` for endpoint testing
- **Logs**: Check application logs for specific errors

---

## ⚡ Pro Tips

### For Production
- **Use the validated script**: `deploy-prod.sh` has built-in safety checks
- **Monitor resources**: Check Cloud Run metrics after deployment
- **Update gradually**: Test changes locally first

### For Local Development
- **Use .env.local**: Keep sensitive keys out of version control
- **Hot reload**: Uvicorn automatically reloads on code changes
- **API testing**: Use the built-in docs at `/docs` for testing

---

## 🎉 Success!

You now have VANA running! The system includes:
- ✅ **26 specialized AI tools**
- ✅ **Google ADK integration**
- ✅ **Vector Search capabilities**
- ✅ **Production-ready deployment**
- ✅ **Comprehensive API documentation**

Ready to build intelligent AI agents? Start exploring the `/docs` endpoint to see what's available!