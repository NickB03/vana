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

# Deploy the agent remotely
# Usage: make backend [IAP=true] [PORT=8080] - Set IAP=true to enable Identity-Aware Proxy, PORT to specify container port
backend:
	PROJECT_ID=$$(gcloud config get-value project) && \
	gcloud beta run deploy my-project \
		--source . \
		--memory "4Gi" \
		--project $$PROJECT_ID \
		--region "us-central1" \
		--no-allow-unauthenticated \
		--no-cpu-throttling \
		--labels "created-by=adk" \
		--set-env-vars \
		"COMMIT_SHA=$(shell git rev-parse HEAD)" \
		$(if $(IAP),--iap) \
		$(if $(PORT),--port=$(PORT))

# Launch local development server with hot-reload
local-backend:
	uv run --env-file .env.local uvicorn app.server:app --host 0.0.0.0 --port 8000 --reload

# Set up development environment resources using Terraform
setup-dev-env:
	PROJECT_ID=$$(gcloud config get-value project) && \
	(cd deployment/terraform/dev && terraform init && terraform apply --var-file vars/env.tfvars --var dev_project_id=$$PROJECT_ID --auto-approve)

# Run unit and integration tests
test:
	uv run pytest tests/unit && uv run pytest tests/integration

# Run code quality checks (codespell, ruff, mypy)
lint:
	uv run codespell app/ tests/ *.md *.py --skip="venv/,.venv/,__pycache__/" --ignore-words-list="rouge,DAA,deques"
	uv run ruff check . --diff
	uv run ruff format . --check --diff
	uv run mypy .

# Run type checking
typecheck:
	uv run mypy .

# Claude Flow Hooks Integration
TASK_ID ?= $(shell date +%s)
SESSION_ID ?= session-$(shell date +%Y%m%d-%H%M%S)

.PHONY: cf-pre-task cf-post-task cf-pre-edit cf-post-edit cf-session-end

# Hook: Before starting any development task
cf-pre-task:
	@echo "🚀 Initializing Claude Flow task coordination..."
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

# Testing and validation
test-claude-flow:
	@./.claude_workspace/scripts/test-claude-flow.sh

benchmark:
	@./.claude_workspace/scripts/benchmark-claude-flow.sh