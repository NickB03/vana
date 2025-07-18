# VANA Troubleshooting Guide

This guide helps resolve common issues when developing or running VANA.

## Table of Contents

- [Setup Issues](#setup-issues)
- [Runtime Errors](#runtime-errors)
- [Development Problems](#development-problems)
- [Docker Issues](#docker-issues)
- [Performance Issues](#performance-issues)
- [Quick Fixes](#quick-fixes)

## Setup Issues

### Python Version Problems

**Problem**: `Python 3.13 is required but not found`

**Solutions**:

1. **macOS with Homebrew**:
   ```bash
   brew install python@3.13
   # Then use python3.13 explicitly
   python3.13 -m poetry install
   ```

2. **Using pyenv**:
   ```bash
   pyenv install 3.13.0
   pyenv local 3.13.0
   poetry env use 3.13.0
   ```

3. **Linux**:
   ```bash
   sudo add-apt-repository ppa:deadsnakes/ppa
   sudo apt update
   sudo apt install python3.13 python3.13-venv
   ```

### Poetry Installation Issues

**Problem**: `Poetry: command not found`

**Solution**:
```bash
# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Add to PATH (add to your shell profile)
export PATH="$HOME/.local/bin:$PATH"

# Verify installation
poetry --version
```

### Environment File Issues

**Problem**: `GOOGLE_API_KEY not configured`

**Solution**:
1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your API key:
   ```
   GOOGLE_API_KEY=your-actual-api-key-here
   ```

3. Get a key from: https://aistudio.google.com/apikey

## Runtime Errors

### Port Already in Use

**Problem**: `Error: Port 8081 is already in use`

**Solution**:
```bash
# Find the process using the port
lsof -i :8081

# Kill the process
kill -9 <PID>

# Or use a different port
VANA_PORT=8082 make backend
```

### API Connection Errors

**Problem**: Frontend can't connect to backend

**Solutions**:

1. **Check backend is running**:
   ```bash
   curl http://localhost:8081/health
   ```

2. **Check CORS settings** in `main.py`:
   ```python
   # Should include your frontend URL
   origins = ["http://localhost:5173"]
   ```

3. **Check environment variables** in frontend:
   ```bash
   # vana-ui/.env
   VITE_API_URL=http://localhost:8081
   ```

### Google API Errors

**Problem**: `Invalid API key` or rate limit errors

**Solutions**:

1. **Verify API key**:
   ```bash
   # Test your key
   curl -H "x-api-key: $GOOGLE_API_KEY" \
     https://generativelanguage.googleapis.com/v1/models
   ```

2. **Check rate limits**:
   - Free tier: 15 RPM (requests per minute)
   - Consider adding retry logic or upgrading

3. **Use different model**:
   ```bash
   # In .env.local
   VANA_MODEL=gemini-1.5-flash
   ```

## Development Problems

### Module Import Errors

**Problem**: `ModuleNotFoundError: No module named 'agents'`

**Solution**:
```bash
# Ensure you're in the project root
cd /path/to/vana

# Reinstall in development mode
poetry install

# Run with poetry
poetry run python main.py
```

### Type Checking Errors

**Problem**: mypy or type checking failures

**Solution**:
```bash
# Install type stubs
poetry add --dev types-requests types-aiofiles

# Run type checking
poetry run mypy . --ignore-missing-imports
```

### Test Failures

**Problem**: Tests failing locally but not in CI

**Solutions**:

1. **Reset test environment**:
   ```bash
   # Clear test cache
   find . -type d -name "__pycache__" -exec rm -rf {} +
   rm -rf .pytest_cache
   
   # Run tests fresh
   poetry run pytest -v
   ```

2. **Check test markers**:
   ```bash
   # Run only unit tests
   poetry run pytest -m unit
   
   # Skip slow tests
   poetry run pytest -m "not slow"
   ```

## Docker Issues

### Docker Compose Failures

**Problem**: `docker-compose: command not found`

**Solution**:
```bash
# Install Docker Desktop (includes docker-compose)
# Or install standalone:
pip install docker-compose

# For newer Docker versions, use:
docker compose up  # Note: no hyphen
```

### Container Build Errors

**Problem**: Docker build fails with dependency errors

**Solution**:
```bash
# Clean rebuild
docker-compose down -v
docker system prune -f
docker-compose build --no-cache
docker-compose up
```

### Volume Permission Issues

**Problem**: Permission denied errors in Docker

**Solution**:
```bash
# Fix ownership (Linux)
sudo chown -R $USER:$USER .

# Or run with user mapping
docker-compose run --user $(id -u):$(id -g) backend
```

## Performance Issues

### Slow Startup

**Problem**: Application takes too long to start

**Solutions**:

1. **Pre-install dependencies**:
   ```bash
   # Warm up the cache
   poetry install --no-root
   cd vana-ui && npm ci
   ```

2. **Use Docker for faster subsequent starts**:
   ```bash
   make docker-up
   ```

### High Memory Usage

**Problem**: Python process using too much memory

**Solutions**:

1. **Limit worker processes**:
   ```python
   # In main.py
   uvicorn.run(app, workers=1)  # Reduce workers
   ```

2. **Monitor memory**:
   ```bash
   # Install memory profiler
   pip install memory_profiler
   
   # Run with profiling
   python -m memory_profiler main.py
   ```

### Slow API Responses

**Problem**: API calls taking too long

**Solutions**:

1. **Enable response caching**:
   ```python
   from functools import lru_cache
   
   @lru_cache(maxsize=100)
   def expensive_operation(input):
       # Your code
   ```

2. **Use async properly**:
   ```python
   # Bad
   result = await async_operation()
   another = await another_operation()
   
   # Good - parallel execution
   result, another = await asyncio.gather(
       async_operation(),
       another_operation()
   )
   ```

## Quick Fixes

### Reset Everything

```bash
# Complete reset
make clean
rm -rf .venv node_modules vana-ui/node_modules
rm -f poetry.lock vana-ui/package-lock.json
make setup
make dev
```

### Update Dependencies

```bash
# Update Python deps
poetry update

# Update Node deps
cd vana-ui && npm update

# Update pre-commit hooks
pre-commit autoupdate
```

### Check System Health

```bash
# Run our validation script
./scripts/validate-env.sh

# Check all services
make docker-up
docker-compose ps
docker-compose logs
```

### Common Environment Variables

```bash
# Debug mode
export LOG_LEVEL=DEBUG
export VANA_ENV=development

# Use different ports
export VANA_PORT=8082
export FRONTEND_PORT=5174

# Increase timeouts
export REQUEST_TIMEOUT=300
export WORKER_TIMEOUT=300
```

## Getting Help

If these solutions don't resolve your issue:

1. **Check existing issues**: [GitHub Issues](https://github.com/yourusername/vana/issues)
2. **Ask in discussions**: [GitHub Discussions](https://github.com/yourusername/vana/discussions)
3. **Review logs carefully**:
   ```bash
   # Backend logs
   make backend 2>&1 | tee backend.log
   
   # Docker logs
   docker-compose logs -f --tail=100
   ```

4. **Create a minimal reproduction**:
   ```bash
   # Create a test script that shows the issue
   cat > test_issue.py << EOF
   # Minimal code that reproduces the problem
   EOF
   ```

Remember to include:
- Your OS and version
- Python version (`python --version`)
- Error messages and stack traces
- Steps to reproduce the issue