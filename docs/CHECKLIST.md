# Vana Project Checklist — Lovable + Supabase + Korvus + Gemini + OCR

## ⟔�Foundation Completed
- [x] Directory structure scaffolded
- [x] BenAgent team defined
- [x] Korvus client + memory logic
- [x] Agent action logging via Supabase
- [x] n8n workflows: file trigger, prompt trigger, action log

## ⟔Orchestration (n8n)
- [x] trigger_on_agent_prompt.md
- [x] log_agent_action.md
- [x] logger_parser.py + agent_bridge.py

## 🔁 Supabase Integration
- [x] Schema: agent_action_log.sql
- [x] Supabase UI. used for table + RLS setup
- [x] Read-only + write roles defined
- [x] Korvus embeds logged to vector_index.table

## 🔁AI Systems
- [x] Gemini text + chat models (Vertex AI) enabled
- [x] embed_text() uses Vertex AI 'textembedding-gecko'
- [x] OCR: Document AI processor integrated (file upload – extracted text)

## 🔀DEVOPS + CODE AGENTS
- [x] Lovable prompts defined for backend services
- [x] Prompts live under `lovable_prompts/code/*.json`
- [x] VS code agents (RooCode, Augment) connected for fallback

## 🔀DOCS + Changelog
[] `CHANGELOG.md` updated per atomic commits
- [x] `/replay/:run_id` api added to cache replays
- [x] Lovable redefined as codegen engineer, not UI
