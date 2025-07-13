# VANA Technical Context

## Core Technology Stack

### Programming Language
- **Python 3.13+** (MANDATORY - production critical requirement)
- Modern async patterns required by Google ADK
- Type hints required for all function signatures

### Dependency Management
- **Poetry** for dependency management and virtual environments
- `pyproject.toml` for project configuration
- `.env.local` for environment variables (never commit .env files)

### AI/ML Framework
- **Google Agent Development Kit (ADK)** - Core agent framework
- **Vertex AI** - Vector search and ML capabilities
- **Gemini 2.5 Flash** - Default AI model (configurable)

### Databases & Storage
- **ChromaDB** - Vector database for semantic search (development tools)
- **Google Cloud Storage** - File storage
- **Google Secret Manager** - Credential management

### Development Tools

#### Code Quality
```bash
# Required tools - run before commits
poetry run black .      # Code formatting (120 char line length)
poetry run isort .      # Import sorting
poetry run flake8       # Linting
poetry run mypy .       # Type checking
poetry run bandit -r .  # Security audit
```

#### Testing Framework
```bash
# Production Parity Testing (PREFERRED)
poetry run python tests/run_production_parity_tests.py --smoke-only
poetry run python tests/run_production_parity_tests.py --full

# Legacy pytest (use cautiously)
poetry run pytest -m unit          # Unit tests
poetry run pytest -m integration   # Integration tests
poetry run pytest -m e2e          # End-to-end tests
```

### Cloud Infrastructure

#### Google Cloud Platform
- **Cloud Run** - Container deployment
- **Vertex AI** - ML services
- **Secret Manager** - Credential storage
- **Cloud Storage** - File storage
- **IAM** - Access control

#### Authentication
```bash
# Required for development
gcloud auth application-default login
```

### MCP (Model Context Protocol) Integration

#### Development Memory (VS Code Only)
- **ChromaDB MCP Server** - Vector storage
- **Memory MCP Server** - Knowledge graph
- **Configuration**: `.claude.json` and `.claude/settings.local.json`

#### Production MCP (Separate)
- **Google ADK Memory** - `lib/_shared_libraries/adk_memory_service.py`
- **GitHub MCP** - Version control integration
- **Brave Search MCP** - Web search capabilities

### Development Environment Setup

#### Required Environment Variables
```bash
# Core Configuration
VANA_MODEL=gemini-2.5-flash
GOOGLE_CLOUD_PROJECT=your-project-id
ENVIRONMENT=development
```

#### Optional Dependencies
```bash
# PDF processing
pip install PyPDF2>=3.0.0

# Image processing and OCR
pip install Pillow>=10.0.0 pytesseract>=0.3.10

# System-level Tesseract (for OCR)
brew install tesseract  # macOS
sudo apt-get install tesseract-ocr  # Ubuntu/Debian
```

### Project Structure

#### Core Directories
```
agents/                    # Agent implementations
├── vana/                 # Main VANA orchestrator
├── data_science/         # Data science specialist
└── [proxy agents]/       # Memory, orchestration, specialists

lib/                      # Core libraries
├── _tools/              # Standardized tool implementations (59+ tools)
├── _shared_libraries/   # Shared services
├── security/            # Security manager, access control
├── monitoring/          # Performance monitoring
└── mcp/                 # MCP integration

docs/                    # System documentation
tests/                   # AI Agent Testing Framework
vscode-dev-docs/         # VS Code development tools (SEPARATE)
```

### Known Technical Constraints

#### Python Version Requirement
- **Critical**: Python 3.13+ required for production stability
- SSL/TLS compatibility issues with older versions
- Modern async patterns and type hints required

#### Memory System Separation
- **Development Memory**: ChromaDB + Knowledge Graph (VS Code tools)
- **Production Memory**: Google ADK services (completely separate)
- Never confuse these two systems

#### MCP Tool Limitations
- `chroma_peek_collection` - numpy serialization error
- `chroma_get_collection_info` - numpy serialization error
- Use `chroma_get_documents` with limit parameter instead

### Deployment

#### Development
```bash
./deployment/deploy-dev.sh
```

#### Production
```bash
./deployment/deploy-prod.sh
```

#### Docker
```bash
docker build -t vana .
docker run -p 8080:8080 vana
```