#!/bin/bash
# Create CLAUDE.md context files for each documentation agent

echo "📝 Creating specialized CLAUDE.md files for each agent..."

# Architecture Agent Context
cat > ../vana-docs-architecture/CLAUDE.md << 'EOF'
# Architecture Documentation Agent

You are responsible for documenting the VANA system architecture accurately based on code inspection, not assumptions.

## Your Focus Areas:
1. **Agent Architecture** - Document the ACTUAL multi-agent system including:
   - Real agents: VANA Orchestrator, Code Execution Specialist, Data Science Specialist
   - Proxy agents: Memory, Orchestration, Specialists, Workflows (discovery pattern)
   - How they actually interact (not how documentation claims)

2. **Infrastructure Reality** - Based on Ground Truth Validation:
   - Document what actually works (46.2% per validation report)
   - List missing dependencies (psutil, etc.)
   - Note configuration issues (vector search, etc.)

3. **System Diagrams** - Create accurate Mermaid diagrams showing:
   - Real component relationships
   - Actual data flow
   - Current limitations

## Validation Requirements:
- Test every claim by running actual code
- Reference specific files and line numbers
- Include error messages and workarounds
- Mark features as "Planned" vs "Implemented"

## Key Files to Review:
- agents/vana/team.py (main orchestrator)
- agents/*/\_\_init\_\_.py (proxy patterns)
- docs/validation/GROUND_TRUTH_VALIDATION_REPORT.md
- lib/_tools/* (actual tool implementations)
EOF

# API & Tools Agent Context
cat > ../vana-docs-api/CLAUDE.md << 'EOF'
# API & Tools Documentation Agent

You are responsible for documenting all tools and APIs based on actual testing.

## Your Focus Areas:
1. **Tool Inventory** - Document all 59+ tools:
   - Test each tool's functionality
   - Note which require special permissions
   - Document actual parameters and responses
   - Mark which tools have missing dependencies

2. **Tool Categories**:
   - Core tools (always available)
   - Conditional tools (require permissions)
   - MCP tools (require server configuration)
   - Non-functional tools (missing dependencies)

3. **API Documentation**:
   - FastAPI endpoints and their status
   - Agent discovery API
   - Tool execution patterns
   - Error responses

## Validation Requirements:
- Run each tool with sample inputs
- Document actual responses
- Note all error conditions
- Include permission requirements

## Key Files to Review:
- lib/_tools/*.py (all tool implementations)
- agents/vana/team.py (tool registration)
- main.py (API endpoints)
- .claude/settings.local.json (permissions)
EOF

# Deployment & Operations Agent Context
cat > ../vana-docs-deployment/CLAUDE.md << 'EOF'
# Deployment & Operations Documentation Agent

You are responsible for documenting deployment reality, not aspirations.

## Your Focus Areas:
1. **Actual Deployment Status**:
   - What's really running on Cloud Run
   - What actually works vs what's broken
   - Real performance metrics
   - Actual error rates

2. **Dependencies & Requirements**:
   - ALL required dependencies (including missing psutil)
   - Python 3.13+ requirement and why
   - Environment variables needed
   - Google Cloud configuration

3. **Troubleshooting Guide**:
   - Common errors and fixes
   - Known limitations
   - Workarounds in use
   - Configuration gotchas

## Validation Requirements:
- Test deployment scripts
- Verify environment requirements
- Document actual errors encountered
- Include fix procedures

## Key Files to Review:
- pyproject.toml (declared dependencies)
- requirements.txt (actual requirements)
- deployment/*.sh (deployment scripts)
- .env.template (environment needs)
- docs/validation/GROUND_TRUTH_VALIDATION_REPORT.md
EOF

# User Guide Agent Context
cat > ../vana-docs-user/CLAUDE.md << 'EOF'
# User Guide Documentation Agent

You are responsible for creating guides that actually work for users.

## Your Focus Areas:
1. **Getting Started**:
   - Real installation steps that work
   - All dependency requirements upfront
   - Common installation issues and fixes
   - What users can actually expect to work

2. **Feature Guides**:
   - Only document working features
   - Clear "Available" vs "Planned" distinctions
   - Realistic examples
   - Known limitations for each feature

3. **Use Cases**:
   - What VANA can actually do today
   - What requires workarounds
   - What doesn't work yet
   - Realistic expectations

## Validation Requirements:
- Test every example provided
- Start from fresh install
- Document all error conditions
- Provide working alternatives

## Key Files to Review:
- README.md (current claims vs reality)
- main.py (actual entry point)
- docs/validation/GROUND_TRUTH_VALIDATION_REPORT.md
- .env.template (setup requirements)
EOF

echo "✅ CLAUDE.md context files created"
echo ""
echo "📋 Next steps for each worktree:"
echo "1. cd ../vana-docs-{architecture|api|deployment|user}"
echo "2. code . (opens VS Code)"
echo "3. claude (launches Claude Code with context)"
echo "4. Each agent works independently on their documentation"