# **VANA Agent Enhancement Implementation Plan - Phases 1-3**

## **CRITICAL IMPLEMENTATION DIRECTIVES**

### **Mandatory Compliance Requirements**
1. **STRICT ADHERENCE**: Implement ONLY what is specified in this plan
2. **NO DEVIATIONS**: Any changes require explicit user approval
3. **VERIFICATION**: Every task requires double-checking against:
   - Context7 MCP Server (`/google/adk-docs`)
   - Official Google ADK documentation
4. **QUALITY GATES**: Each task must pass quality checks with confidence scoring

### **Verification Protocol**
Before marking ANY task complete, verify:
- [ ] Task completed exactly as specified
- [ ] No unauthorized deviations made
- [ ] Code follows Google ADK patterns
- [ ] Confidence Level: [HIGH/MEDIUM/LOW] with justification

---

## **PROGRESS TRACKING**

### **Phase 1 Status: NOT STARTED**
- [ ] Task 1.1: Content Creation Specialist Foundation
- [ ] Task 1.2: Research Specialist Foundation  
- [ ] Task 1.3: Update Enhanced Orchestrator
- [ ] Task 1.4: Integration Testing

### **Phase 2 Status: NOT STARTED**
- [ ] Task 2.1: Planning & Strategy Specialist
- [ ] Task 2.2: Business Analysis Specialist
- [ ] Task 2.3: Communication Specialist
- [ ] Task 2.4: Update Orchestrator for Phase 2

### **Phase 3 Status: NOT STARTED**
- [ ] Task 3.1: Implement Sequential Workflows
- [ ] Task 3.2: Implement Parallel Workflows
- [ ] Task 3.3: State Management Enhancement
- [ ] Task 3.4: Integration with Enhanced Orchestrator

---

## **PHASE 1: Core General Purpose Specialists**

### **Task 1.1: Content Creation Specialist Foundation**

**Status:** ⏳ NOT STARTED  
**Assignee:** TBD  
**Started:** N/A  
**Completed:** N/A  
**Confidence:** N/A  

**1.1.1 Create Tool Functions**
```python
# Location: lib/_tools/content_creation_tools.py
```

**Requirements:**
- Create 6 tool functions with ADK-compliant docstrings
- Each tool MUST return Dict[str, Any] with status/error pattern
- Tools MUST accept ToolContext parameter
- Verify against Context7: `/google/adk-docs` → "Tool Design Guidelines"

**Tools to implement:**
1. `write_document(doc_type: str, topic: str, requirements: str, word_count: int, tool_context: ToolContext) -> Dict[str, Any]`
2. `generate_outline(topic: str, depth: int, style: str, tool_context: ToolContext) -> Dict[str, Any]`
3. `edit_content(content: str, edit_type: str, instructions: str, tool_context: ToolContext) -> Dict[str, Any]`
4. `format_markdown(content: str, style: str, include_toc: bool, tool_context: ToolContext) -> Dict[str, Any]`
5. `check_grammar(content: str, style_guide: str, tool_context: ToolContext) -> Dict[str, Any]`
6. `improve_clarity(content: str, target_audience: str, tool_context: ToolContext) -> Dict[str, Any]`

**Verification Checklist:**
- [ ] Each function has detailed docstring (min 15 lines) with Args, Returns, Usage notes
- [ ] All functions handle errors and return status dict
- [ ] Functions use tool_context for state management
- [ ] Cross-reference with ADK docs: "Python Tool Function Definition Example"

**1.1.2 Create FunctionTool Wrappers**
```python
# Location: lib/_tools/content_creation_tools.py (bottom)
```

**Requirements:**
- Import `from google.adk.tools import FunctionTool`
- Create wrapped versions of all 6 tools
- Follow naming pattern: `adk_[tool_name]`
- Add to `__all__` export list

**Example:**
```python
adk_write_document = FunctionTool(write_document)
adk_write_document.name = "write_document"
```

**Verification:**
- [ ] All 6 tools wrapped correctly
- [ ] Names set explicitly
- [ ] Exported in `__all__`

**1.1.3 Create Content Creation Specialist Agent**
```python
# Location: agents/specialists/content_creation_specialist.py
```

**Requirements:**
- Use `from google.adk.agents import LlmAgent`
- Model: `gemini-2.5-flash`
- Include all 6 wrapped tools
- Instruction must be 20+ lines with specific guidance
- Description must differentiate from other specialists

**Verification:**
- [ ] Agent follows exact pattern from architecture_specialist.py
- [ ] Tools list has exactly 6 FunctionTool instances
- [ ] Cross-check with Context7: "LlmAgent Tool Configuration"

### **Task 1.2: Research Specialist Foundation**

**Status:** ⏳ NOT STARTED  
**Assignee:** TBD  
**Started:** N/A  
**Completed:** N/A  
**Confidence:** N/A  

**1.2.1 Create Research Tool Functions**
```python
# Location: lib/_tools/research_tools.py
```

**Tools to implement:**
1. `web_search_advanced(query: str, filters: Dict[str, Any], num_results: int, tool_context: ToolContext) -> Dict[str, Any]`
2. `analyze_sources(sources: List[str], credibility_check: bool, tool_context: ToolContext) -> Dict[str, Any]`
3. `extract_facts(content: str, topic: str, fact_type: str, tool_context: ToolContext) -> Dict[str, Any]`
4. `synthesize_findings(findings: List[Dict], format: str, tool_context: ToolContext) -> Dict[str, Any]`
5. `validate_information(claim: str, sources: List[str], tool_context: ToolContext) -> Dict[str, Any]`
6. `generate_citations(sources: List[Dict], style: str, tool_context: ToolContext) -> Dict[str, Any]`

**Verification:**
- [ ] Follow exact pattern from Task 1.1.1
- [ ] Integrate with existing web search tools where applicable
- [ ] State management for research context

**1.2.2 Create Research Specialist Agent**
```python
# Location: agents/specialists/research_specialist.py
```

**Requirements:**
- Mirror structure of content_creation_specialist.py
- Tools must support multi-step research workflows
- Include guidance on source credibility

### **Task 1.3: Update Enhanced Orchestrator**

**Status:** ⏳ NOT STARTED  
**Assignee:** TBD  
**Started:** N/A  
**Completed:** N/A  
**Confidence:** N/A  

**1.3.1 Modify Routing Logic**
```python
# Location: agents/vana/enhanced_orchestrator.py
```

**Specific Changes:**
1. Add to routing_map (line ~59):
```python
# Content creation patterns
"writing": content_creation_specialist,
"document": content_creation_specialist,
"report": content_creation_specialist,
"article": content_creation_specialist,
"content": content_creation_specialist,
# Research patterns  
"research": research_specialist,
"investigate": research_specialist,
"find_information": research_specialist,
"analyze_topic": research_specialist,
```

2. Add to specialist imports (line ~20):
```python
from agents.specialists.content_creation_specialist import content_creation_specialist
from agents.specialists.research_specialist import research_specialist
```

**Verification:**
- [ ] No other changes made to orchestrator
- [ ] Import statements correct
- [ ] Routing keywords comprehensive

### **Task 1.4: Integration Testing**

**Status:** ⏳ NOT STARTED  
**Assignee:** TBD  
**Started:** N/A  
**Completed:** N/A  
**Confidence:** N/A  

**1.4.1 Create Test Suite**
```python
# Location: tests/specialists/test_content_creation_specialist.py
# Location: tests/specialists/test_research_specialist.py
```

**Requirements:**
- Test each tool individually
- Test specialist agent routing
- Test error handling
- Follow pattern from `tests/unit/tools/test_agent_tools_comprehensive.py`

**1.4.2 Create Evaluation Sets**
```json
// Location: tests/evaluation/content_specialist_eval.json
// Location: tests/evaluation/research_specialist_eval.json
```

**Requirements:**
- 5 test cases per specialist
- Include expected tool calls with exact arguments
- Follow ADK evaluation format from docs

---

## **PHASE 2: Business & Productivity Specialists**

### **Task 2.1: Planning & Strategy Specialist**

**Status:** ⏳ NOT STARTED  
**Assignee:** TBD  
**Started:** N/A  
**Completed:** N/A  
**Confidence:** N/A  

**2.1.1 Create Planning Tools**
```python
# Location: lib/_tools/planning_tools.py
```

**Tools:**
1. `create_project_plan(project: str, scope: str, methodology: str, tool_context: ToolContext) -> Dict[str, Any]`
2. `generate_timeline(tasks: List[Dict], dependencies: List[str], tool_context: ToolContext) -> Dict[str, Any]`
3. `analyze_risks(project: str, risk_categories: List[str], tool_context: ToolContext) -> Dict[str, Any]`
4. `estimate_resources(tasks: List[Dict], resource_types: List[str], tool_context: ToolContext) -> Dict[str, Any]`
5. `create_milestones(project_plan: Dict, frequency: str, tool_context: ToolContext) -> Dict[str, Any]`
6. `generate_gantt_data(tasks: List[Dict], format: str, tool_context: ToolContext) -> Dict[str, Any]`

**2.1.2 Create Planning Specialist**
```python
# Location: agents/specialists/planning_specialist.py
```

### **Task 2.2: Business Analysis Specialist**

**Status:** ⏳ NOT STARTED  
**Assignee:** TBD  
**Started:** N/A  
**Completed:** N/A  
**Confidence:** N/A  

**2.2.1 Create Business Analysis Tools**
```python
# Location: lib/_tools/business_analysis_tools.py
```

**Tools:**
1. `analyze_business_case(description: str, metrics: List[str], tool_context: ToolContext) -> Dict[str, Any]`
2. `calculate_roi(investment: float, returns: List[float], period: int, tool_context: ToolContext) -> Dict[str, Any]`
3. `create_swot_analysis(entity: str, factors: Dict, tool_context: ToolContext) -> Dict[str, Any]`
4. `define_kpis(business_area: str, objectives: List[str], tool_context: ToolContext) -> Dict[str, Any]`
5. `market_analysis(market: str, competitors: List[str], tool_context: ToolContext) -> Dict[str, Any]`
6. `process_mapping(process: str, steps: List[Dict], tool_context: ToolContext) -> Dict[str, Any]`

### **Task 2.3: Communication Specialist**

**Status:** ⏳ NOT STARTED  
**Assignee:** TBD  
**Started:** N/A  
**Completed:** N/A  
**Confidence:** N/A  

**2.3.1 Create Communication Tools**
```python
# Location: lib/_tools/communication_tools.py
```

**Tools:**
1. `draft_email(recipient: str, subject: str, context: str, tone: str, tool_context: ToolContext) -> Dict[str, Any]`
2. `create_presentation_outline(topic: str, duration: int, audience: str, tool_context: ToolContext) -> Dict[str, Any]`
3. `generate_meeting_agenda(meeting_type: str, participants: List[str], duration: int, tool_context: ToolContext) -> Dict[str, Any]`
4. `format_proposal(content: str, proposal_type: str, tool_context: ToolContext) -> Dict[str, Any]`
5. `review_tone(content: str, desired_tone: str, tool_context: ToolContext) -> Dict[str, Any]`
6. `create_template(template_type: str, variables: List[str], tool_context: ToolContext) -> Dict[str, Any]`

### **Task 2.4: Update Orchestrator for Phase 2**

**Status:** ⏳ NOT STARTED  
**Assignee:** TBD  
**Started:** N/A  
**Completed:** N/A  
**Confidence:** N/A  

**Requirements:**
- Add all three new specialists to imports
- Update routing_map with business keywords
- Maintain existing routing logic

---

## **PHASE 3: Workflow Integration**

### **Task 3.1: Implement Sequential Workflows**

**Status:** ⏳ NOT STARTED  
**Assignee:** TBD  
**Started:** N/A  
**Completed:** N/A  
**Confidence:** N/A  

**3.1.1 Create Research-to-Document Workflow**
```python
# Location: agents/workflows/research_to_document_workflow.py
```

**Requirements:**
- Use `from google.adk.agents import SequentialAgent, LlmAgent`
- Chain: research_step → outline_step → writing_step → review_step
- Each step uses `output_key` for state propagation
- Follow pattern from `agents/workflows/sequential_workflow_manager.py`

**3.1.2 Create Planning-to-Execution Workflow**
```python
# Location: agents/workflows/planning_execution_workflow.py
```

### **Task 3.2: Implement Parallel Workflows**

**Status:** ⏳ NOT STARTED  
**Assignee:** TBD  
**Started:** N/A  
**Completed:** N/A  
**Confidence:** N/A  

**3.2.1 Create Multi-Source Research Workflow**
```python
# Location: agents/workflows/parallel_research_workflow.py
```

**Requirements:**
- Use `from google.adk.agents import ParallelAgent`
- Parallel agents: web_research, document_research, data_research
- Aggregation step to combine results

### **Task 3.3: State Management Enhancement**

**Status:** ⏳ NOT STARTED  
**Assignee:** TBD  
**Started:** N/A  
**Completed:** N/A  
**Confidence:** N/A  

**3.3.1 Create State Management Tools**
```python
# Location: lib/_tools/state_management_tools.py
```

**Tools:**
1. `save_user_preference(key: str, value: Any, tool_context: ToolContext) -> Dict[str, Any]`
2. `get_user_preference(key: str, default: Any, tool_context: ToolContext) -> Dict[str, Any]`
3. `save_workflow_state(workflow_id: str, state: Dict, tool_context: ToolContext) -> Dict[str, Any]`

**Requirements:**
- Use proper ADK state prefixes (user:, app:, temp:)
- Handle state persistence correctly

### **Task 3.4: Integration with Enhanced Orchestrator**

**Status:** ⏳ NOT STARTED  
**Assignee:** TBD  
**Started:** N/A  
**Completed:** N/A  
**Confidence:** N/A  

**3.4.1 Add Workflow Managers**
```python
# Location: agents/vana/enhanced_orchestrator.py
```

**Add to sub_agents:**
- research_to_document_workflow
- planning_execution_workflow  
- parallel_research_workflow

**Update routing logic:**
- Detect multi-step requests
- Route to appropriate workflow

---

## **QUALITY ASSURANCE PROTOCOL**

### **For Each Task Completion:**

1. **ADK Compliance Check**
   - [ ] Verify against Context7 MCP: `/google/adk-docs`
   - [ ] Cross-reference specific ADK patterns used
   - [ ] Document which ADK examples followed

2. **Code Quality Verification**
   - [ ] Run: `poetry run black [modified_files]`
   - [ ] Run: `poetry run flake8 [modified_files]`
   - [ ] Run: `poetry run mypy [modified_files]`
   - [ ] Run: `poetry run pytest -m unit`

3. **Confidence Assessment**
   ```
   Confidence Level: [HIGH/MEDIUM/LOW]
   Justification: [Specific reasons]
   ADK Patterns Used: [List specific patterns]
   Deviations: [None or list with user approval reference]
   ```

### **Deviation Protocol**
If deviation needed:
1. STOP implementation
2. Document exact deviation needed
3. Get user approval with justification
4. Only proceed after explicit approval

### **Final Phase Validation**
After each phase:
1. Run full test suite
2. Verify all specialists respond correctly
3. Test orchestrator routing
4. Document any issues for user review

---

## **CRITICAL REMINDERS**

1. **DO NOT** create any functionality not explicitly listed
2. **DO NOT** modify existing code beyond specified changes
3. **ALWAYS** verify tool signatures match ADK patterns
4. **ALWAYS** use ToolContext for state management
5. **NEVER** exceed 6 tools per agent
6. **ALWAYS** wrap functions with FunctionTool

This plan is your CONTRACT. Follow it exactly.

---

## **IMPLEMENTATION LOG**

### **Entry Template**
```
Date: YYYY-MM-DD
Task: [Task Number and Name]
Implementer: [AI Agent ID/Name]
Status: [Started/In Progress/Completed/Blocked]
Changes Made:
- [List specific files and changes]
Verification Results:
- ADK Compliance: [PASS/FAIL] - [Details]
- Quality Checks: [PASS/FAIL] - [Details]
- Tests: [PASS/FAIL] - [X/Y tests passing]
Confidence: [HIGH/MEDIUM/LOW]
Notes: [Any important observations or issues]
```

### **Implementation Entries**

<!-- Add new entries below this line -->

---

## **DEVIATION LOG**

### **Deviation Template**
```
Date: YYYY-MM-DD
Task: [Task Number]
Requested By: [AI Agent ID]
Deviation Description: [Exact change needed]
Reason: [Why deviation is necessary]
User Approval: [YES/NO] - [Timestamp]
Approval Reference: [Link or quote]
```

### **Approved Deviations**

<!-- Add approved deviations below this line -->

---

Last Updated: 2025-01-15
Plan Version: 1.0.0