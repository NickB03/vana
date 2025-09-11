# Clear any conflicting VIRTUAL_ENV from parent shell
unexport VIRTUAL_ENV

# Install dependencies using uv package manager
install:
	@command -v uv >/dev/null 2>&1 || { echo "uv is not installed. Installing uv..."; curl -LsSf https://astral.sh/uv/0.6.12/install.sh | sh; source $HOME/.local/bin/env; } 
	uv sync --dev --extra jupyter && npm --prefix frontend install

# Start the ADK API server and React frontend development server simultaneously
dev:
	make dev-backend & make dev-frontend

# Start the ADK API server
dev-backend:
	ALLOW_ORIGINS="*" uv run --env-file .env.local uvicorn app.server:app --host 0.0.0.0 --port 8000 --reload

# Start the React frontend development server
dev-frontend:
	npm --prefix frontend run dev

# Launch local dev playground
playground:
	@echo "==============================================================================="
	@echo "| 🚀 Starting your agent playground...                                        |"
	@echo "|                                                                             |"
	@echo "| 💡 Try asking: A report on the latest Google I/O event                      |"
	@echo "|                                                                             |"
	@echo "| 🔍 IMPORTANT: Select the 'app' folder to interact with your agent.          |"
	@echo "==============================================================================="
	uv run --env-file .env.local adk web --port 8501

# Cloud Run deployment (DISABLED - focusing on local builds)
# To re-enable: Uncomment after local development is stable and GCP credentials are configured
# backend:
# 	PROJECT_ID=$$(gcloud config get-value project) && \
# 	gcloud beta run deploy my-project \
# 		--source . \
# 		--memory "4Gi" \
# 		--project $$PROJECT_ID \
# 		--region "us-central1" \
# 		--no-allow-unauthenticated \
# 		--no-cpu-throttling \
# 		--labels "created-by=adk" \
# 		--set-env-vars \
# 		"COMMIT_SHA=$(shell git rev-parse HEAD)" \
# 		$(if $(IAP),--iap) \
# 		$(if $(PORT),--port=$(PORT))

# Local build and test (PRIMARY FOCUS)
build-local:
	@echo "🏠 Building and testing locally..."
	@$(MAKE) test
	@$(MAKE) lint
	@$(MAKE) typecheck
	@echo "✅ Local build successful!"

# Launch local development server with hot-reload
local-backend:
	uv run --env-file .env.local uvicorn app.server:app --host 0.0.0.0 --port 8000 --reload

# Docker-based local development
docker-up:
	@echo "🐳 Starting Docker services..."
	docker-compose up -d
	@echo "✅ Services running at:"
	@echo "   - Backend: http://localhost:8000"
	@echo "   - Frontend: http://localhost:3000"

docker-down:
	@echo "🛑 Stopping Docker services..."
	docker-compose down -v

docker-build:
	@echo "🔨 Building Docker images..."
	docker build -f Dockerfile.local -t vana-backend:local .
	docker build -f frontend/Dockerfile -t vana-frontend:local ./frontend
	@echo "✅ Docker images built!"

docker-logs:
	docker-compose logs -f

docker-restart:
	@$(MAKE) docker-down
	@$(MAKE) docker-build
	@$(MAKE) docker-up

# Terraform setup (DISABLED - focusing on local development)
# To re-enable: Uncomment after local development is stable
# setup-dev-env:
# 	PROJECT_ID=$$(gcloud config get-value project) && \
# 	(cd deployment/terraform/dev && terraform init && terraform apply --var-file vars/env.tfvars --var dev_project_id=$$PROJECT_ID --auto-approve)

# Local development environment setup
setup-local-env:
	@echo "🔧 Setting up local development environment..."
	@$(MAKE) install
	@echo "✅ Local environment ready!"

# Run unit and integration tests
test:
	uv run pytest tests/unit -v && uv run pytest tests/integration -v
	@$(MAKE) coverage-clean

# Run specific test categories
test-unit:
	uv run pytest tests/unit -v

test-integration:
	uv run pytest tests/integration -v

test-performance:
	uv run pytest tests/performance -v

# Run all tests with coverage
test-coverage:
	uv run pytest --cov=app --cov-report=html --cov-report=term tests/

# Run code quality checks (codespell, ruff, mypy)
lint:
	uv run codespell app/ tests/ *.md *.py --skip="venv/,.venv/,__pycache__/" --ignore-words-list="rouge,DAA,deques"
	uv run ruff check . --diff
	uv run ruff format . --check --diff
	uv run mypy .

# Run type checking
typecheck:
	uv run mypy .

# Coverage management commands
.PHONY: coverage-clean coverage-report coverage-history coverage-auto

# Clean up coverage files (keeps 7 days by default)
coverage-clean:
	@echo "🧹 Cleaning coverage files..."
	@python scripts/manage_coverage.py clean --keep-days 7

# Generate coverage report
coverage-report:
	@echo "📊 Generating coverage report..."
	@python scripts/manage_coverage.py combine
	@python scripts/manage_coverage.py report --format html
	@echo "📄 HTML report available at .coverage_archive/reports/"

# Show coverage history
coverage-history:
	@python scripts/manage_coverage.py history --limit 20

# Automatic coverage management (combine, report, clean)
coverage-auto:
	@echo "🔄 Running automatic coverage management..."
	@python scripts/manage_coverage.py auto

# Claude Flow Hooks Integration
TASK_ID ?= $(shell date +%s)
SESSION_ID ?= session-$(shell date +%Y%m%d-%H%M%S)

.PHONY: cf-pre-task cf-post-task cf-pre-edit cf-post-edit cf-session-restore cf-session-end

# Hook: Before starting any development task
cf-pre-task:
	@echo "🚀 Initializing Claude Flow task coordination..."
	@echo "🔄 Loading cross-session memory..."
	@npx claude-flow memory usage --action retrieve --key "test/cross-session-challenge" 2>/dev/null || true
	@npx claude-flow memory usage --action retrieve --key "knowledge/vana-secrets" 2>/dev/null || true
	@npx claude-flow memory usage --action search --pattern "secret|challenge|knowledge" 2>/dev/null || true
	@npx claude-flow hooks pre-task \
		--description "$(TASK_DESC)" \
		--task-id "$(TASK_ID)" \
		--auto-spawn-agents

# Hook: After completing development task  
cf-post-task:
	@echo "✅ Completing Claude Flow task analysis..."
	@npx claude-flow hooks post-task \
		--task-id "$(TASK_ID)" \
		--analyze-performance \
		--generate-insights

# Hook: Before file modifications
cf-pre-edit:
	@echo "📝 Preparing file modification coordination..."
	@npx claude-flow hooks pre-edit \
		--file "$(FILE_PATH)" \
		--operation "$(EDIT_OP)"

# Hook: After file modifications
cf-post-edit:
	@echo "💾 Updating coordination memory..."
	@npx claude-flow hooks post-edit \
		--file "$(FILE_PATH)" \
		--memory-key "swarm/$(SESSION_ID)/$(notdir $(FILE_PATH))"

# Hook: Restore session state
cf-session-restore:
	@echo "🔄 Restoring session state and coordination..."
	@npx claude-flow hooks session-restore \
		--session-id "$(SESSION_ID)" \
		--load-memory \
		--sync-agents

# Hook: End of development session
cf-session-end:
	@echo "🏁 Finalizing session and exporting metrics..."
	@npx claude-flow hooks session-end \
		--export-metrics \
		--generate-summary \
		--session-id "$(SESSION_ID)"

# Integrated development commands with hooks
dev-with-hooks: cf-pre-task
	$(MAKE) dev-frontend &
	$(MAKE) dev-backend &
	@echo "Development servers started with Claude Flow coordination"
	$(MAKE) cf-post-task TASK_DESC="Start development servers"

test-with-hooks: cf-pre-task  
	$(MAKE) test
	$(MAKE) lint  
	$(MAKE) typecheck
	$(MAKE) cf-post-task TASK_DESC="Run test suite"

build-with-hooks: cf-pre-task
	$(MAKE) test-with-hooks
	@echo "Build completed successfully"
	$(MAKE) cf-post-task TASK_DESC="Complete build pipeline"

# Session management
save-session:
	@./.claude_workspace/sessions/save-session.sh $(SESSION_ID)

restore-session:
	@./.claude_workspace/sessions/restore-session.sh $(SESSION_ID)

list-sessions:
	@ls -la .claude_workspace/sessions/

# Performance monitoring
monitor:
	@./.claude_workspace/scripts/performance-monitor.sh

neural-train:
	@./.claude_workspace/scripts/neural-training.sh

# Weekly optimization
weekly-optimization:
	$(MAKE) neural-train
	$(MAKE) save-session SESSION_ID=weekly-backup-$(shell date +%Y%m%d)

# Hook Testing Framework Commands
.PHONY: test-hooks test-hooks-functional test-hooks-performance test-hooks-integration test-hooks-stress test-hooks-ci hooks-report

# Run complete hook testing suite
test-hooks:
	@echo "🔗 Running comprehensive hook testing framework..."
	@./tests/hooks/automation/run-hook-tests.sh
	$(MAKE) cf-post-task TASK_DESC="Complete hook testing suite"

# Run functional hook validation only
test-hooks-functional:
	@echo "🧪 Running functional hook validation..."
	@node tests/hooks/automation/hook-test-runner.js functional
	@echo "📊 Functional test results saved to .claude_workspace/reports/hook-tests/functional/"

# Run performance benchmarks only
test-hooks-performance:
	@echo "⚡ Running hook performance benchmarks..."
	@node tests/hooks/automation/hook-test-runner.js performance
	@echo "📊 Performance report saved to .claude_workspace/reports/hook-tests/performance/"

# Run integration tests with Playwright
test-hooks-integration:
	@echo "🔗 Running hook integration tests..."
	@npx playwright test tests/hooks/e2e/ --reporter=html --output-dir=.claude_workspace/reports/hook-tests/integration/
	$(MAKE) cf-post-task TASK_DESC="Hook integration testing"

# Run stress tests (long-running)
test-hooks-stress:
	@echo "💪 Running hook stress tests..."
	@node tests/hooks/automation/hook-test-runner.js stress
	@echo "🏋️ Stress test results saved to .claude_workspace/reports/hook-tests/stress/"

# Run hooks tests in CI/CD mode
test-hooks-ci:
	@echo "🚀 Running CI/CD hook validation..."
	@PARALLEL=true TIMEOUT=300 ./tests/hooks/automation/run-hook-tests.sh
	$(MAKE) cf-post-task TASK_DESC="CI/CD hook validation complete"

# Generate comprehensive hook testing report
hooks-report:
	@echo "📊 Generating comprehensive hook testing report..."
	@node tests/hooks/automation/hook-test-runner.js --output .claude_workspace/reports/hook-tests report
	@echo "📄 Report available at .claude_workspace/reports/hook-tests/hook-test-report.html"

# Quick hook validation (development mode)
hooks-dev:
	@echo "🛠️ Running development hook validation..."
	@SKIP_STRESS=true TIMEOUT=180 ./tests/hooks/automation/run-hook-tests.sh
	@echo "✅ Development hook validation complete"

# Testing and validation (legacy)
test-claude-flow:
	@./.claude_workspace/scripts/test-claude-flow.sh

benchmark:
	@./.claude_workspace/scripts/benchmark-claude-flow.sh
# CodeRabbit Integration (Simplified)
.PHONY: crr coderabbit-apply

# Quick CodeRabbit command - auto-detects PR and applies suggestions
crr:
	@./scripts/crr.sh $(ARGS)

# Apply CodeRabbit suggestions from specific PR
coderabbit-apply:
	@echo "🤖 Applying CodeRabbit suggestions from PR #$(PR)..."
	@OWNER=$$(git remote get-url origin | sed 's/.*github.com[:/]\([^/]*\).*/\1/') && \
	REPO=$$(git remote get-url origin | sed 's/.*github.com[:/][^/]*\/\([^.]*\).*/\1/') && \
	GITHUB_TOKEN=$$(gh auth token) node scripts/coderabbit-simple-apply.js $$OWNER $$REPO $(PR)