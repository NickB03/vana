# Agent Handoff: ReasoningProvider Activation

> **Copy everything below this line as your prompt to the next agent**

---

## Task Assignment: Implement ReasoningProvider Activation

You are being handed off a pre-planned implementation task. Your job is to execute the plan precisely as documented.

### ⚠️ CRITICAL INSTRUCTION

**You MUST follow the implementation plan exactly as written. Do NOT deviate from the plan without explicit user approval.**

If you encounter:
- A situation not covered by the plan → ASK the user before proceeding
- A better approach than what's documented → PROPOSE it to the user, wait for approval
- An error or blocker → REPORT it to the user, do not improvise a workaround
- Missing context → READ the plan file first, then ask if still unclear

---

## Background

### What Exists
This codebase has a fully-implemented but **unwired** `ReasoningProvider` class in `supabase/functions/_shared/reasoning-provider.ts` (~1,170 lines). It uses GLM-4.5-Air as a summarization model to generate semantic status updates during AI thinking/reasoning.

### Current System (Being Replaced)
- GLM-4.6 emits `[STATUS: action phrase]` markers in its reasoning text
- Backend uses `parseStatusMarker()` regex to extract these markers
- Frontend uses client-side regex (`detectPhase()`) to classify phases
- **Problems**: Fragile regex patterns, relies on model following prompt instructions

### New System (ReasoningProvider)
- GLM-4.6 streams raw reasoning content (no markers needed)
- `ReasoningProvider` buffers chunks and calls GLM-4.5-Air for semantic summarization
- Server generates human-friendly status messages ("Designing component architecture...")
- Built-in circuit breaker falls back to phase templates if LLM fails
- **Benefits**: Model-agnostic, semantic understanding, production-ready error handling

### Why This Change
The user wants to replace the fragile regex-based system with LLM-powered semantic status generation. This is a demo project, so no gradual rollout is needed—direct replacement is the approach.

---

## Implementation Plan Location

**READ THIS FILE FIRST:**
```
.claude/plans/reasoning-provider-activation.md
```

This plan contains:
- Architecture diagrams (current vs. new system)
- 8 implementation tasks with exact code changes
- Before/after code snippets with line numbers
- Security fixes (prompt injection sanitization)
- Configuration tuning recommendations
- Testing checklist
- Rollback instructions

---

## Task Summary

| # | Task | File | Priority |
|---|------|------|----------|
| 1 | Security Fix - Prompt sanitization | `reasoning-provider.ts` | P0 |
| 2 | Config Tuning - Optimize settings | `reasoning-provider.ts` | P2 |
| 3 | Heartbeat Fix - Race condition | `reasoning-provider.ts` | P2 |
| 4 | Feature Flag - Add toggle | `config.ts` | P1 |
| 5 | Wire Provider - Streaming handler | `streaming.ts` | P1 |
| 6 | Wire Provider - Tool-calling handler | `tool-calling-chat.ts` | P1 |
| 7 | Remove Regex - Client cleanup | `useChatMessages.tsx` | P2 |
| 8 | UI Polish - Auto-scroll, duration | `ReasoningDisplay.tsx` | P3 |

**Recommended execution order**: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

---

## Key Files

| File | Purpose |
|------|---------|
| `supabase/functions/_shared/reasoning-provider.ts` | The ReasoningProvider implementation (modify) |
| `supabase/functions/_shared/config.ts` | Feature flags and configuration (add to) |
| `supabase/functions/_shared/prompt-injection-defense.ts` | Security utilities (import from) |
| `supabase/functions/chat/handlers/streaming.ts` | Main chat streaming handler (modify) |
| `supabase/functions/chat/handlers/tool-calling-chat.ts` | Tool-calling streaming handler (modify) |
| `supabase/functions/_shared/glm-client.ts` | Contains `parseStatusMarker()` to stop using |
| `src/hooks/useChatMessages.tsx` | Client-side phase detection (remove code) |
| `src/components/ReasoningDisplay.tsx` | Status display component (optional enhancements) |

---

## Agent Review Findings (Already Incorporated)

Three specialized agents reviewed this plan:

1. **Backend Architect**: Approved with conditional logic requirements (addressed in plan)
2. **Performance Engineer**: Recommended config tuning (incorporated in Task 2)
3. **Security Auditor**: Identified prompt injection risk (addressed in Task 1)

All findings have been incorporated into the implementation plan.

---

## What Success Looks Like

After implementation:
- [ ] Status messages are semantically meaningful (not just phase names)
- [ ] No client-side regex pattern matching remains
- [ ] Circuit breaker protects against GLM-4.5-Air failures
- [ ] Fallback messages appear when LLM unavailable
- [ ] No duplicate/conflicting status events in SSE stream
- [ ] Clean provider lifecycle (start → process → finalize → destroy)

---

## Commands for Testing

```bash
# Ensure Docker is running first
docker info

# Start local Supabase (requires Docker)
supabase start

# Start dev server
npm run dev

# Test artifact generation (observe status updates in network tab)
# Open http://localhost:8080 and request an artifact
```

**Rollback**: If something goes wrong, the ONLY rollback option is `git revert`. The feature flag does NOT restore the old system—it just disables status updates entirely.

---

## Remember

1. **Read the full plan** at `.claude/plans/reasoning-provider-activation.md` before starting
2. **Follow the plan exactly** - code snippets show before/after with line numbers
3. **Do not improvise** - ask the user if something is unclear or you want to change approach
4. **Mark tasks complete** as you finish them using TodoWrite
5. **Test incrementally** - verify each task works before moving to the next

---

**Start by reading the plan file, then begin with Task 1 (Security Fix).**
