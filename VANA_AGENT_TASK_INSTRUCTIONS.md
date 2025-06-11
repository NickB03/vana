# VANA Project - Independent Agent Task Instructions

## **Agent 1: Week 5 Data Science Import Fix (CRITICAL)**

### **Objective**
Fix Google ADK import error preventing Data Science Specialist from functioning in Cloud Run deployment.

### **Background**
Week 5 Data Science Specialist is 95% complete but has a Cloud Run import issue. Agent appears in UI but cannot be used for conversations due to "Module data_science not found during import attempts" error.

### **Task Scope**
- **Files**: `agents/data_science/` directory only
- **Focus**: `__init__.py`, `specialist.py`, and import path resolution
- **Reference**: Use working Code Execution Specialist as template
- **Environment**: Deploy to vana-dev first, then validate

### **Validation Steps**
```bash
# Local validation
poetry run python -c "from agents.data_science import root_agent; print(root_agent.name)"
poetry run python -m pytest tests/integration/test_data_science_integration.py -v

# Cloud Run validation via Playwright
playwright_navigate_playwright(url="https://vana-dev-960076421399.us-central1.run.app")
# Verify Data Science Specialist appears in dropdown and responds to queries
```

### **Success Criteria**
- Data Science Specialist appears in Google ADK Dev UI
- Agent responds to data science queries
- All 4 tools functional: analyze_data, visualize_data, clean_data, model_data

### **Deliverables**
- Fixed import issue
- Functional validation screenshots
- Updated Memory Bank with resolution

---

## **Agent 2: Comprehensive Testing Framework Execution (HIGH PRIORITY)**

### **Objective**
Execute the existing comprehensive testing framework to validate all claimed agents and tools.

### **Background**
VANA claims 24 agents and 59+ tools but only has 5% validation coverage. A comprehensive testing framework exists in `tests/eval/` but hasn't been fully executed.

### **Task Scope**
- **Files**: `tests/eval/` directory (no modifications, execution only)
- **Framework**: Use existing `test_evaluation.py`, `agent_evaluator.py`
- **Scope**: Validate actual vs documented capabilities

### **Execution Steps**
```bash
cd /Users/nick/Development/vana
poetry run python tests/eval/run_evaluation.py --full --env dev
poetry run python tests/eval/test_evaluation.py
```

### **Success Criteria**
- Complete validation report for all claimed agents
- Actual tool count vs documented count
- Performance metrics (sub-5-second response times)
- Production readiness assessment

### **Deliverables**
- Comprehensive validation report in `tests/results/`
- Gap analysis between claimed vs actual functionality
- Performance benchmark results

---

## **Agent 3: Agent Discovery Investigation (MEDIUM PRIORITY)**

### **Objective**
Investigate why UI shows 5 agents vs backend claims 24 agents.

### **Background**
There's a discrepancy between what the Google ADK Dev UI shows (5 agents) and what the backend claims (24 agents). Need to understand actual vs documented capabilities.

### **Task Scope**
- **Investigation**: Agent discovery mechanism analysis
- **UI**: Google ADK Dev UI at https://vana-dev-960076421399.us-central1.run.app
- **Backend**: `agents/` directory structure analysis

### **Investigation Steps**
```bash
# Agent directory analysis
poetry run python -c "
import os
from pathlib import Path
agents_dir = Path('agents')
print(f'Agent directories: {list(agents_dir.iterdir())}')
"

# UI validation with Playwright
playwright_navigate_playwright(url="https://vana-dev-960076421399.us-central1.run.app")
playwright_screenshot_playwright(name="agent_discovery_ui", fullPage=true)
```

### **Success Criteria**
- Clear understanding of actual vs documented agent count
- Identification of agent discovery issues
- Documentation of functional vs non-functional agents

### **Deliverables**
- Agent discovery analysis report
- Actual vs claimed functionality matrix
- Agent registration recommendations

---

## **Agent 4: Performance Benchmarking (BACKGROUND TASK)**

### **Objective**
Execute performance benchmarks to validate sub-5-second response requirements.

### **Background**
System has performance requirements but needs systematic validation. Existing framework at `tests/eval/performance_benchmarks.py` needs execution.

### **Task Scope**
- **Framework**: Execute existing `performance_benchmarks.py` (665+ lines)
- **Metrics**: Response times, throughput, concurrent load
- **Target**: Sub-5-second response times

### **Execution Steps**
```bash
poetry run python tests/eval/performance_benchmarks.py --env dev --full
poetry run python tests/eval/performance_benchmarks.py --concurrent-users 10 --duration 300
```

### **Success Criteria**
- Average response times under 5 seconds
- System stability under load
- Bottleneck identification

### **Deliverables**
- Performance benchmark report
- Bottleneck analysis
- Optimization recommendations

---

## **Agent 5: MCP Integration Validation (BACKGROUND TASK)**

### **Objective**
Validate all MCP server integrations (GitHub, Brave Search, Fetch).

### **Background**
VANA has MCP integrations that need validation. Test existing integrations without modifications.

### **Task Scope**
- **Components**: GitHub, Brave Search, Fetch MCP servers
- **Testing**: Existing integrations only, no code changes
- **Validation**: Through Google ADK Dev UI

### **Testing Steps**
```bash
playwright_navigate_playwright(url="https://vana-dev-960076421399.us-central1.run.app")

# Test GitHub integration
playwright_fill_playwright(selector="textarea", value="Search for recent commits in this repository")
playwright_press_key_playwright(key="Enter")

# Test web search
playwright_fill_playwright(selector="textarea", value="What's the current weather in San Francisco?")
playwright_press_key_playwright(key="Enter")
```

### **Success Criteria**
- All MCP servers responding
- GitHub operations working
- Web search functional
- Error handling working

### **Deliverables**
- MCP integration validation report
- Server health metrics
- Troubleshooting guide

---

## **Agent 6: Memory Bank Consolidation (BACKGROUND TASK)**

### **Objective**
Consolidate and organize the 70+ Memory Bank files for clarity.

### **Background**
Memory Bank has grown to 70+ files and needs organization. Group by phase, priority, and completion status.

### **Task Scope**
- **Files**: `memory-bank/` directory organization only
- **Cleanup**: Remove outdated/duplicate information
- **Structure**: Group by logical categories

### **Organization Steps**
1. Analyze current Memory Bank structure
2. Group files by: Active, Completed, Historical, Planning
3. Create clear directory structure
4. Update cross-references
5. Create consolidated index

### **Success Criteria**
- Organized Memory Bank structure
- Clear handoff documentation
- Streamlined active context

### **Deliverables**
- Reorganized Memory Bank
- Consolidated progress tracking
- Clear next steps documentation

---

## **TASK INDEPENDENCE VERIFICATION**

✅ **Agent 1**: Works only on `agents/data_science/` - isolated from other tasks  
✅ **Agent 2**: Executes existing tests - no code modifications  
✅ **Agent 3**: Investigation only - no code changes  
✅ **Agent 4**: Runs existing benchmarks - no modifications  
✅ **Agent 5**: Tests existing MCP integrations - no changes  
✅ **Agent 6**: Documentation organization only - no code impact  

**All tasks can run simultaneously without conflicts.**

## **GENERAL REQUIREMENTS FOR ALL AGENTS**

### **Deployment Requirements**
- Deploy to vana-dev environment first: `https://vana-dev-960076421399.us-central1.run.app`
- Functional validation required before claiming success
- Follow VANA directory structure: `/agents/vana/`, `/lib/_tools/`, `/tests/automated/`
- Maintain Agent Zero architecture patterns

### **Testing Requirements**
- Use Playwright for browser automation testing
- Validate through Google ADK Dev UI
- Document all test results in Memory Bank
- Ensure sub-5-second response time compliance
- Provide screenshots and evidence for validations

### **Documentation Requirements**
- Update Memory Bank for each completed task
- Provide handoff instructions for next agent
- Document troubleshooting steps for common issues
- Include confidence levels and success metrics

### **Working Directory**
All commands should be run from: `/Users/nick/Development/vana`

### **Branch Information**
Current branch: `feature/comprehensive-testing-framework-integration`
