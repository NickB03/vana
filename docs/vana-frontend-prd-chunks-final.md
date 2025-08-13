Chunk 1 — Project Context & Foundations
Scope: High-level product vision, technology stack, architecture overview.
PRD Sections: 1 (Executive Summary) → 3 (Architecture Overview).
Reasoning: Claude needs the “why” and “tech constraints” upfront, so all code aligns. But we stop before user flows to keep context lean.
Claude Instruction:
“Use only the technologies, folder structure, and architecture described here. You must not change any tech choices, directory names, or design paradigms. No implementation beyond scaffolding.”
Chunk 2 — Homepage & Chat Flow
Scope: Core user flows from landing page to chat interface, including Homepage UI and chat transitions.
PRD Sections: 4.1–4.2, 6.1–6.2.
Reasoning: These are interdependent — Claude must wire homepage to chat exactly as per PRD. Kept separate from SSE so UI is done first.
Claude Instruction:
“Implement the homepage → chat navigation flow exactly as described. Do not build any backend logic. Only implement UI and routing as per the provided code snippets and layout.”
Chunk 3 — Authentication System
Scope: JWT + Google OAuth frontend flow, token storage, refresh logic, and UI component.
PRD Sections: 5.1–5.4.
Reasoning: Auth is an isolated subsystem and can be fully implemented without polluting chat/canvas logic.
Claude Instruction:
“Implement authentication exactly as described — no Firebase, no invented endpoints. Use /auth/google and backend JWT storage pattern only.”
Chunk 4 — SSE Connection Layer
Scope: SSE connection manager, event handling, reconnection logic.
PRD Sections: 7.1, 13.2.
Reasoning: Critical to get backend compatibility right; separate from UI rendering so it can be tested in isolation.
Claude Instruction:
“Implement SSE connection exactly as per endpoint /agent_network_sse/{sessionId} and the event map. Do not change event names, payload shapes, or retry strategy.”
Chunk 5 — Chat Rendering
Scope: Rendering of messages, research sources, code block handling, canvas integration trigger.
PRD Sections: 7.2, 14.2 (Code Block).
Reasoning: Rendering depends on SSE delivering the right events; this follows after SSE implementation.
Claude Instruction:
“Render messages exactly as per spec. Code blocks must open in Canvas with onOpenInCanvas. Match styling, classes, and component names.”
Chunk 6 — Progressive Canvas System
Scope: Store, mode switching, conversion logic, editor components.
PRD Sections: 8.1–8.3.
Reasoning: Large enough to need its own chunk; has internal dependencies but no backend calls yet.
Claude Instruction:
“Implement Canvas exactly as described — progressive enhancement only, storing locally. Follow provided store, toolbar, and editor component structure exactly.”
Chunk 7 — File Upload Integration
Scope: FileUploader component, .md detection, Canvas open on upload.
PRD Sections: 9.1.
Reasoning: This is a single self-contained feature that connects upload to Canvas, so it’s safe to isolate.
Claude Instruction:
“Build file upload as described — enforce file size limits, .md auto-open, and accept list exactly as stated.”
Chunk 8 — Agent Visualization
Scope: Agent Task Deck & Inline Task List.
PRD Sections: 10.1–10.2.
Reasoning: Can be implemented after SSE events exist; best isolated to avoid context overflow.
Claude Instruction:
“Implement agent visualization exactly as described, including animations, ordering, and status icons.”
Chunk 9 — Session Management
Scope: Zustand store, sidebar component, persistence rules.
PRD Sections: 11.1–11.2.
Reasoning: Interacts with chat and homepage, but mostly isolated in store/UI logic.
Claude Instruction:
“Implement session management exactly as described — do not alter store schema, persistence behavior, or sidebar layout.”
Chunk 10 — Unified State Management
Scope: Root store, subscriptions.
PRD Sections: 12.1–12.2.
Reasoning: Comes last in state setup to integrate all prior chunks.
Claude Instruction:
“Implement unified store and subscriptions exactly as provided. Do not change store names or subscription triggers.”
Chunk 11 — API Client
Scope: API client methods, error handling for API calls.
PRD Sections: 13.1.
Reasoning: Cleanly separated so Claude doesn’t invent endpoints during UI builds.
Claude Instruction:
“Implement API client exactly as described. Do not rename methods or alter endpoint paths.”
Chunk 12 — UI Component Map & Styling
Scope: Component usage mapping, CodeBlock behavior, Tailwind config, typography.
PRD Sections: 14.1–15.2.
Reasoning: Styling changes can safely be applied after functionality is in place.
Claude Instruction:
“Implement component imports, shadcn/ui usage, and Tailwind theme exactly as described.”
Chunk 13 — Error Handling & Accessibility
Scope: Error types, recovery logic, accessibility compliance.
PRD Sections: 16–17.
Reasoning: Adds robustness without changing functionality.
Claude Instruction:
“Add error handling and accessibility features exactly as described, without removing or altering existing functionality.”
Chunk 14 — Performance & Security
Scope: Performance targets/strategies, CSP headers, input sanitization, auth security.
PRD Sections: 18–19.
Reasoning: End-of-build optimizations; must come after core functionality.
Claude Instruction:
“Apply performance and security measures exactly as described. Do not skip CSP adjustments for Monaco.”
Chunk 15 — Testing
Scope: Unit, E2E, and performance tests.
PRD Sections: 20.1–20.3.
Reasoning: Full implementation first, then tests that enforce spec compliance.
Claude Instruction:
“Write tests exactly as described. Match test structure, frameworks, and example cases.”
Chunk 16 — Deployment & Roadmap
Scope: Env config, Dockerfile, CI/CD, phased rollout.
PRD Sections: 21–22.
Reasoning: Purely delivery-focused; comes last so code is ready to deploy.
Claude Instruction:
“Implement deployment exactly as described. Match environment variable names, Docker steps, and GitHub Actions workflow.”
Chunk 17 — Critical Gap Resolutions
Scope: Final adjustments for Canvas backend gap, SSE naming, auth approach, model display.
PRD Sections: 23.1–23.4.
Reasoning: These are overrides to ensure earlier work doesn’t drift from backend reality.
Claude Instruction:
“Review and adjust prior implementation to match these critical resolutions exactly.”
If you want, I can now produce Claude-ready prompt templates for each chunk — meaning each one would contain the PRD excerpt + the guardrail instructions in Claude-friendly language, so you can paste them straight into Claude Flow without it going off-spec.
