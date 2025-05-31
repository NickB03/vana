# User Guidelines Updates Summary (2025-05-30)

## 🎯 **KEY ADDITIONS TO PREVENT REGRESSION ERRORS**

### **1. CRITICAL DIRECTORY & NAMING CONVENTIONS (NEW SECTION IV)**

**MANDATORY DIRECTORY STRUCTURE:**
- Root: `/Users/nick/Development/vana/` (NEVER create new vana directories)
- Agent: `/agents/vana/` (NOT `/agent/` or `/vana_multi_agent/`)
- Tools: `/lib/_tools/` (for ADK tools)
- Tests: `/tests/automated/` (for automated testing)

**NAMING CONVENTIONS:**
- Agent Names: Role-based (e.g., "vana", "juno") NOT personal names
- Tool Names: NO leading underscores (e.g., `echo` NOT `_echo`)
- Function Names: Match tool names exactly
- File Names: snake_case for Python, kebab-case for configs

**FORBIDDEN ACTIONS:**
- ❌ NEVER create `/vana_multi_agent/` or similar directories
- ❌ NEVER work in wrong directory structures
- ❌ NEVER use leading underscores in tool names
- ❌ NEVER create duplicate agent directories

### **2. AUTOMATED TESTING WITH PUPPETEER (NEW SECTION V)**

**MCP Puppeteer Integration:**
- Status: ✅ OPERATIONAL - Configured in Augment Code
- Service URL: https://vana-qqugqgsbcq-uc.a.run.app
- Interface: Google ADK Dev UI

**Testing Requirements:**
1. Always use Puppeteer for UI/browser testing instead of manual testing
2. Test all changes through automated browser tests
3. Validate responses using established test framework
4. Document test results in Memory Bank

**Available Puppeteer Tools:**
- `puppeteer_navigate` - Navigate to URLs
- `puppeteer_screenshot` - Capture screenshots
- `puppeteer_fill` - Fill form fields (use `textarea` selector for chat)
- `puppeteer_click` - Click elements
- `puppeteer_evaluate` - Execute JavaScript
- `puppeteer_hover` - Hover over elements

**Testing Workflow:**
1. Navigate to VANA service
2. Fill textarea with test message
3. Submit with Enter key (JavaScript KeyboardEvent)
4. Capture and validate response
5. Take screenshot for documentation
6. Update test results in Memory Bank

### **3. ENHANCED TOOL USAGE GUIDELINES (UPDATED SECTION VIII)**

**Added:**
- Use Puppeteer for all testing and validation
- Correct working directory: `cd /Users/nick/Development/vana`

### **4. UPDATED CODE & FILE STANDARDS (SECTION X)**

**Changed:**
- Dependencies: Update `pyproject.toml` (Poetry), not requirements.txt
- Avoid creating mock code implementations unless approved by Nick

### **5. NEW CRITICAL SUCCESS PATTERNS (SECTION XIII)**

**ALWAYS DO:**
- ✅ Use correct `/Users/nick/Development/vana/` directory structure
- ✅ Use Puppeteer for testing and validation
- ✅ Update Memory Bank with progress and results
- ✅ Use Context7 and Sequential Thinking for research and planning
- ✅ Follow proper agent and tool naming conventions
- ✅ Test changes through automated browser tests

**NEVER DO:**
- ❌ Create new vana directories or work in wrong paths
- ❌ Use leading underscores in tool names
- ❌ Skip testing and validation steps
- ❌ Assume knowledge without researching with Context7
- ❌ Make changes without updating Memory Bank

## 🔄 **UPDATED SECTIONS**

### **Section VI - Documentation Update Triggers**
- Added: "After successful automated tests"

### **Section IX - Specialized MCP Tools**
- Added: Puppeteer for browser automation
- Removed: Magic (UI/UX) and JSON Knowledge Graph (not currently used)

### **Section XI - Task Execution Best Practices**
- Added: "Test everything: Use Puppeteer to validate changes work correctly"
- Added: "Document progress: Update Memory Bank with results and learnings"

## 📋 **IMPLEMENTATION NOTES**

1. **These guidelines prevent the recurring issues** we've experienced with:
   - Wrong directory structures (vana_multi_agent)
   - Tool naming conflicts (_echo vs echo)
   - Missing testing validation
   - Directory conflicts between /agent/ and /agents/

2. **The Puppeteer integration** ensures all changes are validated through automated testing before being considered complete.

3. **The critical success patterns** provide clear do's and don'ts based on actual project experience.

4. **These updates reflect the current project state** with operational automated testing and established best practices.

## 🎯 **CONFIDENCE LEVEL: 10/10**

These guidelines incorporate all lessons learned and provide clear instructions to prevent regression errors while enabling efficient automated testing workflows.
