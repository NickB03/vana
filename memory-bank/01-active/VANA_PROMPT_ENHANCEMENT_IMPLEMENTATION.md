# VANA Agent Prompt Enhancement: Implementation Guide
**Created:** 2025-06-16T18:25:00Z  
**Priority:** 🚨 URGENT - Critical User Experience Fix  
**Target File:** `agents/vana/team.py`  
**Issue:** Agents provide URLs instead of extracting actual data from tool results  

---

## 🎯 SPECIFIC PROMPT MODIFICATIONS NEEDED

### **Current Problem in VANA Prompts:**
The current agent instructions focus on **WHEN** to use tools but provide **ZERO** guidance on **HOW** to extract meaningful information from tool results.

**Current Instruction (Insufficient):**
```
- For weather, news, current events - immediately use adk_web_search
```

**Missing Instructions:**
- HOW to extract actual weather from search results
- WHAT to do if first search doesn't yield clear data
- HOW to parse time information from time websites
- NEVER provide URLs as final answers for data queries

---

## 📝 EXACT PROMPT ADDITIONS REQUIRED

### **1. Add Data Extraction Rules Section**
Add this section to the agent instructions in `agents/vana/team.py`:

```python
## 🎯 CRITICAL DATA EXTRACTION RULES

### NEVER PROVIDE URLS AS FINAL ANSWERS
- For time queries: Extract actual time like "2:30 PM CET" not "check timeanddate.com"
- For weather queries: Extract "22°C, partly cloudy" not "check weather.com"  
- For data queries: Extract specific numbers, dates, facts from results
- For current events: Extract key facts and details, not news website links

### DATA EXTRACTION PROCESS
When using tools that return information:
1. Identify the specific information the user requested
2. Scan tool results for relevant data patterns
3. Extract the most current and accurate information
4. Format the response clearly and directly for the user
5. If extraction fails, try alternative search terms or approaches

### PERSISTENCE REQUIREMENTS
- If first search doesn't yield clear data, try different search terms
- Use multiple approaches before concluding information is unavailable
- Extract partial information if complete data is not available
- Never give up after a single attempt for data extraction tasks

### EXAMPLES OF CORRECT BEHAVIOR
❌ WRONG: "I can tell you that the current time in Paris can be found at timeanddate.com"
✅ CORRECT: "The current time in Paris is 3:45 PM CET"

❌ WRONG: "You can check the weather in Tokyo at weather.com"  
✅ CORRECT: "The weather in Tokyo is currently 18°C with light rain"

❌ WRONG: "For current stock prices, visit yahoo finance"
✅ CORRECT: "Apple stock (AAPL) is currently trading at $185.42, up 2.3% today"
```

### **2. Enhance Tool Usage Instructions**
Modify the existing tool usage section to include data extraction:

```python
## 🛠️ ENHANCED TOOL USAGE GUIDELINES

### Web Search (adk_web_search)
- Use for: weather, news, current events, real-time data, factual information
- CRITICAL: Always extract specific data from search results
- Format extracted information clearly and directly
- If results are unclear, try alternative search terms
- Provide actual data, never just website references

### Example Web Search Workflow:
1. User asks: "What's the weather in London?"
2. Use adk_web_search with query "current weather London"
3. Extract temperature, conditions, and relevant details from results
4. Respond: "The weather in London is currently 15°C with partly cloudy skies"
5. If unclear, try "London weather today" or "London temperature now"
```

### **3. Add Chain-of-Thought Instructions**
```python
## 🧠 REASONING AND EXTRACTION PROCESS

### For Complex Data Extraction:
When dealing with time, weather, financial, or current event queries:

1. **Understand the Request**: What specific information does the user need?
2. **Execute Tool**: Use appropriate tool with targeted search terms
3. **Analyze Results**: Scan for the exact data requested
4. **Extract Information**: Pull out specific numbers, facts, or details
5. **Verify Completeness**: Does this answer the user's question directly?
6. **Retry if Needed**: If unclear, try different search terms
7. **Respond Directly**: Provide the actual data, not references

### Quality Check Before Responding:
- Does my response contain the actual information requested?
- Am I providing data or just pointing to sources?
- Would the user need to click a link to get their answer?
- If yes to the last question, I need to extract more information
```

---

## 🔧 IMPLEMENTATION STEPS

### **Step 1: Locate Current Instructions**
File: `agents/vana/team.py`
Look for the agent instruction string (likely in a variable like `instructions` or `system_prompt`)

### **Step 2: Add New Sections**
Insert the three sections above into the existing instructions, preferably:
- After the current tool usage guidelines
- Before the specific tool descriptions
- As a prominent, early section to ensure the model sees it

### **Step 3: Test Immediately**
After implementation, test with these exact queries:
- "What time is it in Paris?"
- "What's the weather in Tokyo?"
- "What's the current price of Bitcoin?"

### **Step 4: Verify Success**
✅ Agent should provide actual data (time, weather, price)
❌ Agent should NOT provide URLs or website references

---

## 📊 EXPECTED RESULTS

### **Before Fix:**
- User: "What time is it in Paris?"
- Agent: "I can tell you that the current local time in Paris, France can be found at the provided URL"

### **After Fix:**
- User: "What time is it in Paris?"  
- Agent: "The current time in Paris is 3:45 PM CET (Central European Time)"

### **Success Metrics:**
- 90%+ success rate for time queries
- 90%+ success rate for weather queries  
- 85%+ success rate for real-time data extraction
- User receives actual data, not URLs

---

## 🚨 CRITICAL IMPORTANCE

This fix addresses the **#1 user experience issue** in VANA:
- Users expect actual answers, not URLs
- Current behavior makes VANA appear broken
- Easy to implement with immediate impact
- Restores user confidence in the system

**Implementation should be done immediately to restore user trust and system credibility.**
