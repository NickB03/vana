# 🤖 AI Agent Development Guide

**Purpose:** Guide for AI agents (like Claude) working on the VANA project development process.

---

## 🧠 Memory Bank System

### **What is the Memory Bank?**
The Memory Bank is **your persistent memory system** as an AI development agent. Since your memory resets between sessions, this file-based system maintains:
- Project context and current status
- Technical decisions and architecture patterns
- Progress tracking and completed work
- Active tasks and priorities
- Historical context and lessons learned

### **Key Distinction:**
- ❌ **NOT part of VANA's operational system** - VANA agents don't use this
- ✅ **FOR AI development agents** - Your tool for maintaining continuity
- ✅ **Local VS Code development process** - Part of the development workflow

---

## 📁 Memory Bank Structure

Located at: `/Users/nick/Development/vana/archive/` (archived development artifacts)

### **00-core/** - Essential Project Files
**Your starting point for every session**
- `activeContext.md` - Current work state and immediate priorities
- `progress.md` - Project progress tracking and milestones
- `projectbrief.md` - Project goals, scope, and requirements
- `productContext.md` - Problem context and solution vision
- `systemPatterns.md` - Architecture patterns and design decisions
- `techContext.md` - Technical environment and constraints
- `memory-bank-index.md` - Master navigation file

### **01-active/** - Current Work
**Your immediate task management**
- Current task instructions and agent assignments
- Active feedback and resolution items
- Immediate priorities and blockers
- Work-in-progress documentation

### **02-phases/** - Phase Completion Documentation
**Historical context for understanding project evolution**
- Week 1-5 handoff documentation
- Phase completion summaries
- Major milestone achievements
- Transition documentation between phases

### **03-technical/** - Technical Documentation
**Implementation guidance and patterns**
- Implementation plans and strategies
- Architecture documentation and patterns
- System design specifications
- Technical optimization plans

### **04-completed/** - Finished Work
**Reference for completed achievements**
- Completed handoff documentation
- Success summaries and achievements
- Resolved issues and their solutions
- Validated implementations

### **05-archive/** - Historical Context
**Lessons learned and recovery information**
- Critical recovery documentation
- System repair history
- Emergency fixes and their context
- Lessons learned from major issues

---

## 🎯 AI Agent Workflow

### **Session Start Protocol:**
1. **Read Core Files First** - Always start with `00-core/activeContext.md` and `00-core/progress.md`
2. **Check Active Tasks** - Review `01-active/` for current priorities
3. **Understand Context** - Read relevant technical and historical documentation
4. **Confirm Understanding** - Verify you have complete context before proceeding

### **During Work Protocol:**
1. **Document Decisions** - Update `00-core/systemPatterns.md` for technical decisions
2. **Track Progress** - Update `00-core/progress.md` with achievements
3. **Maintain Active Context** - Keep `00-core/activeContext.md` current
4. **Organize Work** - Place new documentation in appropriate categories

### **Session End Protocol:**
1. **Update Status** - Ensure `00-core/activeContext.md` reflects current state
2. **Document Progress** - Add achievements to `00-core/progress.md`
3. **Create Handoff** - If needed, create handoff documentation in `01-active/`
4. **Organize Files** - Ensure all new files are properly categorized

---

## 📋 Best Practices for AI Agents

### **Memory Bank Usage:**
- **Always read before acting** - Never assume you know the current state
- **Update during work** - Don't wait until the end to document
- **Use proper categorization** - Place files in the right directories
- **Cross-reference work** - Link related documents for context
- **Be specific in updates** - Include dates, status, and next steps

### **Documentation Standards:**
- **Use clear headings** - Make information easy to find
- **Include status indicators** - ✅ COMPLETE, ⚠️ IN PROGRESS, ❌ BLOCKED
- **Add timestamps** - When work was done or status changed
- **Provide context** - Why decisions were made, not just what was done
- **Link related work** - Reference other relevant files and sections

### **Handoff Preparation:**
- **Current Status Summary** - What's been accomplished
- **Active Blockers** - What's preventing progress
- **Next Priorities** - What should be done next
- **Context Requirements** - What the next agent needs to know
- **Success Criteria** - How to measure progress

---

## 🔧 Technical Integration

### **File Operations:**
```bash
# Always work from project root
cd /Users/nick/Development/vana

# Read project documentation
cat docs/README.md

# Update files using appropriate tools
# Use str-replace-editor for modifications
# Use save-file for new documents
```

### **Directory Structure Maintenance:**
- **Keep organized** - Use the simplified 2-directory structure effectively
- **Update system_status.md** - Keep the single source of truth current and accurate
- **Archive old work** - Move outdated files to `02-archive/` with `ARCHIVED_OUTDATED_` prefix
- **Clean up duplicates** - Remove outdated or duplicate information regularly

---

## 🎯 Success Patterns

### **Effective Session Management:**
1. **Start with context** - Read Memory Bank before any work
2. **Work incrementally** - Update documentation as you progress
3. **Test and validate** - Use testing frameworks to verify work
4. **Document thoroughly** - Leave clear trail for next session/agent
5. **Prepare handoffs** - Create clear transition documentation

### **Common Pitfalls to Avoid:**
- ❌ Starting work without reading Memory Bank
- ❌ Making assumptions about current state
- ❌ Forgetting to update progress documentation
- ❌ Poor file organization and categorization
- ❌ Incomplete handoff documentation

### **Quality Indicators:**
- ✅ Clear, up-to-date system_status.md
- ✅ Comprehensive progress tracking in structured format
- ✅ Clean 2-directory structure
- ✅ Effective evidence-based documentation
- ✅ Smooth agent transitions with clear handoff notes

---

## 📚 Related Documentation

- **User Guide:** `docs/guides/user-guide.md` - For VANA system users
- **Developer Guide:** `docs/guides/developer-guide.md` - For VANA system development
- **Project Documentation:** `docs/` - Comprehensive project documentation
- **Architecture Docs:** `docs/architecture/` - System design and patterns

**Remember: The Memory Bank is YOUR tool for maintaining continuity and context across development sessions. Use it effectively to ensure smooth project progression.** 🎯
