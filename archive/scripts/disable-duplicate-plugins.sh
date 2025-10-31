#!/bin/bash
# Script to disable duplicate plugins from claude-code-workflows marketplace
# This keeps the official Anthropic plugins and disables the duplicate versions

echo "🔍 Disabling duplicate plugins from claude-code-workflows marketplace..."
echo ""

# Strategy: Keep official plugins, disable workflows versions
# Disable plugins that appear in BOTH marketplaces

# List of plugins to disable from claude-code-workflows
# These are duplicates of official or other marketplace plugins
DUPLICATES=(
  "code-documentation:code-reviewer"
  "code-documentation:docs-architect"
  "code-documentation:tutorial-engineer"
  "debugging-toolkit:debugger"
  "debugging-toolkit:dx-optimizer"
  "git-pr-workflows:code-reviewer"
  "backend-development:backend-architect"
  "backend-development:tdd-orchestrator"
  "backend-development:graphql-architect"
  "full-stack-orchestration:test-automator"
  "full-stack-orchestration:performance-engineer"
  "full-stack-orchestration:security-auditor"
  "full-stack-orchestration:deployment-engineer"
  "unit-testing:test-automator"
  "unit-testing:debugger"
  "tdd-workflows:code-reviewer"
  "tdd-workflows:tdd-orchestrator"
  "code-review-ai:architect-review"
  "code-refactoring:code-reviewer"
  "code-refactoring:legacy-modernizer"
  "dependency-management:legacy-modernizer"
  "error-debugging:debugger"
  "error-debugging:error-detective"
  "team-collaboration:dx-optimizer"
  "llm-application-dev:prompt-engineer"
  "llm-application-dev:ai-engineer"
  "agent-orchestration:context-manager"
  "context-management:context-manager"
  "error-diagnostics:debugger"
  "error-diagnostics:error-detective"
  "observability-monitoring:performance-engineer"
  "observability-monitoring:database-optimizer"
  "observability-monitoring:observability-engineer"
  "observability-monitoring:network-engineer"
  "deployment-strategies:terraform-specialist"
  "deployment-strategies:deployment-engineer"
  "deployment-validation:cloud-architect"
  "cloud-infrastructure:terraform-specialist"
  "cloud-infrastructure:kubernetes-architect"
  "cloud-infrastructure:hybrid-cloud-architect"
  "cloud-infrastructure:cloud-architect"
  "cloud-infrastructure:deployment-engineer"
  "cloud-infrastructure:network-engineer"
  "cicd-automation:terraform-specialist"
  "cicd-automation:kubernetes-architect"
  "cicd-automation:cloud-architect"
  "cicd-automation:deployment-engineer"
  "cicd-automation:devops-troubleshooter"
  "application-performance:performance-engineer"
  "application-performance:observability-engineer"
  "application-performance:frontend-developer"
  "comprehensive-review:code-reviewer"
  "comprehensive-review:architect-review"
  "comprehensive-review:security-auditor"
  "performance-testing-review:test-automator"
  "performance-testing-review:performance-engineer"
  "framework-migration:legacy-modernizer"
  "framework-migration:architect-review"
  "codebase-cleanup:code-reviewer"
  "codebase-cleanup:test-automator"
  "database-design:database-architect"
  "database-design:sql-pro"
  "security-scanning:security-auditor"
  "backend-api-security:backend-architect"
  "backend-api-security:backend-security-coder"
  "data-validation-suite:backend-security-coder"
  "api-scaffolding:backend-architect"
  "api-scaffolding:fastapi-pro"
  "api-scaffolding:django-pro"
  "api-scaffolding:graphql-architect"
  "api-testing-observability:api-documenter"
  "documentation-generation:reference-builder"
  "documentation-generation:docs-architect"
  "documentation-generation:api-documenter"
  "documentation-generation:tutorial-engineer"
  "documentation-generation:mermaid-expert"
  "multi-platform-apps:backend-architect"
  "multi-platform-apps:ios-developer"
  "multi-platform-apps:flutter-expert"
  "multi-platform-apps:ui-ux-designer"
  "multi-platform-apps:mobile-developer"
  "multi-platform-apps:frontend-developer"
  "python-development:fastapi-pro"
  "python-development:django-pro"
  "python-development:python-pro"
  "systems-programming:golang-pro"
  "systems-programming:cpp-pro"
  "systems-programming:rust-pro"
  "systems-programming:c-pro"
  "web-scripting:ruby-pro"
  "web-scripting:php-pro"
  "shell-scripting:posix-shell-pro"
  "shell-scripting:bash-pro"
  "frontend-mobile-development:mobile-developer"
  "frontend-mobile-development:frontend-developer"
  "frontend-mobile-security:mobile-security-coder"
  "frontend-mobile-security:frontend-security-coder"
  "frontend-mobile-security:frontend-developer"
  "javascript-typescript:javascript-pro"
  "javascript-typescript:typescript-pro"
  "data-engineering:backend-architect"
  "data-engineering:data-engineer"
  "database-cloud-optimization:backend-architect"
  "database-cloud-optimization:database-architect"
  "database-cloud-optimization:database-optimizer"
  "database-cloud-optimization:cloud-architect"
  "security-compliance:security-auditor"
  "content-marketing:search-specialist"
  "content-marketing:content-marketer"
  "accessibility-compliance:ui-visual-validator"
  "functional-programming:elixir-pro"
)

echo "📊 Total duplicates to disable: ${#DUPLICATES[@]}"
echo ""

# Ask for confirmation
read -p "⚠️  This will disable all duplicate plugins from claude-code-workflows. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Aborted"
  exit 1
fi

echo ""
echo "🔧 Disabling duplicates..."
echo ""

# Counter for tracking
SUCCESS=0
FAILED=0

# Disable each duplicate
for plugin in "${DUPLICATES[@]}"; do
  # Add marketplace prefix
  FULL_NAME="claude-code-workflows:$plugin"

  echo "  Disabling: $FULL_NAME"

  # Try to disable the plugin
  if claude plugin disable "$FULL_NAME" 2>&1 | grep -q "disabled\|already disabled"; then
    ((SUCCESS++))
  else
    ((FAILED++))
    echo "    ⚠️  Failed to disable $FULL_NAME"
  fi
done

echo ""
echo "✅ Complete!"
echo "  • Successfully disabled: $SUCCESS"
echo "  • Failed: $FAILED"
echo ""
echo "Run '/doctor' in Claude Code to verify the changes."
