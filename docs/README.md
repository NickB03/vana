# Vana Project Documentation

## Overview

Official technical documentation for the Vana multi-agent AI research platform.

## Documentation Index

### API Documentation
- [**API Reference**](./API.md) - Complete REST API documentation for the Vana platform
- [**ADK API Reference**](./adk-api-reference.md) - Google Agent Development Kit integration reference

### Architecture Documentation
- [**Frontend Architecture**](./frontend/) - Frontend SSE architecture and implementation details
  - [SSE Architecture](./frontend/sse-architecture.md) - Server-Sent Events system design
  - [SSE Memory Leak Fix](./frontend/sse-memory-leak-fix.md) - Memory management solutions
  - [SSE Quick Reference](./frontend/sse-quick-reference.md) - SSE implementation guide

### Deployment Documentation
- [**Docker Deployment Guide**](./DOCKER_DEPLOYMENT_GUIDE.md) - Container deployment and orchestration

## About Vana

Vana is a multi-agent AI research platform built on Google's Agent Development Kit (ADK) that transforms complex research questions into comprehensive reports. The system orchestrates 8 specialized AI agents working collaboratively with real-time streaming capabilities via Server-Sent Events (SSE).

For development setup and contribution guidelines, see the main [README.md](../README.md) in the project root.