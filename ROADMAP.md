# Vana - Product Roadmap

**Last Updated**: 2026-01-28
**Project**: Vana AI Development Assistant

---

## 📊 Quick Overview

| Status | Count | Features |
|--------|-------|----------|
| ✅ Recently Completed | 3 | Claude-Style Reasoning UI, Skills System v2, LLM Modernization |
| 🟡 Code Complete | 2 | Export Menu, Multi-Artifact Context |
| 📋 Planned | 4 | Canvas UI, Deep Research, MCP UI Integration, 2-Way Voice Chat |

---

## ✅ Recently Completed

### Skills System v2
**Priority**: P1 • **Implemented**: Jan 2026 • **User Impact**: Modular, extensible AI assistant behaviors

**Status**: ✅ Fully implemented and deployed to production (PR #571)

**What it does**: Dynamic context injection system for Claude Code commands. Skills are loaded on-demand into conversation context, enabling modular AI assistant behaviors.

**Implementation**:
- ✅ Skills loaded dynamically when slash commands are invoked
- ✅ Integrates with Claude Code hooks system
- ✅ Context injection preserves conversation flow
- ✅ Complete test coverage for skills integration

**Technical Details**:
- Skills stored in `.claude/skills/` directory
- On-demand loading reduces context overhead
- Seamless integration with existing command system
- All GLM references removed in associated cleanup (PR #574)

---

### LLM Integration Modernization
**Priority**: P1 • **Implemented**: Jan 2026 • **User Impact**: More reliable, faster AI responses

**Status**: ✅ Fully implemented and deployed to production (PR #563)

**What it does**: Comprehensive modernization of the LLM system with structured outputs, enhanced resilience, and reasoning transparency.

**Implementation**:
- ✅ Structured outputs with Zod schema validation
- ✅ Circuit breaker pattern for graceful degradation
- ✅ Intent confirmation events for immediate feedback (PR #569)
- ✅ Smooth streaming scroll with spring physics (PR #566)

**Key Improvements**:
- Reduced perceived latency via early intent detection
- Natural scroll behavior during fast streaming
- Typewriter effect for incoming text
- Fixed Safari streaming issues (PR #575)
- Resolved message ordering bugs (PR #576)

---

### Claude-Style Reasoning UI
**Priority**: P1 • **Implemented**: Nov 2025 • **User Impact**: Transparent AI thinking process

**Status**: ✅ Fully implemented and deployed to production

**What it does**: Displays Gemini 3 Flash's reasoning process in an expandable panel with live status updates, similar to Claude's "thinking" feature. Users can see the AI's thought process in real-time during artifact generation.

**Implementation**:
- ✅ Frontend: `src/components/ReasoningDisplay.tsx` (collapsible panel with status ticker)
- ✅ Backend: `supabase/functions/chat/` with Gemini reasoning support
- ✅ Unified gemini-client.ts: Handles all LLM operations with configurable thinking levels
- ✅ Documentation: `docs/REASONING_UI_ARCHITECTURE.md`, `docs/GEMINI_3_FLASH_GUIDE.md`

**Features**:
- Real-time reasoning stream with status updates ("Analyzing requirements...", "Designing structure...")
- Collapsible panel to reduce UI clutter when not needed
- Duration tracking (shows elapsed thinking time)
- Auto-scroll during streaming
- Preserved reasoning in message history

**Technical Details**:
- Gemini 3 Flash thinking mode with configurable levels (`reasoning: { effort: 'medium' }`)
- SSE streaming of reasoning_content chunks via OpenRouter
- Status extraction via regex patterns + LLM-powered semantic generation
- Circuit breaker fallback for status generation failures

**Reference**: `docs/GEMINI_3_FLASH_GUIDE.md`

---

## 🟡 Code Complete (Awaiting Integration)

### #6: Export Menu UI
**Priority**: P1 • **Effort**: 2-3 hours • **User Impact**: Download artifacts in various formats

**Status**: Export utilities fully implemented, UI integration needed

**Already Built**:
- ✅ Export utility functions (`src/utils/exportUtils.ts`)
- ✅ Download logic for all artifact types
- ✅ Format conversion (HTML, React, SVG, Markdown, Mermaid)

**Integration Checklist**:
- [ ] Add export button to artifact header
- [ ] Create export dropdown menu component
- [ ] Wire up export functions to UI
- [ ] Add success/error toast notifications
- [ ] Test across all artifact types

---

### #7: Multi-Artifact Context
**Priority**: P1 • **Effort**: 2-3 hours • **User Impact**: Work with multiple artifacts simultaneously

**Status**: Complete implementation (Nov 2024, commit `476e11a`), never integrated into production UI

**Already Built** (312 lines, 3 files):
- ✅ `MultiArtifactContext.tsx` (231 lines) - Provider with LRU eviction, sessionStorage persistence
- ✅ `MultiArtifactContextDef.ts` (69 lines) - TypeScript types and interfaces
- ✅ `use-multi-artifact.ts` (15 lines) - Hook for consuming context
- ✅ Features: Add/remove artifacts, minimize/maximize, duplicate detection, 5-artifact limit

**Integration Checklist**:
- [ ] Add multi-artifact UI controls to artifact container
- [ ] Implement minimize/maximize animations
- [ ] Add artifact switcher/tabs UI
- [ ] Test sessionStorage persistence
- [ ] Verify LRU eviction works correctly

**Quality**: Well-designed, fully tested, production-ready infrastructure

---

## 📋 Planned Features

### #21: MCP UI Integration - Inline Generative UI
**Priority**: P2 • **Effort**: 13-19 hours (MVP) • **User Impact**: Rich contextual widgets embedded in chat

**Vision**: Transform conversational responses into interactive visualizations:
```
User: "What's the weather in San Francisco?"
AI:   ┌─────────────────────────────────┐
      │ 🌤️ San Francisco               │
      │ 14.4°C • Partly Cloudy          │
      └─────────────────────────────────┘
      Perfect day for a walk!
```

**Key Differences from Artifacts**:
- **Artifacts**: Full-screen interactive components (React apps, diagrams)
- **Inline UI**: Small contextual widgets in message flow (weather, stocks, calculators)
- **Use Case**: "Show me data" vs "Create something"

**Technology**: [MCP UI](https://github.com/MCP-UI-Org/mcp-ui) - Community-driven SDK for interactive web components

**Why MCP UI?**
- ✅ Standardized protocol (TypeScript, Python, Ruby SDKs)
- ✅ Iframe isolation (matches our artifact security pattern)
- ✅ Built-in action system (tool calls, prompts, notifications)
- ✅ Future-proof path to Remote DOM rendering

**MCP UI Resource Types**:
| Type | Use Case |
|------|----------|
| `text/html` | Simple HTML widgets (MVP) |
| `text/uri-list` | Embedded external URLs |
| `application/vnd.mcp-ui.remote-dom+javascript` | Host-styled components (future) |

**Implementation Phases**:

**Phase 1: MVP (1-2 weeks)** - 13-19 hours
1. Type definitions (`src/types/mcpUI.ts`) - Zod schemas, SSE event parsing
2. MCPUIRenderer component - Render HTML widgets in sandboxed iframes
3. Server integration - Add `mcp_ui` event to streaming, demo tools
4. Testing - Type validation, component tests, browser verification

**Phase 2: Production (2-4 weeks)** - 14-20 hours
5. Full MCP Protocol - Connect to external MCP servers
6. Real widgets - Weather (OpenWeather), Stock (Alpha Vantage), Calculator

**Phase 3: Future** - 14-20 hours
7. Remote DOM support - Host component library rendering
8. Artifact migration - Unify artifacts and MCP UI rendering

**Benefits**:
- ✅ **Best-in-Class UX**: No other AI chat has both inline UI + full artifacts
- ✅ **Differentiation**: Unique competitive advantage
- ✅ **Extensibility**: Easy to add new tool types
- ✅ **Complements Artifacts**: Inline for quick data, artifacts for complex creations

**Challenges**:
- ⚠️ Tool execution timing (results may arrive after message completion)
- ⚠️ Preventing AI over-use (tool calls for everything)
- ⚠️ Cost management (tool calls = extra API requests)
- ⚠️ Mobile layout for inline widgets

**Success Criteria**:
- [ ] 5+ tool types implemented (weather, stock, calculator, datetime, converter)
- [ ] < 2s average tool execution time
- [ ] Graceful degradation (text fallback if tool fails)
- [ ] Mobile-friendly widget layouts
- [ ] Cost < $0.01 per tool call

**Feasibility**: ✅ Confirmed (2025-11-26)

---

### Canvas UI Redesign
**Priority**: P2 • **Effort**: 6-12 hours • **User Impact**: Match Claude's clean artifact interface design

**Goal**: Update artifact/canvas UI to match Claude's sharp, minimal design language

**Current vs Target**:
| Element | Current | Claude's Design |
|---------|---------|-----------------|
| Container corners | Rounded (8px) | Sharp corners (0px) |
| Header padding | Spacious (`px-4 py-3`) | Compact (`px-3 py-2`) |
| URL bar | Visible input field | Removed (filename only) |
| View toggle | Tab list below header | Icon buttons in header |
| Shadow | Subtle (`shadow-sm`) | Defined (`shadow-md`) |

**Implementation Phases**:

**Phase 1: Container Styling** (Low Risk - 1-2 hours)
- Remove rounded corners from artifact container
- Increase shadow depth for better definition
- Compact header padding
- Solid background instead of translucent

**Phase 2: Remove URL Bar** (Medium Risk - 2-3 hours)
- Remove `WebPreviewUrl` component from navigation
- Keep refresh and fullscreen controls
- Show filename only in header

**Phase 3: Header-Based View Toggle** (Higher Risk - 3-5 hours)
- Replace `TabsList` with icon buttons (Eye for Preview, Code for Edit)
- Move toggle controls to artifact header toolbar
- Maintain existing view switching logic

**Phase 4: Toolbar Simplification** (Optional - 2-3 hours)
- Consolidate actions: View toggles → Copy → Refresh → Close
- Move secondary actions (Export, Pop Out, Maximize) to dropdown

**Files to Modify**:
- `src/components/ai-elements/artifact.tsx` - Container styling
- `src/components/ArtifactRenderer.tsx` - Remove URL bar
- `src/components/ArtifactContainer.tsx` - View toggle refactor
- `src/components/ArtifactToolbar.tsx` - Add view toggle icons

**Testing Checklist**:
- [ ] Artifact container renders with sharp corners
- [ ] Header is more compact
- [ ] No URL input bar visible
- [ ] View toggle icons work (Preview/Code switching)
- [ ] All existing functionality preserved (copy, export, etc.)
- [ ] Dark mode styling consistent
- [ ] Server-bundled artifacts render correctly

---

### Deep Research
**Priority**: P1 • **Effort**: 60-80 hours (6-7 weeks) • **User Impact**: Multi-source AI research assistant

**Goal**: Implement comprehensive deep research feature similar to Gemini Deep Research, Claude Extended Thinking, and ChatGPT Deep Research

**Vision**: AI-powered research that searches multiple sources, synthesizes findings, shows reasoning, and produces interactive reports

**User Flow**:
```
User Question → Click "Research" → Multi-Phase Research Process
  ↓
Phase 1: Query Analysis (2-3s)
- GLM analyzes complexity
- Generates 5-10 sub-queries
  ↓
Phase 2: Web Research (10-30s)
- Z.ai Web Search Prime (primary, free with plan)
- Tavily fallback (if quota exceeded)
  ↓
Phase 3: Content Extraction (5-15s)
- Z.ai Web Reader (full content in markdown)
- Tavily Extract (fallback)
  ↓
Phase 4: Vision Analysis (optional)
- Z.ai Vision MCP for images/PDFs
  ↓
Phase 5: Synthesis (5-10s)
- GLM deep reasoning
- Structured report generation
  ↓
Result: Interactive artifact with sources
```

**Key Architecture Decision - Z.ai MCP Primary + Tavily Fallback**:
| Aspect | Z.ai MCP (Primary) | Tavily (Fallback) |
|--------|-------------------|-------------------|
| Cost | **$0** (included in Coding Max) | $0.001/search + extraction |
| Quota | 4,000 searches + readers/month | Pay per use |
| Web Search | Web Search Prime | Search API |
| Content Extract | Web Reader MCP | Extract API |
| Vision/OCR | Vision MCP ✅ | ❌ Not available |

**Estimated savings**: ~$35/month at 500 research queries

**Differentiators**:
- ✅ **Cost Efficiency**: Z.ai MCP included in plan (4,000 free calls/month)
- ✅ **Speed**: Parallel search + aggressive caching (30s-1.5min vs competitors' 1-5min)
- ✅ **Interactivity**: Research report as interactive artifact
- ✅ **Transparency**: Full reasoning chain visible
- ✅ **Vision Integration**: Analyze PDFs and images with Z.ai Vision MCP
- ✅ **Unified Stack**: Same API key for search, extraction, vision, synthesis

**Implementation Phases** (6-7 weeks total):

**Phase 1: Z.ai MCP Integration** (Week 1-2)
- Create `_shared/zai-mcp-client.ts` (Web Search Prime, Web Reader, Vision)
- Database table `zai_quota_tracking` for usage monitoring
- Fallback logic to Tavily when quota exceeded
- Unit tests for MCP client

**Phase 2: Backend Foundation** (Week 2-3)
- `generate-research/` Edge Function
- Query analyzer with GLM
- Search orchestrator (Z.ai primary, Tavily fallback)
- Content extractor with Z.ai Web Reader
- Vision analyzer with Z.ai Vision MCP
- Report synthesizer
- SSE streaming for all events

**Phase 3: Frontend Components** (Week 3-4)
- Research button in chat input
- `ResearchProgress` component (live progress updates)
- `ResearchArtifact` component (interactive report)
- Source citation cards
- Expandable sections

**Phase 4: Database & Caching** (Week 4-5)
- `research_data` JSONB column in `chat_messages`
- Query deduplication cache (24-hour TTL)
- Z.ai quota tracking RPC functions
- Usage analytics

**Phase 5: Polish & Optimization** (Week 5-6)
- Parallel search batching
- Content truncation (3000 chars max)
- Error handling and retry logic
- Mobile responsive design
- Dark mode support

**Phase 6: Launch & Monitoring** (Week 6-7)
- Rate limiting (guests: 3/hour, auth: 20/hour)
- Z.ai quota dashboard
- Fallback rate monitoring
- Cost tracking analytics

**Success Criteria**:
- [ ] Research completes in < 90 seconds
- [ ] Z.ai usage rate > 90% (< 10% fallback to Tavily)
- [ ] Cost per research < $0.07
- [ ] 5+ sources synthesized per research
- [ ] Interactive artifact with citations
- [ ] Vision analysis works for images and PDFs

**New Files Required**:
- `supabase/functions/generate-research/` (Edge Function)
- `supabase/functions/_shared/zai-mcp-client.ts` (Z.ai MCP integration)
- `src/components/ResearchProgress.tsx` (live progress UI)
- `src/components/ResearchArtifact.tsx` (interactive report)
- Database migration for `zai_quota_tracking` table

**Reference**: `.claude/roadmap/DEEP_RESEARCH_IMPLEMENTATION_PLAN.md`

---

### #22: 2-Way Voice Chat
**Priority**: P3 • **Effort**: 26-36 hours • **User Impact**: Hands-free conversation with AI via voice

**Vision**: Full voice conversation loop - speak to send messages, hear AI responses spoken aloud

**UI Addition**:
```
┌─────────────────────────────────────────────────────────────────────┐
│  Type your message...                                               │
│                                                                     │
│  [+] [🖼️] [✨] [🎤]                                        [➤]    │
│  File Image Artifact Voice ← NEW                            Send    │
└─────────────────────────────────────────────────────────────────────┘
```

**Architecture**:
```
User speaks → Web Speech API (STT) → handleSend() → AI response
                    FREE, ~100ms          ↓
                                    streamingMessage
                                          ↓
                              /generate-tts Edge Function
                                          ↓
                              VibeVoice-Realtime-0.5B (~300ms latency)
                                          ↓
                              Web Audio API → Speakers
```

**Technology Stack**:
| Component | Technology | Cost |
|-----------|------------|------|
| Speech-to-Text | Web Speech API (browser native) | FREE |
| Text-to-Speech | VibeVoice-Realtime-0.5B (Microsoft) | Self-hosted GPU |
| TTS Fallback | Google Cloud TTS | $0.016/1K chars |
| Audio Playback | Web Audio API | FREE |

**Why VibeVoice?**
- **~300ms first-audio latency** - Can start speaking while LLM generates
- **Open source (MIT)** - Self-hostable, no per-request costs at scale
- **Streaming support** - Plays audio chunks as they arrive
- **Natural voice quality** - 2.00% WER on LibriSpeech benchmark

**Implementation Phases**:

| Phase | Tasks | Effort | Dependencies |
|-------|-------|--------|--------------|
| **1. Voice Input** | Add 🎤 button, Web Speech API, auto-send on transcript | 8-10 hrs | None |
| **2. TTS Backend** | `/generate-tts` Edge Function, Google Cloud TTS fallback | 6-8 hrs | Phase 1 |
| **3. VibeVoice** | Self-host VibeVoice-Realtime, streaming audio playback | 8-12 hrs | Phase 2 |
| **4. Polish** | Voice mode settings, keyboard shortcuts, interrupt handling | 4-6 hrs | Phase 3 |

**New Files Required**:
- `src/hooks/useVoiceChat.ts` - Voice input/output hook
- `src/components/VoiceInputButton.tsx` - Microphone button component
- `supabase/functions/generate-tts/index.ts` - TTS Edge Function

**UI States**:
- **Idle**: Gray microphone icon
- **Listening**: Red pulsing ring (recording)
- **Processing**: Spinner (transcribing)
- **Speaking**: 🔊 indicator on message (AI speaking)

**Accessibility Benefits**:
- Screen reader users get natural voice instead of robotic TTS
- Hands-free operation for users with motor impairments
- Mobile users can listen while multitasking

**Risks & Mitigations**:
| Risk | Mitigation |
|------|------------|
| VibeVoice repo instability | Google Cloud TTS fallback ready |
| GPU hosting costs | Start with Replicate/Modal pay-per-use |
| Browser STT accuracy | Show transcript for user correction before send |
| Voice mode battery drain | Auto-disable after inactivity |

**Success Criteria**:
- [ ] Voice input works in Chrome, Safari, Edge
- [ ] < 500ms end-to-end STT latency
- [ ] < 1s end-to-end TTS latency (first audio)
- [ ] Voice mode toggle persists across sessions
- [ ] Graceful fallback when microphone denied

**References**:
- VibeVoice GitHub: https://github.com/microsoft/VibeVoice
- VibeVoice-Realtime-0.5B: https://huggingface.co/microsoft/VibeVoice-Realtime-0.5B
- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

---

## 📝 Notes

**Status Categories**:
- **✅ Recently Completed**: Features that have been fully implemented and deployed to production
- **🟡 Code Complete**: Features with all backend/utility code written but need UI integration
- **📋 Planned**: Features with detailed plans but not yet started

**Priority Levels**:
- **P1**: Critical for user experience, high business value - should be completed next
- **P2**: Important UX improvements, competitive differentiation - plan for Q1 2025
- **P3**: Nice-to-have enhancements, quality of life - plan for Q2 2025

**Effort Estimates**: Based on 1 developer working at steady pace, including testing, documentation, and browser verification.

**Code Complete Items**: These features have all backend/utility code written but need UI integration to become user-facing. Both Export Menu and Multi-Artifact Context can be completed in a single focused session (4-6 hours combined).

**Recommended Next Steps**:
1. **Quick wins** (4-6 hours): Integrate Export Menu + Multi-Artifact Context (both code complete)
2. **Visual refresh** (6-12 hours): Canvas UI Redesign (medium effort, high visual impact)
3. **Major feature** (60-80 hours): Deep Research (high priority, competitive differentiator)
4. **UX enhancement** (13-19 hours MVP): MCP UI Integration (unique feature)
5. **Future** (26-36 hours): 2-Way Voice Chat (accessibility + mobile UX)
