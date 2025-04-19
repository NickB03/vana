# Ben-Vana-Context — Handoff Summary (Pre-Promo Ready)

This document is full system context, deployment status, and frontend readiness for the Vana platform.
It serves as the memory anchor for agent routing, Lovable integration, and Korvus-based memory pipelines.

---

## SYSTEM OVERVIEW - “Ready for Prompt“

# Agent System
- Gemini-powered RAG pipeline with Korvus memory injection
- Persona-specific prompts via `agent_id` – configures `gemini_prompts/{agent}.system.md`
- Logs actions + metadata to Supabase
- Replay support: rerun any past prompt via "/replay/:run_id"

## Memory + Embedding
- Uses Korvus for context retrieval (`search_memory()`)
- Injected into full prompt block alongside task
- Embedding stored in Supabase PGVector

---
