# 🚀 VANA ADK DEPLOYMENT LAUNCH CHECKLIST

**Version**: 1.0  
**Date**: 2025-01-30  
**Purpose**: Pre-deployment validation for VANA ADK system on Google Cloud Run

---

## 📋 PRE-DEPLOYMENT VALIDATION CHECKLIST

### **🔧 1. DEVELOPMENT ENVIRONMENT**
- [ ] **Python Version**: Confirm Python 3.13 in use
- [ ] **Poetry**: Verify Poetry is installed and functional
- [ ] **Working Directory**: Confirm `/Users/nick/Development/vana` as root
- [ ] **Virtual Environment**: Verify Poetry environment is active
- [ ] **Dependencies**: Confirm all dependencies resolve correctly

### **📁 2. PROJECT STRUCTURE VALIDATION**
- [ ] **Root Structure**: Verify correct directory layout
- [ ] **Agent Directory**: Confirm `/agents/vana/` exists with proper files
- [ ] **Tools Directory**: Verify `/lib/_tools/` contains ADK tools
- [ ] **Deployment Directory**: Confirm `/deployment/` has all required files
- [ ] **No Wrong Directories**: Ensure no `/vana_multi_agent/` remnants

### **🛠️ 3. ADK AGENT CONFIGURATION**
- [ ] **Agent Entry Point**: Verify `agents/vana/agent.py` imports correctly
- [ ] **Team Configuration**: Confirm `agents/vana/team.py` has 16 tools
- [ ] **Tool Registration**: Verify all tools are ADK FunctionTool instances
- [ ] **Tool Names**: Confirm no underscore prefixes (e.g., "echo" not "_echo")
- [ ] **Import Paths**: Verify correct imports from `lib._tools.adk_tools`

### **🐍 4. PYTHON & POETRY CONFIGURATION**
- [ ] **pyproject.toml**: Verify project name, packages, dependencies
- [ ] **poetry.lock**: Confirm lock file exists and is current
- [ ] **Python Version**: Verify `python = "^3.13"` in pyproject.toml
- [ ] **Package Structure**: Confirm packages include agents, lib, tools
- [ ] **Script Entry**: Verify script points to correct main module

### **🐳 5. DOCKER & CLOUD BUILD**
- [ ] **Dockerfile**: Verify Python 3.13 base image
- [ ] **Poetry Installation**: Confirm Poetry is installed in Docker
- [ ] **Multi-stage Build**: Verify optimized build process
- [ ] **Working Directory**: Confirm correct WORKDIR in container
- [ ] **Entry Point**: Verify container runs correct main.py

### **☁️ 6. CLOUD BUILD CONFIGURATION**
- [ ] **cloudbuild.yaml**: Verify correct service name "vana"
- [ ] **Image Names**: Confirm all references use "vana" not "vana-multi-agent"
- [ ] **Build Steps**: Verify Docker build, push, deploy sequence
- [ ] **Environment Variables**: Confirm all required env vars set
- [ ] **Service Account**: Verify correct service account reference

### **🔐 7. AUTHENTICATION & SECRETS**
- [ ] **Environment Detection**: Verify smart environment detection module exists
- [ ] **Local Config**: Confirm `.env.local` exists with `GOOGLE_API_KEY`
- [ ] **Production Config**: Confirm `.env.production` exists with Vertex AI settings
- [ ] **Service Account**: Verify `vana-vector-search-sa` exists for Cloud Run
- [ ] **API Keys**: Confirm Brave API key is set in appropriate environment
- [ ] **Auto-Configuration**: Verify environment detection works correctly

### **🌐 8. CLOUD RUN DEPLOYMENT**
- [ ] **Service Name**: Verify "vana" service name throughout
- [ ] **Region**: Confirm "us-central1" region
- [ ] **Port Configuration**: Verify PORT=8080 environment variable
- [ ] **Scaling**: Confirm min/max instances configuration
- [ ] **Memory/CPU**: Verify resource allocation settings

### **🔍 9. MAIN APPLICATION**
- [ ] **main.py**: Verify correct agents_dir path
- [ ] **FastAPI Integration**: Confirm ADK FastAPI app creation
- [ ] **Health Endpoints**: Verify /health and /info endpoints
- [ ] **CORS Configuration**: Confirm allowed origins
- [ ] **Session Database**: Verify SQLite configuration

### **📊 10. FINAL VALIDATION**
- [ ] **Import Test**: Verify agent imports without errors
- [ ] **Tool Count**: Confirm exactly 16 tools are loaded
- [ ] **No Conflicts**: Ensure no duplicate or conflicting configurations
- [ ] **Clean State**: Verify no temporary files or wrong directories
- [ ] **Memory Bank**: Confirm documentation is up to date

---

## 🎯 DEPLOYMENT EXECUTION STEPS

### **Pre-Launch Commands**
```bash
cd /Users/nick/Development/vana
poetry check
poetry install --only=main
python3 -c "from agents.vana.team import root_agent; print(f'✅ Agent loaded: {len(root_agent.tools)} tools')"
```

### **Launch Command**
```bash
chmod +x deployment/deploy.sh
./deployment/deploy.sh
```

### **Post-Launch Validation**
```bash
# Test service endpoints
curl https://vana-[hash].us-central1.run.app/health
curl https://vana-[hash].us-central1.run.app/info
```

---

## ⚠️ CRITICAL CHECKPOINTS

1. **NO vana_multi_agent references anywhere**
2. **Python 3.13 throughout the pipeline**
3. **Poetry as package manager (not pip)**
4. **Correct agent structure in /agents/vana/**
5. **All 16 tools properly registered**
6. **Vertex AI authentication enabled**

---

## 🚨 ABORT CONDITIONS

**DO NOT DEPLOY IF:**
- Any checklist item fails validation
- Wrong directory references found
- Tool count ≠ 16
- Python version ≠ 3.13
- Poetry configuration invalid
- Authentication not properly configured

---

**Checklist Completed By**: [Agent Name]  
**Validation Date**: [Date/Time]  
**Deployment Approved**: [ ] YES / [ ] NO
