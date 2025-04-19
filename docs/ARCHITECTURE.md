# System Architecture

## Core Components
1. **Lovable UI** - Frontend interface handling user prompts and response display
2. **n8n Workflows** - Orchestration layer connecting UI events to backend processing
3. **Korvus Memory Service** - Vector database for context-aware AI operations
   - Embedding generation
   - Memory recall/search
   - Context management
4. **Gemini API** - LLM processing for:
   - Prompt generation
   - Response synthesis
   - Agent-specific task execution
5. **Supabase Database** - Relational storage for:
   - Agent action logs
   - System configurations
   - Audit trails

## Data Flow
1. User input → Lovable UI
2. Trigger → n8n workflow
3. Agent selection → Korvus memory search
4. Task execution → Gemini API
5. Result logging → Supabase + Korvus

## Tech Stack Matrix
| Component       | Tech Stack                          | Key Dependencies          |
|-----------------|-------------------------------------|---------------------------|
| Frontend        | Lovable UI (React)                  | Korvus API, n8n Webhooks   |
| Orchestration   | n8n (Cloud Run)                      | Supabase triggers, Gemini |
| Memory         | Korvus (PostgreSQL + pgvector)       | Gemini embeddings, Supabase |
| LLM Processing  | Gemini (Vertex AI)                  | Korvus search, n8n        |
| Database        | Supabase (PostgreSQL)                | n8n connectors, Korvus    |

## System Diagram
```mermaid
graph TD
    A[Lovable UI] --> B{n8n Workflows}
    B --> C{Agent Selection}
    C --> D[Gemini API]
    D --> E[Response Generation]
    E --> F[Supabase Logging]
    E --> G[Korvus Memory Update]
    F --> H[Database Storage]
    G --> H
