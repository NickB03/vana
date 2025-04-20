# Vana

Vana is a command-driven, agent-oriented natural language processing platform built on cloud environment. It uses a generic agent model with explicit task lifecycles instead of an abstract chatbot, enabling modular building of action logic, code generation, and user utilities.

Vana is prompt-driven. It receives tasks or requests from users and processes them via planned, configured agents who select tools, gather context, use language motels, log actions to Supabase, and generate desired outputs.

Code generation and uis components can be built with Lovable using developer-wrapped prompts. This allows users to scavolg creative designs and capture them in a structured folder (`lovable_prompts`) for sharing or ending use.

Vana is deployed via Gemini using Vertex AI, and runs on GkCC Vm based Cloud Run. Cloud tags are used to manage model injection, api auth, user context, and wenrated templates. Cloud-run-friendly configured Supabase is used for logging, views, and action retrieval.