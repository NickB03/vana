# AI System Prompt Analysis: Key Findings for VANA Intelligence Enhancement
**Created:** 2025-06-16T18:20:00Z  
**Analysis Source:** https://github.com/NickB03/ai-system-prompt-examples  
**Tools Analyzed:** Cursor, Lovable, Devin AI, Manus, v0  
**Purpose:** Solve VANA's critical agent reasoning gap where agents provide URLs instead of extracting actual data  

---

## 🎯 CRITICAL DISCOVERY: The Missing Data Extraction Rules

### **Root Cause Identified:**
VANA's agents lack **explicit data extraction instructions**. All successful AI tools have detailed rules about HOW to extract specific information from tool results, not just WHEN to use tools.

### **Current VANA Problem:**
- ✅ Agents use tools proactively (good)
- ❌ Agents fail to extract meaningful data from tool results (critical gap)
- ❌ Agents provide URLs instead of actual answers (poor UX)

---

## 📊 COMPARATIVE ANALYSIS: Leading AI Tools

### **1. CURSOR - Code Generation Excellence**

**Key Patterns:**
- **Proactive Tool Usage**: "NEVER refer to tool names when speaking to the USER. Instead, just say what the tool is doing in natural language"
- **Parallel Execution**: Strong emphasis on using multiple tools simultaneously for efficiency
- **Information Persistence**: "If you are unsure about the answer... you should gather more information"
- **Bias Towards Action**: "Bias towards not asking the user for help if you can find the answer yourself"

**Critical Success Rule:**
```
"If you need additional information that you can get via tool calls, prefer that over asking the user."
```

### **2. LOVABLE - Complete Implementation Focus**

**Key Patterns:**
- **Complete Implementation**: "NEVER make partial changes" and "All imports MUST exist in the codebase"
- **Immediate Action**: "If you make a plan, immediately follow it, do not wait for the user to confirm"
- **Error Prevention**: Specific guidance about common mistakes and how to avoid them
- **Quality Standards**: Built-in responsive design, accessibility, and best practices

**Critical Success Rule:**
```
"You always provide clear, concise explanations and ensure all code changes are fully functional before implementing them."
```

### **3. DEVIN AI - Systematic Problem Solving**

**Key Patterns:**
- **Structured Workflow**: Clear distinction between "planning" and "standard" modes
- **Information Gathering**: "take time to gather information before concluding a root cause"
- **Pattern Matching**: "first understand the file's code conventions. Mimic code style, use existing libraries"
- **Systematic Thinking**: Mandatory use of "think" command before critical decisions

**Critical Success Rule:**
```
"When encountering difficulties, take time to gather information before concluding a root cause and acting upon it."
```

### **4. MANUS - User-Centric Approach**

**Key Patterns:**
- **Structured Problem Solving**: "Breaking down complex problems into manageable steps"
- **Continuous Learning**: "I learn from interactions and feedback"
- **Clear Communication**: Emphasis on adapting communication style to user needs
- **Comprehensive Documentation**: Detailed explanation of capabilities and approach

**Critical Success Rule:**
```
"I typically: 1. Analyze the request 2. Break down complex problems 3. Use appropriate tools 4. Provide clear communication 5. Deliver results in organized manner"
```

### **5. V0 - Production-Ready Implementation**

**Key Patterns:**
- **Complete Implementation**: "NEVER put placeholders or mocks, always create the full ready implementation"
- **Structured Planning**: Planning phase before implementation with specific thinking tags
- **Tool Specialization**: Different tools for different types of tasks
- **Quality Standards**: Accessibility, responsive design, best practices built-in

**Critical Success Rule:**
```
"You MUST develop production-ready code. Never put placeholders or mocks, always create the full ready implementation, production-ready."
```

---

## 🔑 KEY SUCCESS PATTERNS IDENTIFIED

### **1. Data Extraction Rules (MISSING IN VANA)**
**What Successful Tools Do:**
- Explicit instructions on HOW to extract specific information from tool results
- Rules about NEVER providing URLs as final answers for data queries
- Examples of successful data extraction patterns
- Persistence rules (try different approaches if first attempt fails)

**Example from Analysis:**
```
CRITICAL BEHAVIOR RULES:
1. NEVER provide URLs as final answers for data queries
2. ALWAYS extract specific information from tool results
3. If first search fails, try different search terms
4. Parse structured data from web results systematically
5. Provide actual data (time, weather, numbers) not references
```

### **2. Persistence and Multi-Step Reasoning**
**What Successful Tools Do:**
- Instructions to try multiple approaches rather than giving up
- Chain-of-thought prompting for complex data extraction
- Systematic approach to problem-solving
- Fallback strategies when initial attempts fail

### **3. Complete Implementation Focus**
**What Successful Tools Do:**
- Emphasis on providing complete, functional solutions
- No partial implementations or placeholders
- Production-ready code and responses
- Immediate action rather than asking for permission

### **4. Structured Thinking and Planning**
**What Successful Tools Do:**
- Planning phases before execution
- Reflection tools for complex decisions
- Systematic information gathering
- Clear decision-making processes

### **5. Error Prevention and Quality Standards**
**What Successful Tools Do:**
- Specific guidance about common mistakes
- Built-in quality standards (accessibility, responsive design)
- Error handling and fallback mechanisms
- Verification steps before completion

---

## 🚀 IMMEDIATE RECOMMENDATIONS FOR VANA

### **Priority 1: Add Data Extraction Rules (URGENT)**
Add these rules to VANA agent instructions:

```
## 🎯 DATA EXTRACTION RULES
1. NEVER provide URLs as final answers for data queries
2. ALWAYS extract specific information from tool results
3. For time queries: Extract actual time like "2:30 PM CET" 
4. For weather queries: Extract "22°C, partly cloudy"
5. If first search fails, try different search terms
6. Parse structured data systematically from web results
7. Provide actual data (numbers, facts, times) not references
```

### **Priority 2: Add Persistence Instructions**
```
## 🔄 PERSISTENCE RULES
1. If tool results don't contain clear data, try alternative search terms
2. Use multiple approaches before concluding information unavailable
3. Extract partial information if complete data unavailable
4. Never give up after single attempt for data extraction
```

### **Priority 3: Add Chain-of-Thought Prompting**
```
## 🧠 DATA EXTRACTION PROCESS
When extracting data:
1. Identify the specific information requested
2. Scan tool results for relevant data patterns
3. Extract the most current/accurate information
4. Format the response clearly for the user
5. If extraction fails, try alternative search terms
```

This analysis provides the foundation for immediately improving VANA's agent intelligence and solving the critical user experience issue.
