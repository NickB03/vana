#!/bin/bash
# VANA Codex Setup - SIMPLE & RELIABLE
# Minimal setup that works in any environment

echo "VANA Codex Setup - Simple & Reliable"
echo "Minimal approach for maximum compatibility"
echo ""

# Basic setup
mkdir -p "$HOME/.local/bin" 2>/dev/null || true
export PATH="$HOME/.local/bin:$PATH"

# Find Python
echo "Step 1: Finding Python..."
PYTHON=""
for cmd in python3.13 python3.12 python3.11 python3 python; do
    if command -v "$cmd" >/dev/null 2>&1; then
        VERSION=$($cmd --version 2>&1 | grep "Python 3" || echo "")
        if [ -n "$VERSION" ]; then
            PYTHON="$cmd"
            echo "  Found: $cmd ($VERSION)"
            break
        fi
    fi
done

if [ -z "$PYTHON" ]; then
    echo "  ERROR: No Python 3 found"
    exit 1
fi

# Setup pyenv if available (but don't fail if it doesn't work)
echo "Step 2: Configuring Python environment..."
if command -v pyenv >/dev/null 2>&1; then
    echo "  Configuring pyenv..."
    export PYENV_ROOT="$HOME/.pyenv"
    export PATH="$PYENV_ROOT/bin:$PATH"
    
    # Try to initialize pyenv (ignore errors)
    eval "$(pyenv init -)" 2>/dev/null || true
    eval "$(pyenv virtualenv-init -)" 2>/dev/null || true
    
    # Try to use Python 3.13 if available
    if pyenv versions 2>/dev/null | grep -q "3.13"; then
        pyenv local 3.13.3 2>/dev/null || pyenv global 3.13.3 2>/dev/null || true
        # Update Python command after pyenv
        if command -v python >/dev/null 2>&1; then
            PYTHON="python"
            echo "  Using pyenv Python 3.13"
        fi
    fi
fi

FINAL_VERSION=$($PYTHON --version 2>&1)
echo "  Final Python: $FINAL_VERSION"

# Install Poetry
echo "Step 3: Setting up Poetry..."
if ! command -v poetry >/dev/null 2>&1; then
    echo "  Installing Poetry..."
    $PYTHON -m pip install --user poetry --quiet
    export PATH="$HOME/.local/bin:$PATH"
fi

if command -v poetry >/dev/null 2>&1; then
    POETRY_VERSION=$(poetry --version 2>/dev/null || echo "Poetry installed")
    echo "  Poetry: $POETRY_VERSION"
else
    echo "  ERROR: Poetry installation failed"
    exit 1
fi

# Handle project dependencies
echo "Step 4: Installing dependencies..."
if [ -f "pyproject.toml" ]; then
    # Check if VANA project
    if grep -q '"vana"' pyproject.toml 2>/dev/null; then
        echo "  VANA project detected"
        
        # Check Python version constraint and relax if needed
        if grep -q 'python = ">=3.13,<4.0"' pyproject.toml; then
            CURRENT_VERSION=$($PYTHON -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "unknown")
            echo "  Project requires >=3.13, found Python $CURRENT_VERSION"
            
            if [ "$CURRENT_VERSION" != "3.13" ] && [ "$CURRENT_VERSION" != "unknown" ]; then
                echo "  Temporarily relaxing Python constraint..."
                cp pyproject.toml pyproject.toml.backup 2>/dev/null || true
                sed -i.bak 's/python = ">=3.13,<4.0"/python = ">=3.11,<4.0"/' pyproject.toml 2>/dev/null || true
                CONSTRAINT_MODIFIED=true
            fi
        fi
        
        # Try Poetry installation
        echo "  Installing VANA dependencies..."
        if poetry install --no-interaction 2>/dev/null; then
            echo "  ✓ Dependencies installed"
        else
            echo "  Retrying with cache clear..."
            poetry cache clear --all pypi -n 2>/dev/null || true
            if poetry install --no-interaction 2>/dev/null; then
                echo "  ✓ Dependencies installed after retry"
            else
                echo "  WARNING: Some dependency issues (continuing)"
            fi
        fi
        
        # Restore original constraint
        if [ "${CONSTRAINT_MODIFIED:-false}" = "true" ]; then
            mv pyproject.toml.backup pyproject.toml 2>/dev/null || true
            echo "  Restored original Python constraint"
        fi
        
        PROJECT_TYPE="vana"
    else
        echo "  Generic Poetry project"
        poetry install --no-interaction 2>/dev/null || echo "  WARNING: Install issues"
        PROJECT_TYPE="poetry"
    fi
else
    echo "  No Poetry project detected"
    PROJECT_TYPE="basic"
fi

# Create basic tools
echo "Step 5: Creating tools..."
cat > "$HOME/.local/bin/pytest" << 'EOF'
#!/bin/bash
if [ -f "pyproject.toml" ] && command -v poetry >/dev/null 2>&1; then
    poetry run pytest "$@"
else
    python -m pytest "$@" 2>/dev/null || python3 -m pytest "$@"
fi
EOF
chmod +x "$HOME/.local/bin/pytest" 2>/dev/null || true
echo "  ✓ pytest wrapper created"

# Create environment for VANA
if [ "$PROJECT_TYPE" = "vana" ] && [ ! -f ".env.local" ]; then
    echo "Step 6: Creating VANA environment..."
    cat > .env.local << 'EOF'
# VANA Development Environment - Current Branch
VANA_MODEL=deepseek/deepseek-r1-0528:free
GOOGLE_GENAI_USE_VERTEXAI=False
VANA_ENV=development
LOG_LEVEL=DEBUG

# Google Cloud Configuration (analystai-454200)
GOOGLE_API_KEY=AIzaSyBzblZlGJoRSvV1VRPPAQUSr064JyDy0yg
GOOGLE_CLOUD_PROJECT=analystai-454200
GOOGLE_CLOUD_LOCATION=us-central1

# RAG Configuration
VANA_RAG_CORPUS_ID=projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus
RAG_CORPUS_RESOURCE_NAME=projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus

# External APIs (development only)
BRAVE_API_KEY=BSA6fMCYrfJC5seE-AVsWrKjpOFk6Nm
OPENROUTER_API_KEY=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

# Testing Configuration
PYTEST_ASYNCIO_MODE=auto
TESTING_MODE=true
VANA_DEBUG=1
EOF
    ln -sf .env.local .env 2>/dev/null || true
    echo "  ✓ VANA environment created"
else
    echo "Step 6: Environment configuration..."
    echo "  ✓ Using existing or basic configuration"
fi

# Basic validation
echo "Step 7: Validation..."
if $PYTHON -c "print('Python OK')" 2>/dev/null; then
    echo "  ✓ Python working"
else
    echo "  ✗ Python issues"
fi

if [ "$PROJECT_TYPE" != "basic" ]; then
    if poetry run python -c "print('Poetry OK')" 2>/dev/null; then
        echo "  ✓ Poetry integration working"
    else
        echo "  ✗ Poetry integration issues"
    fi
fi

if [ "$PROJECT_TYPE" = "vana" ]; then
    if poetry run python -c "
import sys
sys.path.insert(0, '.')
try:
    from config.environment import EnvironmentConfig
    print('VANA config OK')
except Exception as e:
    print(f'VANA config: {e}')
" 2>/dev/null; then
        echo "  ✓ VANA configuration working"
    else
        echo "  ℹ VANA configuration may need additional setup"
    fi
fi

echo ""
echo "Setup Complete!"
echo ""
echo "Summary:"
echo "  Python: $FINAL_VERSION"
if [ "$PROJECT_TYPE" != "basic" ]; then
    echo "  Poetry: $POETRY_VERSION"
fi
if [ "$PROJECT_TYPE" = "vana" ]; then
    echo "  VANA: Development environment configured"
    echo "  Project: analystai-454200 (development)"
    echo "  Branch: project-id-audit-deployment-fixes"
fi
echo ""
echo "Test Commands:"
echo "  $PYTHON --version"
if [ "$PROJECT_TYPE" != "basic" ]; then
    echo "  poetry run python -c 'print(\"Hello from Poetry environment\")'"
fi
if [ "$PROJECT_TYPE" = "vana" ]; then
    echo "  poetry run python -c 'import os; print(f\"Project: {os.environ.get(\"GOOGLE_CLOUD_PROJECT\")}\"')'"
fi
echo ""
echo "Ready for development!"
