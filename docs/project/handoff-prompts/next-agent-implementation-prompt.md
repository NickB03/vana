# VANA Repository Cleanup & Enhancement - Next Agent Implementation Prompt

## 🎯 YOUR MISSION

You are the Implementation Agent for the VANA project. Your mission is to clean up massive repository file sprawl and implement AI agent best practices to enhance the current working system.

**CRITICAL**: You must proceed ONLY from the current working path. Do NOT explore other approaches or experimental implementations.

## 📋 MANDATORY FIRST STEP: SEQUENTIAL THINKING

Before taking ANY action, you MUST use the Sequential Thinking tool to create a comprehensive plan. Analyze:

1. **Repository Structure Assessment**
2. **Cleanup Strategy Development**
3. **Enhancement Implementation Strategy**
4. **Risk Assessment and Mitigation**
5. **Validation Approach**

## 🎯 CONTEXT & BACKGROUND

### **WORKING SYSTEM IDENTIFIED** ✅
- **Location**: `/vana_multi_agent/` directory
- **Status**: Operational at http://localhost:8080
- **Architecture**: 5-agent system (Vana orchestrator + 4 specialists)
- **Agents**: Vana, Rhea (Architecture), Max (UI/UX), Sage (DevOps), Kai (QA)
- **Tools**: 16 enhanced ADK-compatible tools
- **Tests**: All passing (4/4)

### **CRITICAL ISSUE: MASSIVE FILE SPRAWL** ❌
Repository contains extensive experimental directories and outdated implementations:
- `/vana_adk_clean/` - Previous iteration
- `/Project Setup/` - Setup experiments
- `/vana_minimal/` - Minimal version experiments
- `/docs/backup/` - Backup documentation
- Multiple conflicting versions of similar components

### **AI AGENT BEST PRACTICES ANALYSIS COMPLETED** ✅
Comprehensive analysis identified proven enhancement patterns from leading AI tools:

#### **From Cline**: Mode-Based Operation
- **PLAN MODE**: Gather information, analyze requirements, create execution plans
- **ACT MODE**: Execute plans through agent coordination and task delegation

#### **From Cursor**: Tool Standardization
- Consistent parameter schemas with required/optional marking
- Comprehensive error handling and fallback mechanisms

#### **From Manus**: Agent Specialization
- Clear identity and role definition
- Explicit capability boundaries and handoff protocols

#### **From Devin**: Coordination Intelligence
- Classification-based routing with confidence scoring
- Error recovery and retry mechanisms

#### **From v0**: Documentation Patterns
- Comprehensive tool documentation with usage examples

## 🚀 YOUR IMPLEMENTATION PLAN

### **PHASE 1: SEQUENTIAL THINKING ANALYSIS** ⚡ **(REQUIRED FIRST)**

Use the Sequential Thinking tool to analyze:

```
1. Repository Structure Assessment:
   - Map all directories and their purposes
   - Identify working vs experimental components
   - Assess documentation scattered across locations

2. Cleanup Strategy:
   - Plan systematic preservation of working components
   - Design backup strategy for removed components
   - Create consolidation plan for documentation

3. Enhancement Strategy:
   - Plan application of AI agent best practices
   - Prioritize enhancements by impact and complexity
   - Design validation approach for each change

4. Risk Assessment:
   - Identify potential issues with cleanup
   - Plan mitigation strategies
   - Design rollback procedures

5. Implementation Timeline:
   - Break down work into manageable phases
   - Set validation checkpoints
   - Plan testing approach
```

### **PHASE 2: REPOSITORY CLEANUP** 🧹

#### **Preserve ONLY These Components**:
- `/vana_multi_agent/` - Current working system
- `/memory-bank/` - Project memory and documentation
- `/docs/project/` - Project documentation and plans
- `/tests/` - Test suites (if applicable to current system)
- Root configuration files (`.env`, `requirements.txt`, etc.)

#### **Remove/Archive These Components**:
- `/vana_adk_clean/` - Previous iteration
- `/Project Setup/` - Setup experiments
- `/vana_minimal/` - Minimal version experiments
- `/docs/backup/` - Backup documentation
- Any other experimental directories identified

#### **Consolidate Documentation**:
- Merge scattered documentation into coherent structure
- Update all references to point to working system
- Remove outdated documentation

### **PHASE 3: APPLY AI AGENT BEST PRACTICES** 🎯

#### **Priority 1: Orchestrator Enhancement**
**File**: `/vana_multi_agent/agents/team.py` (Vana orchestrator)

**Apply Cline + Devin patterns**:
- Add PLAN/ACT mode management
- Implement routing intelligence with confidence scoring
- Add error recovery and graceful degradation
- Implement context tracking across agent interactions

#### **Priority 2: Tool Standardization**
**File**: `/vana_multi_agent/tools/adk_tools.py`

**Apply Cursor + v0 patterns**:
- Standardize parameter schemas with required/optional marking
- Add comprehensive error handling with recovery guidance
- Improve tool documentation with usage examples
- Implement context-aware tool selection

#### **Priority 3: Agent Specialization**
**File**: `/vana_multi_agent/agents/team.py` (All specialist agents)

**Apply Manus patterns**:
- Clear identity and role definition for each agent
- Explicit capability boundaries and limitations
- Standardized handoff protocols between agents
- Enhanced coordination patterns

## 📁 CRITICAL FILES TO FOCUS ON

### **Working System Files** (PRESERVE & ENHANCE):
1. `/vana_multi_agent/agents/team.py` - Agent definitions and system prompts
2. `/vana_multi_agent/tools/adk_tools.py` - Tool implementations
3. `/vana_multi_agent/main.py` - System entry point
4. `/vana_multi_agent/__init__.py` - Package initialization

### **Documentation Files** (CONSOLIDATE):
1. `/memory-bank/activeContext.md` - Current project status
2. `/memory-bank/systemPatterns.md` - System architecture
3. `/docs/project/` - Project documentation
4. Root README.md - Update to reflect cleaned structure

## ⚠️ CRITICAL CONSTRAINTS

1. **PRESERVE WORKING SYSTEM**: Never modify working system until cleanup is complete
2. **BACKUP BEFORE REMOVAL**: Create backup of removed components
3. **INCREMENTAL VALIDATION**: Test system after each enhancement
4. **MAINTAIN ADK COMPLIANCE**: All changes must preserve ADK compatibility
5. **DOCUMENT CHANGES**: Update documentation for each modification

## 📋 SUCCESS CRITERIA

### **Repository Cleanup Success**:
- ✅ Repository contains only working system components
- ✅ All experimental/outdated directories removed or archived
- ✅ Documentation consolidated and coherent
- ✅ Working system remains operational at http://localhost:8080

### **Enhancement Success**:
- ✅ Mode management implemented in orchestrator
- ✅ Tool standardization completed with comprehensive error handling
- ✅ Agent specialization enhanced with clear boundaries
- ✅ All existing tests continue to pass
- ✅ System performance maintained or improved

## 🔄 VALIDATION PROCESS

After each major change:
1. **Test System**: Verify http://localhost:8080 remains operational
2. **Run Tests**: Ensure all tests continue to pass
3. **Validate Functionality**: Test agent coordination and tool usage
4. **Document Changes**: Update relevant documentation

## 📞 REFERENCE DOCUMENTS

1. **Detailed Handoff**: `/docs/project/handoff-prompts/repository-cleanup-and-enhancement-handoff.md`
2. **Universal System Plan**: `/docs/project/implementation-plans/universal-multi-agent-system-plan.md`
3. **Current Status**: `/memory-bank/activeContext.md`
4. **AI Agent Analysis**: `/docs/project/handoff-prompts/ai-agent-prompt-enhancement-handoff.md`

## 🎯 YOUR APPROACH

1. **START WITH SEQUENTIAL THINKING** - Create comprehensive plan before any action
2. **Clean Repository First** - Remove file sprawl before enhancements
3. **Apply Best Practices Systematically** - Use proven patterns from leading AI tools
4. **Validate Incrementally** - Test after each major change
5. **Document Everything** - Update docs for all modifications

**REMEMBER**: The goal is to transform the current working 5-agent system into an enhanced, clean foundation that can later scale to the planned 26-agent universal system. Focus on quality over speed.

---

**START NOW**: Use Sequential Thinking tool to create your comprehensive implementation plan.
