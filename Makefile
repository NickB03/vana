.PHONY: help setup dev backend frontend test clean format lint security docker-up docker-down docker-logs

.DEFAULT_GOAL := help

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

help:
	@echo "$(GREEN)VANA Development Commands:$(NC)"
	@echo "  $(YELLOW)make setup$(NC)      - Initial project setup (install dependencies)"
	@echo "  $(YELLOW)make dev$(NC)        - Start full development environment"
	@echo "  $(YELLOW)make backend$(NC)    - Start backend only"
	@echo "  $(YELLOW)make frontend$(NC)   - Start frontend only"
	@echo "  $(YELLOW)make test$(NC)       - Run all tests"
	@echo "  $(YELLOW)make clean$(NC)      - Clean generated files and caches"
	@echo ""
	@echo "$(GREEN)Code Quality:$(NC)"
	@echo "  $(YELLOW)make format$(NC)     - Format code with black and isort"
	@echo "  $(YELLOW)make lint$(NC)       - Run linting checks"
	@echo "  $(YELLOW)make security$(NC)   - Run security scan with bandit"
	@echo ""
	@echo "$(GREEN)Docker Commands:$(NC)"
	@echo "  $(YELLOW)make docker-up$(NC)  - Start services with docker-compose"
	@echo "  $(YELLOW)make docker-down$(NC)- Stop docker services"
	@echo "  $(YELLOW)make docker-logs$(NC)- View docker logs"
	@echo ""
	@echo "$(GREEN)Deployment:$(NC)"
	@echo "  $(YELLOW)make deploy-staging$(NC)     - Deploy to staging (safe)"
	@echo "  $(YELLOW)make deploy-production$(NC)  - Deploy to production (requires confirmation)"
	@echo "  $(YELLOW)make check-deployment$(NC)   - Validate deployment readiness"

setup:
	@echo "$(GREEN)🚀 Setting up VANA development environment...$(NC)"
	@./scripts/validate-env.sh || true
	@if [ ! -f .env.local ]; then \
		cp .env.example .env.local; \
		echo "$(YELLOW)📝 Created .env.local - Please add your GOOGLE_API_KEY$(NC)"; \
	fi
	@echo "$(GREEN)📦 Installing Python dependencies...$(NC)"
	@poetry install
	@echo "$(GREEN)📦 Installing frontend dependencies...$(NC)"
	@cd vana-ui && npm install
	@echo "$(GREEN)✅ Setup complete! Run 'make dev' to start$(NC)"

dev:
	@if command -v docker-compose >/dev/null 2>&1 && docker info >/dev/null 2>&1; then \
		echo "$(GREEN)🐳 Starting with Docker Compose...$(NC)"; \
		docker-compose up; \
	else \
		echo "$(YELLOW)⚠️  Docker not available, using local processes...$(NC)"; \
		./start-vana-ui.sh; \
	fi

backend:
	@echo "$(GREEN)🔧 Starting VANA backend...$(NC)"
	@poetry run python main.py

frontend:
	@echo "$(GREEN)🎨 Starting VANA frontend...$(NC)"
	@cd vana-ui && npm run dev

test:
	@echo "$(GREEN)🧪 Running tests...$(NC)"
	@poetry run pytest -v

test-unit:
	@echo "$(GREEN)🧪 Running unit tests...$(NC)"
	@poetry run pytest -m unit -v

test-agent:
	@echo "$(GREEN)🤖 Running agent tests...$(NC)"
	@poetry run pytest -m agent -v

test-integration:
	@echo "$(GREEN)🔗 Running integration tests...$(NC)"
	@poetry run pytest -m integration -v

clean:
	@echo "$(RED)🧹 Cleaning up...$(NC)"
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@rm -rf .coverage htmlcov/ 2>/dev/null || true
	@rm -rf .mypy_cache/ 2>/dev/null || true
	@echo "$(GREEN)✅ Cleanup complete$(NC)"

format:
	@echo "$(GREEN)🎨 Formatting code...$(NC)"
	@poetry run black .
	@poetry run isort .
	@echo "$(GREEN)✅ Code formatted$(NC)"

lint:
	@echo "$(GREEN)🔍 Running linters...$(NC)"
	@poetry run flake8
	@poetry run mypy .
	@echo "$(GREEN)✅ Linting complete$(NC)"

security:
	@echo "$(GREEN)🔒 Running security scan...$(NC)"
	@poetry run bandit -r . -ll
	@echo "$(GREEN)✅ Security scan complete$(NC)"

# Docker commands (for Phase 2)
docker-up:
	@echo "$(GREEN)🐳 Starting Docker services...$(NC)"
	@docker-compose up -d
	@echo "$(GREEN)✅ Services started$(NC)"

docker-down:
	@echo "$(RED)🛑 Stopping Docker services...$(NC)"
	@docker-compose down
	@echo "$(GREEN)✅ Services stopped$(NC)"

docker-logs:
	@docker-compose logs -f

# Deployment commands with safety checks
check-deployment:
	@echo "$(GREEN)🔍 Checking deployment readiness...$(NC)"
	@pwd | grep -q "vana$$" || (echo "$(RED)❌ Not in VANA root directory!$(NC)" && exit 1)
	@test -f Dockerfile || (echo "$(RED)❌ Dockerfile not found!$(NC)" && exit 1)
	@test -f main.py || (echo "$(RED)❌ main.py not found!$(NC)" && exit 1)
	@test -d vana-ui || (echo "$(RED)❌ vana-ui directory not found!$(NC)" && exit 1)
	@test -f vana-ui/dist/index.html || (echo "$(YELLOW)⚠️  Frontend not built - run 'make frontend-build' first$(NC)")
	@echo "$(GREEN)✅ All deployment checks passed!$(NC)"

frontend-build:
	@echo "$(GREEN)🏗️  Building frontend...$(NC)"
	@cd vana-ui && npm run build
	@echo "$(GREEN)✅ Frontend build complete!$(NC)"

deploy-staging: check-deployment
	@echo "$(GREEN)🚀 Deploying to staging...$(NC)"
	@./scripts/safe-deploy.sh staging

deploy-production: check-deployment
	@echo "$(RED)⚠️  PRODUCTION DEPLOYMENT$(NC)"
	@./scripts/safe-deploy.sh production