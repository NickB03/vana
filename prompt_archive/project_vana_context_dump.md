# Project Vana – Context Dump
**Date & Timestamp:** 2025-04-18 19:47:48

---

## 🎯 Project Goal

**Project Vana** (Virtual Autonomous Neural Agents) is designed to serve as a portfolio-quality, demo-ready AI agent system. The system is meant to simulate a fully functional AI software development team with real capabilities — not mocked demos.

This project has dual purposes:
- **Portfolio & Demo:** A compelling, explainable, and accessible demo to showcase to hiring managers, recruiters, or stakeholders.
- **Utility & Future Launch:** A foundational platform for building creative projects and potentially launching a real SaaS or AI developer assistant product.

---

## 🤖 Core Components & Decisions

### 1. **AI Agents (CrewAI)**
- YAML-based role configuration (ben, rhea, sage, kai, juno, max)
- Designed around actual developer workflows
- Will be connected via orchestrators and not mock tasks
- Will integrate into Supabase for real backend logic

### 2. **Frontend (Lovable.dev)**
- Utilizes Lovable's real-time no-code/low-code UI builder
- Strict instruction: **no mocked logic**
- All integrations (Supabase, APIs) must be real
- Prompts must follow Lovable's CLEAR method and leverage:
  - [Tips & Tricks Prompting](https://docs.lovable.dev/tips-tricks/prompting-one)
  - [Prompt Library Usage](https://docs.lovable.dev/tips-tricks/prompting-library)
  - [Supabase Integration](https://docs.lovable.dev/integrations/supabase)
  - [NPM/Package Guidance](https://docs.lovable.dev/features/npm-packages)
  - [API Usage](https://docs.lovable.dev/integrations/prompt-integrations)

### 3. **Backend (Supabase)**
- Automated integration through Lovable
- Acts as the real backend for authentication, storage, database
- No use of mock endpoints — all endpoints must return data or be functionally scaffolded

### 4. **RAG System**
- Will be integrated as a modular, reusable backend pipeline
- LLM: PrivateGPT
- Embeddings via: Vertex AI
- Index/Vector store: Can use SQLite locally, will evolve to BigQuery-compatible or Supabase support
- Future goal: cross-project reusable architecture

### 5. **Deployment**
- Targeting **GCP** with Cloud Run, Firestore, and Storage
- Local testing will be limited to sandboxing only if needed
- Cloud-native first to accelerate demo readiness

---

## 🔄 Orchestration & Glue

- `n8n` is still used for orchestrating agent-to-agent communication and tool integration
- Optional: extendable to include temporal or LangGraph orchestration if needed
- Future idea: include observable dashboards for live agent state via n8n flows or custom UI (Max’s responsibility)

---

## 🔐 Architectural Summary

- Each agent runs in its own task/process (CrewAI)
- Persistent context and state tracked in Supabase
- RAG pipeline manages vector memory
- Lovable frontend provides UI interaction — backed by real data
- Supabase acts as the secure and scalable backend
- Cloud Run provides deployable API endpoints
- Developer code agent (Augment) handles non-Lovable coding

---

## ✅ Status

- Agent config scaffold complete
- README updated with full instructions
- Project is now named **Project Vana**
- Ready for Supabase schema, backend RPC logic, and final UI flows
- Package integrity confirmed and ready for GitHub repo creation

---

## ⏭️ Next Steps (for future agent/developer)

1. Use the `README.md` to continue Supabase integration (no mock logic)
2. Deploy agents using CrewAI and start wiring them to real endpoints
3. Build out Supabase tables and APIs
4. Extend RAG support with PrivateGPT
5. Launch to Cloud Run
