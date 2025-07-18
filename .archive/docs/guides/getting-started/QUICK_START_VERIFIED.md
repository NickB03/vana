# VANA Quick Start - Verified Steps

*Last Successfully Tested: 2025-01-10*  
*Time to First Response: ~5 minutes*

## Prerequisites Check

```bash
# 1. Check Python version (MUST be 3.13+)
python3 --version
# Expected: Python 3.13.x or higher

# 2. Check Poetry is installed
poetry --version
# Expected: Poetry (version x.x.x)

# 3. Check Git
git --version
# Expected: git version x.x.x
```

❌ **STOP** if Python is below 3.13 - VANA will not work!

## Installation (Tested Steps)

### Step 1: Clone Repository
```bash
git clone [repository-url]
cd vana
```

### Step 2: Install Dependencies
```bash
poetry install
```

**What you should see:**
- Installing google-adk (1.1.1)
- Installing psutil (7.0.0)  ← Despite docs saying unavailable!
- Installing fastapi (0.115.12)
- ~50 other packages

**Common Issues:**
- If poetry uses wrong Python: `poetry env use python3.13`
- If dependencies fail: Check you're using Python 3.13+

### Step 3: Create Environment File
```bash
# Create .env.local (not .env!)
cat > .env.local << EOF
GOOGLE_API_KEY=your-actual-api-key-here
EOF
```

⚠️ You need a real Google API key for Gemini model access!

### Step 4: Start the Server
```bash
poetry run python main.py
```

**Expected Output:**
```
✅ GOOGLE_API_KEY loaded from .env.local
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8081 (Press CTRL+C to quit)
```

📝 Note: Port is **8081**, not 8000 as some docs claim!

### Step 5: Test It Works
In a new terminal:

```bash
# Test 1: Health check
curl http://localhost:8081/health
# Expected: {"status": "healthy"}

# Test 2: Basic query
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "What is 2+2?"}'
# Expected: {"result": {"output": "2 + 2 = 4\n", "id": "session_xxx"}}

# Test 3: Web search
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "What time is it in Tokyo?"}'
# Expected: Response with time information
```

## Common Problems & Solutions

### Port 8081 Already in Use
```bash
# Find what's using it
lsof -i :8081

# Kill it (replace PID with actual number)
kill -9 PID

# Or change port in main.py
```

### "Module not found" Errors
```bash
# Ensure you're in poetry environment
poetry shell
python main.py

# Or always use poetry run
poetry run python main.py
```

### API Key Issues
- Check `.env.local` exists (not `.env`)
- Ensure no quotes around API key
- Verify key works: https://makersuite.google.com/app/apikey

### Import Error for coordinated_search_tool
This is a known bug. The system still works, just ignore the error or comment out the import in `search_coordinator.py:425`

## What You Can Do Now

### Working Commands
```bash
# Ask questions
"What is the capital of France?"
"Explain Python decorators"
"What's 15% of 240?"

# Web search
"What's the weather in London?"
"Latest news about AI"
"Current time in New York"

# File operations (be careful!)
"Read the file README.md"
"Create a file called test.txt with content 'Hello World'"

# Math problems
"Solve x^2 + 5x + 6 = 0"
"What's the factorial of 7?"
```

### What Won't Work
- ❌ "Analyze this image" (no image support)
- ❌ "Search my documents" (vector search not configured)
- ❌ "Run this complex Python script" (code execution limited)
- ❌ "Deploy to production" (DevOps agent not integrated)

## Next Steps

1. ✅ You now have a working VANA instance!
2. 📖 Read [What Actually Works](../status/CURRENT_STATUS.md)
3. 🛠️ Check [Developer Guide](../developer/REALITY_BASED_DEV_GUIDE.md)
4. 🐛 See [Known Issues](../troubleshooting/KNOWN_ISSUES.md)

---

*Reminder: This guide shows what ACTUALLY works, not what the old docs claimed!*