# Shell Script Validator - Makefile
# 
# This Makefile provides common tasks for the shell script validator,
# including installation, testing, and integration with development workflows.

.PHONY: help install test test-unit test-integration test-performance lint format
.PHONY: validate validate-project install-hooks uninstall-hooks clean docs
.PHONY: package release check-dependencies demo

# Configuration
PYTHON := python3
PIP := pip3
PROJECT_ROOT := $(shell pwd)/../..
VALIDATOR_DIR := $(shell pwd)
TEST_DIR := $(PROJECT_ROOT)/tests/shell-validator
SCRIPTS_DIR := $(PROJECT_ROOT)/scripts

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# Default target
help: ## Show this help message
	@echo "$(BLUE)Shell Script Validator - Available Commands$(NC)"
	@echo "=============================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# Installation and setup
install: ## Install the shell validator and dependencies
	@echo "$(BLUE)📦 Installing Shell Script Validator...$(NC)"
	$(PIP) install -r requirements.txt
	chmod +x $(VALIDATOR_DIR)/cli.py
	chmod +x $(VALIDATOR_DIR)/shell_validator.py
	@echo "$(GREEN)✅ Installation complete$(NC)"

check-dependencies: ## Check if all dependencies are installed
	@echo "$(BLUE)🔍 Checking dependencies...$(NC)"
	@$(PYTHON) -c "import json, pathlib, dataclasses, enum, subprocess, unittest" && \
		echo "$(GREEN)✅ All Python dependencies available$(NC)" || \
		(echo "$(RED)❌ Missing Python dependencies$(NC)" && exit 1)
	@command -v git >/dev/null 2>&1 && \
		echo "$(GREEN)✅ Git is available$(NC)" || \
		echo "$(YELLOW)⚠️  Git not found - Git hooks integration will not work$(NC)"

# Testing
test: test-unit test-integration test-performance ## Run all tests

test-unit: ## Run unit tests
	@echo "$(BLUE)🧪 Running unit tests...$(NC)"
	cd $(TEST_DIR) && $(PYTHON) -m unittest test_shell_validator.TestShellValidationRules -v
	cd $(TEST_DIR) && $(PYTHON) -m unittest test_shell_validator.TestShellValidator -v
	cd $(TEST_DIR) && $(PYTHON) -m unittest test_shell_validator.TestValidationResult -v
	@echo "$(GREEN)✅ Unit tests completed$(NC)"

test-integration: ## Run integration tests
	@echo "$(BLUE)🔗 Running integration tests...$(NC)"
	cd $(TEST_DIR) && $(PYTHON) -m unittest test_shell_validator.TestGitHooksIntegration -v
	cd $(TEST_DIR) && $(PYTHON) -m unittest test_shell_validator.TestReportGeneration -v
	@echo "$(GREEN)✅ Integration tests completed$(NC)"

test-performance: ## Run performance benchmarks
	@echo "$(BLUE)⚡ Running performance tests...$(NC)"
	cd $(TEST_DIR) && $(PYTHON) -m unittest test_shell_validator.TestPerformanceBenchmarks -v
	@echo "$(GREEN)✅ Performance tests completed$(NC)"

test-real-world: ## Test against real-world scripts
	@echo "$(BLUE)🌍 Testing against real-world scripts...$(NC)"
	cd $(TEST_DIR) && $(PYTHON) -m unittest test_shell_validator.TestRealWorldScripts -v
	@echo "$(GREEN)✅ Real-world tests completed$(NC)"

# Validation commands
validate: ## Validate all shell scripts in the project
	@echo "$(BLUE)🔍 Validating project shell scripts...$(NC)"
	$(PYTHON) $(VALIDATOR_DIR)/cli.py validate --directory $(PROJECT_ROOT) \
		--exclude node_modules --exclude .git --exclude build --exclude dist
	@echo "$(GREEN)✅ Project validation completed$(NC)"

validate-scripts: ## Validate scripts in the scripts directory
	@echo "$(BLUE)🔍 Validating scripts directory...$(NC)"
	$(PYTHON) $(VALIDATOR_DIR)/cli.py validate --directory $(SCRIPTS_DIR)
	@echo "$(GREEN)✅ Scripts validation completed$(NC)"

validate-file: ## Validate a specific file (usage: make validate-file FILE=path/to/script.sh)
ifndef FILE
	@echo "$(RED)❌ Please specify FILE=path/to/script.sh$(NC)"
	@exit 1
endif
	@echo "$(BLUE)🔍 Validating $(FILE)...$(NC)"
	$(PYTHON) $(VALIDATOR_DIR)/cli.py validate $(FILE)

validate-with-report: ## Validate project and generate HTML report
	@echo "$(BLUE)🔍 Validating project with HTML report...$(NC)"
	$(PYTHON) $(VALIDATOR_DIR)/cli.py validate --directory $(PROJECT_ROOT) \
		--format html --output validation-report.html \
		--exclude node_modules --exclude .git --exclude build --exclude dist
	@echo "$(GREEN)📄 HTML report generated: validation-report.html$(NC)"

# Git hooks management
install-hooks: ## Install Git pre-commit hooks
	@echo "$(BLUE)🔗 Installing Git hooks...$(NC)"
	$(PYTHON) $(VALIDATOR_DIR)/git_hooks.py install --hook-type both --project-root $(PROJECT_ROOT)
	@echo "$(GREEN)✅ Git hooks installed$(NC)"

install-pre-commit-hook: ## Install only pre-commit hook
	@echo "$(BLUE)🔗 Installing pre-commit hook...$(NC)"
	$(PYTHON) $(VALIDATOR_DIR)/git_hooks.py install --hook-type pre-commit --project-root $(PROJECT_ROOT)
	@echo "$(GREEN)✅ Pre-commit hook installed$(NC)"

install-pre-push-hook: ## Install only pre-push hook
	@echo "$(BLUE)🔗 Installing pre-push hook...$(NC)"
	$(PYTHON) $(VALIDATOR_DIR)/git_hooks.py install --hook-type pre-push --project-root $(PROJECT_ROOT)
	@echo "$(GREEN)✅ Pre-push hook installed$(NC)"

uninstall-hooks: ## Uninstall Git hooks
	@echo "$(BLUE)🗑️  Uninstalling Git hooks...$(NC)"
	$(PYTHON) $(VALIDATOR_DIR)/git_hooks.py uninstall --project-root $(PROJECT_ROOT)
	@echo "$(GREEN)✅ Git hooks uninstalled$(NC)"

# Development tools
lint: ## Run linter on validator code
	@echo "$(BLUE)🔍 Running linter...$(NC)"
	@command -v flake8 >/dev/null 2>&1 && \
		flake8 $(VALIDATOR_DIR)/*.py --max-line-length=100 --ignore=E501,W503 || \
		echo "$(YELLOW)⚠️  flake8 not found, skipping linting$(NC)"
	@command -v pylint >/dev/null 2>&1 && \
		pylint $(VALIDATOR_DIR)/*.py --disable=C0103,R0903,R0913 || \
		echo "$(YELLOW)⚠️  pylint not found, skipping pylint checks$(NC)"

format: ## Format code using black (if available)
	@echo "$(BLUE)🎨 Formatting code...$(NC)"
	@command -v black >/dev/null 2>&1 && \
		black $(VALIDATOR_DIR)/*.py --line-length=100 || \
		echo "$(YELLOW)⚠️  black not found, skipping formatting$(NC)"

# Documentation
docs: ## Generate documentation
	@echo "$(BLUE)📚 Generating documentation...$(NC)"
	@mkdir -p docs
	@echo "# Shell Validator API Reference" > docs/api-reference.txt
	@echo "Generated on $$(date)" >> docs/api-reference.txt
	@echo "" >> docs/api-reference.txt
	@echo "## Available Rules" >> docs/api-reference.txt
	@echo "- SV001: UnquotedVariableRule" >> docs/api-reference.txt
	@echo "- SV002: UnsafeRedirectionRule" >> docs/api-reference.txt
	@echo "- SV003: MissingSetOptionsRule" >> docs/api-reference.txt
	@echo "- SV004: CommandSubstitutionRule" >> docs/api-reference.txt
	@echo "- SV005: ArrayUsageRule" >> docs/api-reference.txt
	@echo "- SV006: VariableNamingRule" >> docs/api-reference.txt
	@echo "- SV007: UnsafeCurlPipeRule" >> docs/api-reference.txt
	@echo "- SV008: EnhancedUnquotedVariableRule" >> docs/api-reference.txt
	@echo "- SV009: MultipleRedirectsRule" >> docs/api-reference.txt
	@echo "- SV010: CommandSubstitutionAssignmentRule" >> docs/api-reference.txt
	@echo "- SV011: UselessCatRule" >> docs/api-reference.txt
	@echo "$(GREEN)📄 Documentation generated in docs/$(NC)"

# Demo and examples
demo: ## Run a demo validation on sample scripts
	@echo "$(BLUE)🎬 Running validation demo...$(NC)"
	@mkdir -p demo
	@echo '#!/bin/bash' > demo/good-script.sh
	@echo 'set -e' >> demo/good-script.sh
	@echo 'echo "Hello, $$USER"' >> demo/good-script.sh
	@echo '#!/bin/bash' > demo/bad-script.sh
	@echo 'echo $$USER' >> demo/bad-script.sh
	@echo 'if [ $$HOME == "/root" ]; then' >> demo/bad-script.sh
	@echo '    echo "Root user"' >> demo/bad-script.sh
	@echo 'fi' >> demo/bad-script.sh
	@echo "$(GREEN)📝 Sample scripts created in demo/$(NC)"
	@echo "$(BLUE)🔍 Validating good script:$(NC)"
	$(PYTHON) $(VALIDATOR_DIR)/cli.py validate demo/good-script.sh || true
	@echo "$(BLUE)🔍 Validating bad script:$(NC)"
	$(PYTHON) $(VALIDATOR_DIR)/cli.py validate demo/bad-script.sh || true
	@echo "$(GREEN)🎉 Demo completed$(NC)"

# Packaging and distribution
package: ## Create distribution package
	@echo "$(BLUE)📦 Creating distribution package...$(NC)"
	@mkdir -p dist
	tar -czf dist/shell-validator.tar.gz \
		--exclude="__pycache__" \
		--exclude="*.pyc" \
		--exclude=".git" \
		-C $(VALIDATOR_DIR) .
	@echo "$(GREEN)📦 Package created: dist/shell-validator.tar.gz$(NC)"

# Cleanup
clean: ## Clean up generated files
	@echo "$(BLUE)🧹 Cleaning up...$(NC)"
	find $(VALIDATOR_DIR) -type f -name "*.pyc" -delete
	find $(VALIDATOR_DIR) -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	rm -rf dist/
	rm -rf demo/
	rm -f validation-report.html
	rm -f .git/shell-validation-report.json
	@echo "$(GREEN)✅ Cleanup completed$(NC)"

# Continuous Integration targets
ci-test: check-dependencies test ## Run all tests for CI
	@echo "$(GREEN)✅ All CI tests passed$(NC)"

ci-validate: ## Validate project for CI (fail on critical issues)
	@echo "$(BLUE)🔍 CI validation with strict rules...$(NC)"
	$(PYTHON) $(VALIDATOR_DIR)/cli.py validate --directory $(PROJECT_ROOT) \
		--exclude node_modules --exclude .git --exclude build --exclude dist \
		--format json | jq '.summary.critical_issues == 0' > /dev/null
	@echo "$(GREEN)✅ CI validation passed$(NC)"

# Quick commands
quick-check: ## Quick validation of common script locations
	@echo "$(BLUE)⚡ Quick validation check...$(NC)"
	@find $(PROJECT_ROOT) -name "*.sh" -type f -not -path "*/node_modules/*" \
		-not -path "*/.git/*" -exec $(PYTHON) $(VALIDATOR_DIR)/cli.py validate {} \; | \
		grep -E "(CRITICAL|WARNING)" || echo "$(GREEN)✅ No issues found$(NC)"

status: ## Show validator status and configuration
	@echo "$(BLUE)📊 Shell Validator Status$(NC)"
	@echo "========================="
	@echo "Validator location: $(VALIDATOR_DIR)"
	@echo "Project root: $(PROJECT_ROOT)"
	@echo "Python version: $$($(PYTHON) --version)"
	@echo "Git repository: $$(test -d $(PROJECT_ROOT)/.git && echo 'Yes' || echo 'No')"
	@echo "Git hooks installed: $$(test -f $(PROJECT_ROOT)/.git/hooks/pre-commit && echo 'Yes' || echo 'No')"
	@echo "Configuration file: $$(test -f $(VALIDATOR_DIR)/config.json && echo 'Found' || echo 'Missing')"

# Integration with project Makefile
integrate: ## Add shell validation to project Makefile
	@echo "$(BLUE)🔧 Integrating with project Makefile...$(NC)"
	@echo "" >> $(PROJECT_ROOT)/Makefile
	@echo "# Shell Script Validation (auto-added)" >> $(PROJECT_ROOT)/Makefile
	@echo "validate-shell-scripts:" >> $(PROJECT_ROOT)/Makefile
	@echo "\t@make -C src/shell-validator validate" >> $(PROJECT_ROOT)/Makefile
	@echo "install-shell-hooks:" >> $(PROJECT_ROOT)/Makefile
	@echo "\t@make -C src/shell-validator install-hooks" >> $(PROJECT_ROOT)/Makefile
	@echo "$(GREEN)✅ Integrated with project Makefile$(NC)"
	@echo "$(BLUE)ℹ️  You can now run 'make validate-shell-scripts' from project root$(NC)"