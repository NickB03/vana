# Quick Start Guide for Next Agent
**Created:** 2025-06-16T23:45:00Z  
**Purpose:** Immediate action guide for next agent handoff  
**Status:** ✅ READY FOR EXECUTION  

---

## 🚀 IMMEDIATE ACTIONS (First 10 Minutes)

### **1. Check Augment Task List**
```
view_tasklist
```
**Expected:** 24 tasks in 5 phases for comprehensive system testing

### **2. Start Phase 1 Testing**
```
update_tasks task_id="[Phase 1 task ID]" state="IN_PROGRESS"
```

### **3. Test Local Environment**
```bash
cd /Users/nick/Development/vana
export $(cat .env.local | grep -v '^#' | xargs)
export PYTHONPATH="/Users/nick/Development/vana:$PYTHONPATH"
poetry run adk run agents/vana
```
**Test Command:** `search the web for Chicago weather`
**Expected:** Actual weather results (not API key error)

### **4. Test Deployed Environment**
```bash
curl -X GET https://vana-dev-qqugqgsbcq-uc.a.run.app/list-apps
```
**Expected:** JSON array with agent names including "vana"

---

## 🎯 CRITICAL SUCCESS CONFIRMATIONS

### ✅ **Environment Variables Working**
- **Local:** BRAVE_API_KEY loaded from .env.local
- **Deployed:** BRAVE_API_KEY mounted from Google Secrets Manager
- **Test:** Web search returns actual results, not "API key not configured"

### ✅ **Interactive Testing Available**
- **Command:** `poetry run adk run agents/vana`
- **Benefit:** Real-time chat instead of curl commands
- **Usage:** Type commands directly, see immediate responses

### ✅ **Deployment Configuration Fixed**
- **Issue Resolved:** Cloud Build was using `--clear-secrets`
- **Solution Applied:** Now uses `--set-secrets` to mount from Google Secrets Manager
- **Files Updated:** `deployment/cloudbuild-dev.yaml` and `deployment/cloudbuild-prod.yaml`

---

## 📋 TESTING METHODOLOGY

### **Phase 1: Foundation (START HERE)**
**Priority:** P0 (Critical) - Must pass 100%

1. **Environment Configuration Validation**
   - Check all environment variables are accessible
   - Verify BRAVE_API_KEY, GOOGLE_CLOUD_REGION, RAG_CORPUS_RESOURCE_NAME

2. **Agent Discovery Testing**
   - Test `/list-apps` endpoint
   - Verify expected agents discoverable

3. **Core API Endpoint Validation**
   - Test `/run_sse`, `/run`, `/health` endpoints
   - Verify proper responses

### **Evidence Collection Required:**
- Response logs and outputs
- Performance measurements (response times)
- Error messages (if any)
- Screenshots of successful operations

---

## 🔧 TOOLS AND COMMANDS

### **Local Testing Commands:**
```bash
# Environment setup
cd /Users/nick/Development/vana
export $(cat .env.local | grep -v '^#' | xargs)
export PYTHONPATH="/Users/nick/Development/vana:$PYTHONPATH"

# Start interactive agent
poetry run adk run agents/vana

# Test web search
# In agent chat: "search the web for Chicago weather"
```

### **Deployed Testing Commands:**
```bash
# Check available agents
curl -X GET https://vana-dev-qqugqgsbcq-uc.a.run.app/list-apps

# Test agent interaction
curl -X POST https://vana-dev-qqugqgsbcq-uc.a.run.app/run_sse \
-H "Content-Type: application/json" \
-d '{
"appName": "vana",
"userId": "test_user",
"sessionId": "test_session",
"newMessage": {
    "role": "user",
    "parts": [{
    "text": "search the web for Chicago weather"
    }]
},
"streaming": false
}'
```

### **Augment Task Management:**
```bash
# View current tasks
view_tasklist

# Update task status
update_tasks task_id="[task-id]" state="IN_PROGRESS"
update_tasks task_id="[task-id]" state="COMPLETE"

# Add new tasks if needed
add_tasks name="New Test" description="Additional testing needed"
```

---

## 📊 SUCCESS CRITERIA

### **Phase 1 Success Indicators:**
- ✅ All environment variables accessible and functional
- ✅ All expected agents discoverable in both local and deployed
- ✅ All API endpoints respond with correct status codes
- ✅ Web search returns actual results (not API key errors)
- ✅ Interactive testing (`adk run`) works smoothly

### **Performance Targets:**
- **Simple Operations:** <5 seconds response time
- **Complex Operations:** <10 seconds response time
- **Agent Discovery:** <2 seconds
- **API Endpoints:** <3 seconds

### **Error Handling:**
- No crashes or hangs during normal operation
- Graceful error messages for invalid inputs
- System stability under various test conditions

---

## 🚨 TROUBLESHOOTING

### **If Web Search Fails:**
- Check environment variables: `env | grep BRAVE_API_KEY`
- Verify .env.local file exists and has BRAVE_API_KEY
- Ensure PYTHONPATH is set correctly

### **If Agent Discovery Fails:**
- Verify correct URL: `https://vana-dev-qqugqgsbcq-uc.a.run.app`
- Check deployment status: `gcloud run services describe vana-dev --region=us-central1 --project=analystai-454200`

### **If Interactive Testing Fails:**
- Ensure Poetry environment: `poetry install`
- Check Python path: `export PYTHONPATH="/Users/nick/Development/vana:$PYTHONPATH"`
- Verify agent directory exists: `ls agents/vana/`

---

## 📁 KEY FILES AND LOCATIONS

### **Memory Bank Structure:**
- **Active Context:** `memory-bank/00-core/activeContext.md`
- **Progress Tracking:** `memory-bank/00-core/progress.md`
- **Handoff Document:** `memory-bank/01-active/HANDOFF_COMPREHENSIVE_TESTING_PLAN_2025_06_16.md`
- **This Guide:** `memory-bank/01-active/QUICK_START_GUIDE_NEXT_AGENT.md`

### **Project Structure:**
- **Project Root:** `/Users/nick/Development/vana`
- **Agent Code:** `agents/vana/team.py`
- **Environment Config:** `.env.local`
- **Deployment Configs:** `deployment/cloudbuild-dev.yaml`

### **Testing Resources:**
- **Augment Tasks:** Use `view_tasklist` command
- **Local Testing:** `poetry run adk run agents/vana`
- **Deployed Testing:** `https://vana-dev-qqugqgsbcq-uc.a.run.app`

---

## 🎯 EXPECTED TIMELINE

### **Phase 1 (Foundation):** 1-2 hours
- Environment validation: 30 minutes
- Agent discovery testing: 30 minutes
- API endpoint validation: 30 minutes
- Documentation: 30 minutes

### **Phase 2 (Tools):** 3-4 hours
- Essential tools testing: 1 hour
- File system tools: 1 hour
- Coordination tools: 1 hour
- Memory/system tools: 1 hour

### **Phase 3 (Agents):** 2-3 hours
- Individual agent testing: 1.5 hours
- Delegation testing: 1 hour
- Integration testing: 30 minutes

### **Phase 4 (Integration):** 2-3 hours
- Complex workflows: 1.5 hours
- Performance testing: 1 hour
- Error handling: 30 minutes

### **Phase 5 (Production):** 1-2 hours
- Deployment validation: 1 hour
- Documentation updates: 1 hour

**Total Estimated Time: 9-14 hours**

---

**🚀 READY TO BEGIN - START WITH PHASE 1 FOUNDATION TESTING** ✅

**Use the Augment task list to track progress and ensure systematic validation.**
