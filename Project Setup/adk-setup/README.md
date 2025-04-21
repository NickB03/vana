# VANA ADK Implementation

This is the Agent Development Kit (ADK) implementation of the VANA multi-agent system, adapted from the original CrewAI scaffold.

## Features
- 6 specialized AI agents led by Ben (Project Lead)
- Shared vector storage via Vertex AI Vector Search
- Native multi-agent support through ADK
- Built-in developer UI for testing
- Deployment to Vertex AI Agent Engine

## Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Configure environment: `cp .env.example .env` and update values
3. Start development server: `adk web`
4. Deploy to production: `python deploy.py`

## Architecture
See ARCHITECTURE.md for detailed system design and component descriptions.
