# VANA - AI Agent System

VANA is an advanced agentic AI system built on Google's Agent Development Kit (ADK).

## Quick Start

```bash
# Install dependencies
make setup

# Run development server
make dev
```

## Requirements

- Python 3.13+
- Poetry

## Architecture

### State Management

VANA uses ADK's native session state management for reliable, scalable state handling:

- **Session State**: Temporary workflow and conversation state
- **User Preferences**: Persisted across sessions with `user:` prefix
- **App Configuration**: Global settings with `app:` prefix
- **No External Dependencies**: No Redis or external state stores required

See `.claude_workspace/STATE_MANAGEMENT_GUIDE.md` for detailed documentation.

### Agent System

VANA features a hierarchical multi-agent architecture:

- **Orchestrator**: Routes requests to appropriate specialists
- **Research Specialist**: Information gathering and analysis
- **Security Specialist**: Security analysis and recommendations
- **Architecture Specialist**: System design and patterns
- **Data Science Specialist**: ML/AI model recommendations
- **DevOps Specialist**: Deployment and infrastructure

## Development

See `CLAUDE.md` for detailed development instructions.