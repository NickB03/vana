# Google ADK Expert Skill - Setup Guide

**Status**: Ready to Use  
**Location**: `.claude/skills/google-adk-expert/`  
**Time to Setup**: 5 minutes

---

## ✅ Step 1: Verify Skill Installation

The skill is already installed in your project at `.claude/skills/google-adk-expert/`

**Files present:**
- ✅ SKILL.md (Main definition)
- ✅ ADK-PATTERNS.md (Code templates)
- ✅ QUICK-REFERENCE.md (Fast lookup)
- ✅ INSTALLATION.md (Setup guide)
- ✅ README.md (Overview)
- ✅ INDEX.md (File index)

---

## ✅ Step 2: Verify Claude Code Can Find the Skill

### Option A: In Claude Code (Recommended)
1. Open Claude Code
2. Ask: **"What skills are available?"**
3. You should see **"Google ADK Expert"** in the list

### Option B: Manual Verification
Check that the skill file has proper YAML frontmatter:
```bash
head -5 .claude/skills/google-adk-expert/SKILL.md
```

Expected output:
```yaml
---
name: Google ADK Expert
description: Expert guidance on Google Agent Development Kit...
allowed-tools: Read, Grep, Glob, View, Write, Edit
---
```

---

## ✅ Step 3: Test the Skill

### Test 1: Simple Agent Creation
Ask Claude Code:
```
"Create a simple ADK agent that searches the web"
```

Expected: Claude should provide LlmAgent code with web search tool

### Test 2: Multi-Agent Design
Ask Claude Code:
```
"Design a multi-agent system for research automation"
```

Expected: Claude should recommend dispatcher-led architecture with agent types

### Test 3: Troubleshooting
Ask Claude Code:
```
"Why isn't my agent calling tools?"
```

Expected: Claude should provide debugging steps and common solutions

---

## 📚 Step 4: Explore the Skill Documentation

### Quick Start (5 minutes)
1. Read: `.claude/skills/google-adk-expert/README.md`
2. Review: `.claude/skills/google-adk-expert/QUICK-REFERENCE.md`

### Deep Dive (30 minutes)
1. Study: `.claude/skills/google-adk-expert/ADK-PATTERNS.md`
2. Review: `.claude/skills/google-adk-expert/INSTALLATION.md`
3. Reference: `.claude/skills/google-adk-expert/INDEX.md`

### Full Mastery (1-2 hours)
1. Read all files in order
2. Review reference implementations in `/docs/adk/refs/`
3. Try example prompts from README.md

---

## 🚀 Step 5: Start Using the Skill

### Example 1: Design Multi-Agent System
```
User: "Design a multi-agent system for research automation"
↓
Claude: [Uses Google ADK Expert skill]
- Recommends dispatcher-led architecture
- Suggests agent types and responsibilities
- Provides code templates
- References real-world examples
```

### Example 2: Generate Agent Code
```
User: "Create an ADK agent with web search and memory"
↓
Claude: [Uses Google ADK Expert skill]
- Generates LlmAgent definition
- Adds web search tool
- Includes error handling
- Provides deployment config
```

### Example 3: Implement A2A Communication
```
User: "Set up agent-to-agent communication"
↓
Claude: [Uses Google ADK Expert skill]
- Explains A2A protocol
- Generates agent definitions
- Provides routing logic
- References a2a-official-samples
```

### Example 4: Deploy to Production
```
User: "Deploy my agent to Cloud Run"
↓
Claude: [Uses Google ADK Expert skill]
- References agent-starter-pack
- Provides Dockerfile
- Includes Cloud Build config
- Suggests CI/CD setup
```

---

## 📖 Step 6: Reference the Documentation

### For Quick Answers
→ Use: `QUICK-REFERENCE.md`
- Common tasks with code snippets
- Reference repository matrix
- Debugging tips

### For Implementation
→ Use: `ADK-PATTERNS.md`
- Agent types and templates
- Tool development patterns
- Callback examples
- Multi-agent orchestration

### For Setup & Troubleshooting
→ Use: `INSTALLATION.md`
- Installation instructions
- Verification steps
- Usage examples
- Troubleshooting guide

### For Comprehensive Understanding
→ Use: `README.md` + `INDEX.md`
- Overview and quick start
- File descriptions
- Learning paths
- Use case guides

---

## 🔗 Step 7: Integrate with Vana Project

The skill is optimized for Vana. Use it to:

### Extend Vana Agents
```
"Extend Vana with A2A communication between agents"
↓
Claude: [Uses Google ADK Expert skill]
- Analyzes /app/agent.py
- Suggests A2A integration points
- References brandon-hancock-agent-bakeoff
- Provides code modifications
```

### Improve Agent Architecture
```
"How can I improve the Vana agent architecture?"
↓
Claude: [Uses Google ADK Expert skill]
- Reviews current dispatcher pattern
- Suggests hierarchical improvements
- References marcus-ng-cymbal-bank
- Provides implementation steps
```

### Deploy to Production
```
"Deploy Vana agents to Cloud Run"
↓
Claude: [Uses Google ADK Expert skill]
- References agent-starter-pack
- Provides Dockerfile
- Includes CI/CD setup
- Suggests monitoring strategy
```

---

## ✅ Verification Checklist

- [ ] Skill files exist in `.claude/skills/google-adk-expert/`
- [ ] SKILL.md has proper YAML frontmatter
- [ ] Claude Code recognizes the skill
- [ ] Test prompts work correctly
- [ ] Documentation is readable
- [ ] Reference implementations are accessible
- [ ] Vana integration is understood

---

## 🎯 Common Tasks

### Task 1: Design a New Agent
1. Ask: "Design an ADK agent for X"
2. Claude provides: Architecture, code template, best practices
3. Reference: ADK-PATTERNS.md for implementation details

### Task 2: Troubleshoot Agent Issues
1. Ask: "Why is my agent not X?"
2. Claude provides: Diagnosis, debugging steps, solutions
3. Reference: QUICK-REFERENCE.md for common issues

### Task 3: Implement A2A Communication
1. Ask: "How do I set up A2A communication?"
2. Claude provides: Protocol explanation, code examples, references
3. Reference: a2a-official-samples in `/docs/adk/refs/`

### Task 4: Deploy to Production
1. Ask: "Deploy my agent to Cloud Run"
2. Claude provides: Dockerfile, Cloud Build config, CI/CD setup
3. Reference: agent-starter-pack in `/docs/adk/refs/`

---

## 📞 Support & Troubleshooting

### Skill Not Appearing
1. Check: `.claude/skills/google-adk-expert/SKILL.md` exists
2. Verify: YAML frontmatter is correct
3. Restart: Claude Code
4. Ask: "What skills are available?"

### Skill Not Being Used
1. Use ADK-related keywords in your question
2. Ask explicitly: "Use the Google ADK Expert skill to..."
3. Check: Allowed tools include what you need

### Outdated References
1. Update: `/docs/adk/refs/` repositories
2. Update: Documentation files if needed
3. Test: With latest ADK version

---

## 🎓 Learning Path

### Beginner (30 minutes)
1. Read: README.md
2. Review: QUICK-REFERENCE.md
3. Try: "Create a simple ADK agent"

### Intermediate (1-2 hours)
1. Study: ADK-PATTERNS.md
2. Review: Reference implementations
3. Try: "Design a multi-agent system"

### Advanced (2-4 hours)
1. Study: Real-world examples
2. Implement: A2A communication
3. Deploy: To production with CI/CD

---

## 🎉 You're Ready!

The Google ADK Expert Skill is now set up and ready to use.

**Next Steps:**
1. Open Claude Code
2. Ask: "What skills are available?"
3. Verify: "Google ADK Expert" appears
4. Try: "Design a multi-agent system for research automation"

**Happy ADK development! 🚀**

---

**Setup Time**: ~5 minutes  
**Learning Time**: 30 minutes - 4 hours (depending on depth)  
**Status**: ✅ Ready to Use

