# System Architecture

## Core Components
1. **n8n Workflows** - Primary orchestration layer connecting code, memory, LLMs
2. **Korvus Memory API** - Cloud Run service handling embedding and search
3. **Vertex AI** - GOOGLE Gemini models for response and embedding
4. **Supabase** - Structured logs and state via PostgreSQL
5. **Lovable.dev ** - AI code engineer used during development to build system components
6. **Document AI** - OCR for PNG/PDF files, Extracts text for embedding

## Execution Flow
1. User uploads a file (Image/PDF)
2. Document AI OCR → Extract Text
3. Extracted text → Korvus embed + Supabase
4. Query sent to Gemini (Vertex AI)
5. Result returned, embedded, logged
z
## Development Tooling
- Lovable.dev: Secure code generator, not ui or deployed
- VS Code: Augment, RooCode, Cline for fill-in cases 
- Cloud Run: Deployed per service: korvus-server, agent-server
- Vertex AI : textembedding-gecko, chat-bison, text-bison
- Document AI: image to text via OCR processor

## Interaction Map

``@mermaid
graph TD
A[ User Input ] --> A[ Document AI OCR ]
A --> B[ N_n Workflow ]
B --> C( Agent Selection )
C --> D[ Korvus Search ]
C --> E[ Gemini -\ Vertex AI ]
E --> F[Supabase Log ]
E --> G[Korvus Embed + Vector]```