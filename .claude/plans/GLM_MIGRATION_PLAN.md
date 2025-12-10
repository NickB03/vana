# GLM Migration Plan

> **Status**: Planning
> **Created**: 2025-11-29
> **Goal**: Use GLM as primary AI provider, OpenRouter as fallback

## Overview

Migrate from OpenRouter (Gemini) as primary to GLM (Z.ai) as primary for all AI calls except image generation. This simplifies API key management and consolidates on a single provider.

## Current State

### API Keys (6 total)
| Key | Status | Used By |
|-----|--------|---------|
| `OPENROUTER_GEMINI_FLASH_KEY` | Active | chat, reasoning, titles, summaries |
| `OPENROUTER_K2T_KEY` | **DEAD CODE** | Nothing (legacy Kimi) |
| `GLM_API_KEY` | Active | artifacts only |
| `TAVILY_API_KEY` | Active | web search |
| `GOOGLE_KEY_1-10` | Active (prod) | image generation |

### Model Usage
| Function | Provider | Model |
|----------|----------|-------|
| Chat | OpenRouter | `google/gemini-2.5-flash-lite` |
| Artifacts | Z.ai | `glm-4.6` |
| Fast Reasoning | OpenRouter | `google/gemini-2.5-flash-lite` |
| Titles | OpenRouter | `google/gemini-2.5-flash-lite` |
| Summaries | OpenRouter | `google/gemini-2.5-flash-lite` |
| Images | Google AI Studio | `gemini-2.5-flash-image` |

## Target State

### API Keys (3 total)
| Key | Purpose |
|-----|---------|
| `GLM_API_KEY` | Primary for chat, artifacts, reasoning, titles, summaries |
| `OPENROUTER_API_KEY` | Fallback for all text generation |
| `TAVILY_API_KEY` | Web search + content extraction |

*Note: Google keys remain for image generation (separate concern)*

### Model Usage
| Function | Primary | Fallback | Rationale |
|----------|---------|----------|-----------|
| Chat | GLM-4.6 | Gemini Flash | Best reasoning for complex queries |
| Artifacts | GLM-4.6 | Gemini Flash | Already using, proven quality |
| Fast Reasoning | GLM-4.6 | Gemini Flash | Consistent with chat |
| Titles | GLM-4.5-Flash | Gemini Flash | Simple task, fast model |
| Summaries | GLM-4.5-Flash | Gemini Flash | Simple task, fast model |
| Images | Gemini Flash Image | N/A | Keep as-is (best quality) |

## Rate Limits (Z.ai Coding Plan)

| Model | Concurrent Limit | Strategy |
|-------|------------------|----------|
| GLM-4.6 | 5 | Primary for complex tasks |
| GLM-4.5-Flash | 2 | Simple tasks only |

For a personal site with low traffic, these limits are sufficient. Fallback to OpenRouter handles burst scenarios.

## Implementation Phases

### Phase 1: Cleanup (Low Risk)
- [ ] Remove dead `OPENROUTER_K2T_KEY` references
- [ ] Remove unused `callKimi*` functions from `openrouter-client.ts`
- [ ] Update `.env.local.template` to remove K2T key

### Phase 2: GLM Chat Client (Medium Risk)
- [ ] Create `glm-chat-client.ts` with streaming support
- [ ] Mirror API structure of `openrouter-client.ts`
- [ ] Add proper error handling and retry logic
- [ ] Support reasoning extraction (like artifacts)

### Phase 3: Model Router (Medium Risk)
- [ ] Create `model-router.ts` to handle provider selection
- [ ] Implement fallback logic: GLM → OpenRouter
- [ ] Add circuit breaker for GLM failures
- [ ] Track provider usage for analytics

### Phase 4: Function Updates (Higher Risk)
- [ ] Update `chat/` to use model router
- [ ] Update `generate-reasoning/` to use model router
- [ ] Update `generate-title/` to use GLM-4.5-Flash
- [ ] Update `summarize-conversation/` to use GLM-4.5-Flash

### Phase 5: Simplify Keys
- [ ] Rename `OPENROUTER_GEMINI_FLASH_KEY` → `OPENROUTER_API_KEY`
- [ ] Update all environment references
- [ ] Update production secrets
- [ ] Update documentation

## File Changes Required

### New Files
```
supabase/functions/_shared/glm-chat-client.ts    # GLM streaming for chat
supabase/functions/_shared/model-router.ts       # Provider selection logic
```

### Modified Files
```
supabase/functions/_shared/openrouter-client.ts  # Remove Kimi functions
supabase/functions/_shared/config.ts             # Add GLM-4.5-Flash model
supabase/functions/chat/index.ts                 # Use model router
supabase/functions/generate-reasoning/index.ts   # Use model router
supabase/functions/generate-title/index.ts       # Use GLM-4.5-Flash
supabase/functions/summarize-conversation/index.ts # Use GLM-4.5-Flash
supabase/.env.local                              # Simplified keys
supabase/.env.local.template                     # Updated template
```

### Deleted Code
```
openrouter-client.ts: callKimiK2(), callKimiK2WithRetry()
config.ts: MODELS.KIMI_K2 (keep but mark deprecated)
```

## Rollback Strategy

Each phase can be rolled back independently:
1. **Phase 1**: No rollback needed (cleanup only)
2. **Phase 2-3**: New files, don't affect existing code
3. **Phase 4**: Feature flag or quick revert to direct OpenRouter calls
4. **Phase 5**: Rename keys back if needed

## Testing Strategy

1. **Unit Tests**: Add tests for `glm-chat-client.ts` and `model-router.ts`
2. **Integration Tests**: Test fallback scenarios
3. **Manual Testing**:
   - Chat with GLM primary
   - Force GLM failure, verify OpenRouter fallback
   - Verify reasoning extraction works

## Success Metrics

- [ ] All chat responses work with GLM as primary
- [ ] Fallback triggers correctly on GLM errors
- [ ] No increase in error rates
- [ ] Response quality maintained or improved
- [ ] API key count reduced from 6 to 3 (excluding Google image keys)

## Timeline Estimate

| Phase | Complexity |
|-------|------------|
| Phase 1 | Simple cleanup |
| Phase 2 | Medium - new client |
| Phase 3 | Medium - routing logic |
| Phase 4 | Higher - touch multiple functions |
| Phase 5 | Simple - rename keys |

## Notes

- GLM-4.6 already proven for artifacts - extending to chat is low risk
- OpenRouter fallback ensures reliability even if GLM has issues
- Can implement incrementally, one function at a time
- Consider adding provider preference per-function if needed later
