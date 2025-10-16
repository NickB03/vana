# Phase 1 Implementation Plan: Enable Peer Agent Transfer

**Target**: Vana ADK Multi-Agent System
**Phase**: 1 of 3 (Minimal Enhancement)
**Timeline**: 1-2 hours
**Risk Level**: 🟢 Low
**Status**: Ready for Implementation

---

## Objective

Enable bidirectional peer transfer between existing agents (`generalist_agent` ↔ `interactive_planner_agent`) without adding new agents or changing architecture.

---

## Success Criteria

✅ Agents can transfer to each other mid-conversation
✅ User can switch from research to casual and back seamlessly
✅ No infinite routing loops
✅ Conversation history preserved across transfers
✅ All existing functionality remains intact

---

## Example Target Flows

### Flow 1: Research → Casual
```
User: "Research the latest AI trends"
→ dispatcher → interactive_planner_agent (starts research)

User: "Thanks, that's helpful!"
→ interactive_planner_agent → generalist_agent (friendly response)
```

### Flow 2: Casual → Research
```
User: "Hello!"
→ dispatcher → generalist_agent (greets user)

User: "Can you research quantum computing for me?"
→ generalist_agent → interactive_planner_agent (starts research)
```

### Flow 3: Research ↔ Casual (Multiple Transfers)
```
User: "What's the weather like?"
→ dispatcher → generalist_agent (simple answer)

User: "Research climate change impacts"
→ generalist_agent → interactive_planner_agent (deep research)

User: "Thanks!"
→ interactive_planner_agent → generalist_agent (you're welcome)

User: "Actually, can you research renewable energy too?"
→ generalist_agent → interactive_planner_agent (new research)
```

---

## Changes Required

### Change #1: Update Dispatcher Instructions

**File**: `agents/vana/agent.py`
**Lines**: 471-520 (dispatcher_agent definition)
**Type**: Instruction update (non-breaking)

**Current Instruction** (lines 475-509):
```python
instruction="""You are a request router. Route to 'generalist_agent' for simple interactions,
or 'interactive_planner_agent' for research needs.

**CRITICAL ROUTING EXAMPLES - STUDY THESE CAREFULLY:**
...
Use transfer_to_agent function to route.
"""
```

**New Instruction**:
```python
instruction="""You are a request router. Route to 'generalist_agent' for simple interactions,
or 'interactive_planner_agent' for research needs.

**PEER TRANSFER CAPABILITY:**
Agents can transfer to each other mid-conversation if the user's request changes:
- If a user thanks the research agent or makes casual conversation during research,
  the research agent can transfer to generalist_agent.
- If a user asks the generalist agent to perform research or analysis,
  the generalist agent can transfer to interactive_planner_agent.

This enables seamless domain switching within a conversation.

**CRITICAL ROUTING EXAMPLES - STUDY THESE CAREFULLY:**
...
Use transfer_to_agent function to route.
"""
```

**Diff**:
```diff
 instruction="""You are a request router. Route to 'generalist_agent' for simple interactions,
 or 'interactive_planner_agent' for research needs.

+**PEER TRANSFER CAPABILITY:**
+Agents can transfer to each other mid-conversation if the user's request changes:
+- If a user thanks the research agent or makes casual conversation during research,
+  the research agent can transfer to generalist_agent.
+- If a user asks the generalist agent to perform research or analysis,
+  the generalist agent can transfer to interactive_planner_agent.
+
+This enables seamless domain switching within a conversation.
+
 **CRITICAL ROUTING EXAMPLES - STUDY THESE CAREFULLY:**
```

---

### Change #2: Enable Peer Transfer for Generalist Agent

**File**: `agents/vana/generalist.py`
**Lines**: 30-54 (generalist_agent definition)
**Type**: Configuration + instruction update

**Current Implementation** (lines 30-54):
```python
generalist_agent = LlmAgent(
    model=config.worker_model,
    name="generalist_agent",
    description="Handles simple questions, greetings, casual conversation, and thank you messages.",
    instruction="""You are a friendly, helpful AI assistant.

    Answer questions directly and concisely from your general knowledge.
    Be conversational, warm, and helpful.

    For simple questions (greetings, basic facts, simple math), respond immediately.
    Do NOT delegate or use any tools. Just answer based on your knowledge.

    Examples:
    - "Hello" → Greet warmly
    - "What is 2+2?" → Answer "4"
    - "Thanks!" → You're welcome message
    - "Good morning!" → Respond with a friendly greeting
    - "How are you?" → Respond naturally as an AI assistant
    """,
    # Transfer restrictions: Prevent bouncing back to dispatcher
    disallow_transfer_to_parent=True,  # Don't bounce back to dispatcher
    disallow_transfer_to_peers=True,   # Stay focused on task
)
```

**New Implementation**:
```python
generalist_agent = LlmAgent(
    model=config.worker_model,
    name="generalist_agent",
    description="Handles simple questions, greetings, casual conversation, and thank you messages. Can transfer to research agent for complex topics.",
    instruction="""You are a friendly, helpful AI assistant.

    Answer questions directly and concisely from your general knowledge.
    Be conversational, warm, and helpful.

    For simple questions (greetings, basic facts, simple math), respond immediately.
    Do NOT delegate or use any tools. Just answer based on your knowledge.

    Examples:
    - "Hello" → Greet warmly
    - "What is 2+2?" → Answer "4"
    - "Thanks!" → You're welcome message
    - "Good morning!" → Respond with a friendly greeting
    - "How are you?" → Respond naturally as an AI assistant

    **PEER TRANSFER RULE:**
    If the user asks for research, analysis, or current information that requires web search,
    transfer to interactive_planner_agent using transfer_to_agent().

    Examples requiring transfer:
    - "Research the latest AI developments"
    - "What are current trends in quantum computing?"
    - "Analyze climate change impacts"
    - "Compare React vs Vue frameworks"
    """,
    # Transfer restrictions: Allow peer transfer, block parent bounce
    disallow_transfer_to_parent=True,   # Don't bounce back to dispatcher
    disallow_transfer_to_peers=False,   # ✅ CHANGED: Allow peer handoff
)
```

**Diff**:
```diff
 generalist_agent = LlmAgent(
     model=config.worker_model,
     name="generalist_agent",
-    description="Handles simple questions, greetings, casual conversation, and thank you messages.",
+    description="Handles simple questions, greetings, casual conversation, and thank you messages. Can transfer to research agent for complex topics.",
     instruction="""You are a friendly, helpful AI assistant.

     Answer questions directly and concisely from your general knowledge.
     Be conversational, warm, and helpful.

     For simple questions (greetings, basic facts, simple math), respond immediately.
     Do NOT delegate or use any tools. Just answer based on your knowledge.

     Examples:
     - "Hello" → Greet warmly
     - "What is 2+2?" → Answer "4"
     - "Thanks!" → You're welcome message
     - "Good morning!" → Respond with a friendly greeting
     - "How are you?" → Respond naturally as an AI assistant
+
+    **PEER TRANSFER RULE:**
+    If the user asks for research, analysis, or current information that requires web search,
+    transfer to interactive_planner_agent using transfer_to_agent().
+
+    Examples requiring transfer:
+    - "Research the latest AI developments"
+    - "What are current trends in quantum computing?"
+    - "Analyze climate change impacts"
+    - "Compare React vs Vue frameworks"
     """,
     # Transfer restrictions: Allow peer transfer, block parent bounce
     disallow_transfer_to_parent=True,   # Don't bounce back to dispatcher
-    disallow_transfer_to_peers=True,   # Stay focused on task
+    disallow_transfer_to_peers=False,   # ✅ CHANGED: Allow peer handoff
 )
```

---

### Change #3: Add Peer Transfer to Interactive Planner

**File**: `agents/vana/agent.py`
**Lines**: 440-464 (interactive_planner_agent definition)
**Type**: Instruction update

**Current Instruction** (lines 444-458):
```python
instruction=f"""
You are a research planning assistant. Your primary function is to convert ANY user request into a research plan.

**CRITICAL RULE: Never answer a question directly or refuse a request.** Your one and only first step is to use the `plan_generator` tool to propose a research plan for the user's topic.
If the user asks a question, you MUST immediately call `plan_generator` to create a plan to answer the question.

Your workflow is:
1.  **Plan:** Use `plan_generator` to create a draft plan and present it to the user.
2.  **Ask for Approval:** After presenting the plan, you MUST explicitly ask the user: "Does this research plan look good? Please let me know if you'd like me to proceed with the research or if you'd like any changes."
3.  **Refine:** If the user requests changes, incorporate their feedback and present the updated plan.
4.  **Execute:** Once the user gives approval (e.g., "yes", "looks good", "proceed", "run it"), you MUST immediately delegate the task to the `research_pipeline` agent, passing the approved plan.

Current date: {datetime.datetime.now().strftime("%Y-%m-%d")}
Do not perform any research yourself. Your job is to Plan, Ask for Approval, Refine if needed, and Delegate.
""",
```

**New Instruction**:
```python
instruction=f"""
You are a research planning assistant. Your primary function is to convert ANY user request into a research plan.

**CRITICAL RULE: Never answer a question directly or refuse a request.** Your one and only first step is to use the `plan_generator` tool to propose a research plan for the user's topic.
If the user asks a question, you MUST immediately call `plan_generator` to create a plan to answer the question.

Your workflow is:
1.  **Plan:** Use `plan_generator` to create a draft plan and present it to the user.
2.  **Ask for Approval:** After presenting the plan, you MUST explicitly ask the user: "Does this research plan look good? Please let me know if you'd like me to proceed with the research or if you'd like any changes."
3.  **Refine:** If the user requests changes, incorporate their feedback and present the updated plan.
4.  **Execute:** Once the user gives approval (e.g., "yes", "looks good", "proceed", "run it"), you MUST immediately delegate the task to the `research_pipeline` agent, passing the approved plan.

**PEER TRANSFER RULE:**
If the user sends casual conversation (greetings, thanks, simple questions) during research planning,
transfer to generalist_agent using transfer_to_agent().

Examples requiring transfer:
- "Thanks!" → transfer to generalist_agent
- "Hello" → transfer to generalist_agent
- "What time is it?" → transfer to generalist_agent
- "You're helpful!" → transfer to generalist_agent

Current date: {datetime.datetime.now().strftime("%Y-%m-%d")}
Do not perform any research yourself. Your job is to Plan, Ask for Approval, Refine if needed, and Delegate.
""",
```

**Diff**:
```diff
 Your workflow is:
 1.  **Plan:** Use `plan_generator` to create a draft plan and present it to the user.
 2.  **Ask for Approval:** After presenting the plan, you MUST explicitly ask the user: "Does this research plan look good? Please let me know if you'd like me to proceed with the research or if you'd like any changes."
 3.  **Refine:** If the user requests changes, incorporate their feedback and present the updated plan.
 4.  **Execute:** Once the user gives approval (e.g., "yes", "looks good", "proceed", "run it"), you MUST immediately delegate the task to the `research_pipeline` agent, passing the approved plan.

+**PEER TRANSFER RULE:**
+If the user sends casual conversation (greetings, thanks, simple questions) during research planning,
+transfer to generalist_agent using transfer_to_agent().
+
+Examples requiring transfer:
+- "Thanks!" → transfer to generalist_agent
+- "Hello" → transfer to generalist_agent
+- "What time is it?" → transfer to generalist_agent
+- "You're helpful!" → transfer to generalist_agent
+
 Current date: {datetime.datetime.now().strftime("%Y-%m-%d")}
 Do not perform any research yourself. Your job is to Plan, Ask for Approval, Refine if needed, and Delegate.
```

**Note**: `interactive_planner_agent` does not have explicit `disallow_transfer_to_peers` set, so it defaults to allowing peer transfer. No configuration change needed.

---

## Implementation Steps

### Step 1: Code Changes (15 minutes)

1. **Open** `agents/vana/agent.py`
2. **Locate** line 475 (dispatcher_agent instruction)
3. **Add** peer transfer capability explanation (Change #1)
4. **Locate** line 444 (interactive_planner_agent instruction)
5. **Add** peer transfer rule (Change #3)
6. **Open** `agents/vana/generalist.py`
7. **Locate** line 34 (generalist_agent instruction)
8. **Add** peer transfer rule (Change #2)
9. **Locate** line 52 (disallow_transfer_to_peers)
10. **Change** from `True` to `False`
11. **Save** all files

---

### Step 2: Validation (5 minutes)

**Syntax Check**:
```bash
# Check Python syntax
cd agents/vana
python3 -m py_compile agent.py generalist.py

# Expected output: No errors
```

**Import Check**:
```bash
# Verify agents can be imported
python3 -c "from agents.vana.agent import root_agent; print('✅ Import successful')"

# Expected output: ✅ Import successful
```

---

### Step 3: Local Testing (30 minutes)

#### Test 1: Research → Casual Transfer
```bash
# Start ADK server
adk web agents/ --port 8080

# Open browser: http://localhost:8080
# Select: vana application
# Test conversation:
```

**Test Script**:
```
User: "Research the latest Python features"
Expected: Dispatcher → interactive_planner_agent (creates plan)

User: "Thanks, that's helpful!"
Expected: interactive_planner_agent → generalist_agent (friendly response)
```

**Success Criteria**: ✅ Agent transfers from planner to generalist

---

#### Test 2: Casual → Research Transfer
```
User: "Hello!"
Expected: Dispatcher → generalist_agent (greets)

User: "Can you research AI safety for me?"
Expected: generalist_agent → interactive_planner_agent (creates plan)
```

**Success Criteria**: ✅ Agent transfers from generalist to planner

---

#### Test 3: Multiple Transfers
```
User: "Hi there!"
Expected: Dispatcher → generalist_agent

User: "Research quantum computing"
Expected: generalist_agent → interactive_planner_agent

User: "Thanks!"
Expected: interactive_planner_agent → generalist_agent

User: "Actually, research blockchain too"
Expected: generalist_agent → interactive_planner_agent
```

**Success Criteria**: ✅ Multiple seamless transfers

---

#### Test 4: No Infinite Loops
```
User: "Hello"
Expected: Dispatcher → generalist_agent → (responds, no further transfer)

User: "Research AI"
Expected: Dispatcher → interactive_planner_agent → (creates plan, no loop)
```

**Success Criteria**: ✅ No infinite routing loops

---

### Step 4: Integration Testing (20 minutes)

**Start Full Stack**:
```bash
# Terminal 1: Start PM2 services
pm2 start ecosystem.config.js

# Verify all services running
pm2 status
# Expected:
# - vana-backend (port 8000) ✅
# - vana-adk (port 8080) ✅
# - vana-frontend (port 3000) ✅
```

**Test via Frontend**:
```bash
# Open browser: http://localhost:3000
# Test conversation:
```

**Test Script**:
```
1. Type: "Hello!"
   Expected: Friendly greeting from generalist

2. Type: "Research the latest TypeScript features"
   Expected: Research plan from interactive_planner

3. Type: "Thanks!"
   Expected: You're welcome from generalist

4. Type: "Now research React 19"
   Expected: New research plan from interactive_planner
```

**Verify SSE Events**:
```bash
# Check backend logs for agent transfer events
pm2 logs vana-backend | grep "transfer"

# Expected output:
# [Agent] Transfer: interactive_planner_agent → generalist_agent
# [Agent] Transfer: generalist_agent → interactive_planner_agent
```

---

### Step 5: Rollback Plan (5 minutes)

If issues occur, rollback is simple:

```bash
# Revert changes
git checkout agents/vana/agent.py agents/vana/generalist.py

# Restart services
pm2 restart all

# Verify original behavior restored
curl http://localhost:8000/health
```

**Time to Rollback**: < 2 minutes (config changes only)

---

## Testing Checklist

### Functional Tests
- [ ] Dispatcher routes to generalist for "Hello"
- [ ] Dispatcher routes to planner for "Research AI"
- [ ] Generalist transfers to planner for "Research X"
- [ ] Planner transfers to generalist for "Thanks"
- [ ] Multiple transfers work seamlessly
- [ ] No infinite routing loops
- [ ] Conversation history preserved across transfers

### Edge Cases
- [ ] Empty messages handled gracefully
- [ ] Ambiguous requests (neither casual nor research)
- [ ] Rapid consecutive transfers
- [ ] Long conversations with many transfers
- [ ] Transfer during ongoing research pipeline execution

### Performance
- [ ] Transfer latency < 100ms
- [ ] No memory leaks from transfers
- [ ] SSE streams remain stable during transfers
- [ ] Backend CPU usage normal

### Backward Compatibility
- [ ] Existing research workflows unchanged
- [ ] API endpoints still functional
- [ ] Frontend integration works
- [ ] All existing tests pass

---

## Success Metrics

**Quantitative**:
- ✅ 0 infinite routing loops
- ✅ 100% of test cases passing
- ✅ Transfer latency < 100ms
- ✅ No increase in error rate

**Qualitative**:
- ✅ Seamless domain switching experience
- ✅ Natural conversation flow maintained
- ✅ Users can switch casual ↔ research intuitively

---

## Risk Mitigation

### Risk #1: Infinite Routing Loops
**Likelihood**: Low
**Impact**: High (system unusable)

**Mitigation**:
- `disallow_transfer_to_parent=True` prevents bouncing to dispatcher
- Clear transfer rules in instructions
- Test edge cases thoroughly

**Detection**:
```bash
# Monitor for loop patterns in logs
pm2 logs vana-backend | grep -A 5 "transfer_to_agent"

# Look for: A → B → A → B (loop pattern)
```

**Recovery**: Rollback to previous version

---

### Risk #2: Lost Conversation History
**Likelihood**: Very Low (ADK handles this automatically)
**Impact**: Medium (degraded UX)

**Mitigation**:
- ADK Auto-Flow preserves session history
- Test conversation history explicitly

**Verification**:
```python
# In test conversation:
User: "My name is Alice"
Bot: (generalist responds)
User: "Research AI" (transfer to planner)
Bot: (planner responds)
User: "What's my name?" (should remember "Alice")
```

---

### Risk #3: Transfer Ambiguity
**Likelihood**: Medium
**Impact**: Low (user can retry)

**Mitigation**:
- Clear routing rules in instructions
- Examples for both transfer and no-transfer cases
- Err on side of no transfer (safer)

**Example Ambiguous Case**:
```
User: "Tell me about AI" (research or simple answer?)
```

**Handling**: Default to generalist (simple answer), let user escalate if needed

---

## Deployment Strategy

### Development Environment
1. Implement changes locally
2. Run full test suite
3. Verify with manual testing
4. Commit to feature branch

### Staging Environment (Optional)
1. Deploy to staging server
2. Run automated tests
3. Manual QA testing
4. Collect metrics

### Production Deployment
1. Create rollback checkpoint
2. Deploy during low-traffic window
3. Monitor error rates for 24 hours
4. Collect user feedback

### Rollback Criteria
- Error rate > 5% increase
- Infinite loop detected
- User reports of broken conversations
- Performance degradation > 20%

---

## Post-Implementation

### Monitoring (First 7 Days)
```bash
# Daily checks
pm2 logs vana-backend | grep -E "(transfer|error)" | tail -100

# Metrics to watch
curl http://localhost:8000/health | jq '.active_adk_sessions'
```

### Documentation Updates
- [ ] Update `CLAUDE.md` with peer transfer capability
- [ ] Add peer transfer examples to README
- [ ] Document transfer patterns in `docs/adk/`

### User Communication
- [ ] Add changelog entry: "Enhanced: Agents can now transfer conversations seamlessly"
- [ ] Update user guide with transfer examples
- [ ] Announce feature in release notes

---

## Phase 2 Readiness

If Phase 1 succeeds, proceed to **Phase 2** (Multi-Domain Expansion):
- Add `code_specialist_agent`
- Add `data_analyst_agent`
- Add `security_auditor_agent`
- Expand dispatcher to 5 domains

**Prerequisites for Phase 2**:
- ✅ Phase 1 deployed successfully
- ✅ No infinite loop issues
- ✅ User feedback positive
- ✅ Metrics stable for 7 days

---

## Files Modified Summary

| File | Lines Changed | Change Type | Risk |
|------|---------------|-------------|------|
| `agents/vana/agent.py` | ~15 lines | Instructions only | 🟢 Low |
| `agents/vana/generalist.py` | ~12 lines | Instructions + 1 config | 🟢 Low |
| **Total** | **~27 lines** | **Config/Instructions** | **🟢 Low** |

**No breaking changes. No structural refactoring. Pure configuration.**

---

## Conclusion

Phase 1 is a **low-risk, high-value enhancement** that enables peer transfer without architectural changes. Implementation time is minimal (1-2 hours), and rollback is instant.

**Status**: ✅ Ready for implementation
**Next Step**: Execute Step 1 (Code Changes)

---

**Plan Created**: 2025-10-15
**Author**: Claude Code (SPARC Orchestrator)
**Review Required**: Yes (team review recommended)
**Approval**: Pending
