---
title: System Overview
created: 2025-06-08T14:45:13.054180
source: vana_knowledge_base_creator
type: system_documentation
---

# VANA System Overview

VANA is a comprehensive multi-agent AI system built with Google ADK (Agent Development Kit) that provides autonomous task execution through specialized agents and tools.

## Key Features
- **24 Specialized Agents**: Each agent has specific capabilities and expertise
- **59+ Tools**: Comprehensive toolkit for file operations, search, analysis, and coordination
- **Optimization Framework**: 5-component system for performance and efficiency
- **Memory Systems**: ADK-based memory with RAG pipeline and vector search
- **Cloud-Native**: Deployed on Google Cloud Run with Vertex AI integration

## Architecture
- **Multi-Agent Orchestration**: Agents coordinate through session state sharing
- **Tool Ecosystem**: Standardized tools following ADK patterns
- **Memory Hierarchy**: Session → RAG → Vector → Web search
- **Optimization Components**: Strategy, Factory, Optimizer, Coordinator, Unified system

## Deployment
- **Development**: vana-dev environment (1 vCPU/1 GiB)
- **Production**: vana-prod environment (2 vCPU/2 GiB)
- **Technology Stack**: Python 3.13, Poetry, FastAPI, Google Cloud
