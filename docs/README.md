# VANA Documentation

This directory contains the reorganized documentation for the VANA project. The documentation is organized into the following sections:

## Directory Structure

- **architecture/**: System design and component relationships
  - Overview of the system architecture
  - Component architecture documentation
  - Design principles and patterns

- **implementation/**: Implementation details for each component
  - Code-level documentation
  - Class and function descriptions
  - Configuration options

- **guides/**: User and developer guides for setting up, configuring, and using Vana components.
  - Step-by-step instructions
  - Command references
  - Best practices

- **reference/**: Detailed technical reference material.
  - API specifications (Flask API, Python classes/modules)
  - Configuration variable lists
  - CLI command usage

- **integrations/**: Details on how Vana integrates with external services.
  - MCP integration (for Knowledge Graph)
  - Vertex AI integration (Vector Search, Embeddings, planned Document AI)
  - Google Custom Search API

- **project/**: Project management and overview documents.
  - Roadmap (reflecting Phase 1 MVP and Phase 2 MAS)
  - CHANGELOG

- **api/**: (Consider merging into `reference/` or keeping for specific service API contracts)
  - API endpoints
  - Request/response formats

- **troubleshooting/**: Common issues, FAQs, and solutions.

- **archive/**: Contains documentation related to previous project versions, deprecated features, or outdated sprint plans.

## Navigation

The documentation is designed to be navigable through the following entry points:

- **[Main Index (Table of Contents)](index.md)**: The primary entry point for all documentation.
- **[Architecture Index](architecture/index.md)**: Overview of system architecture.
- **[Implementation Index](implementation/index.md)**: Details on specific component implementations.
- **[Guides Index](guides/index.md)**: How-to guides for various tasks.
- **[Reference Index](reference/index.md)**: Technical reference materials.
- **[Integrations Index](integrations/index.md)**: Information on external service integrations.
- **[Project Management Index](project/index.md)**: Project-level documents like roadmap and changelog.
- **[Troubleshooting Index](troubleshooting/index.md)**: Solutions to common problems.
- **[Archived Documentation Index](archive/index.md)**: Access to historical documentation.

## Maintenance Guidelines

When adding new documentation:

1. Place the document in the appropriate section
2. Update the relevant index file
3. Add links to related documents
4. Follow the template for the section
5. Use relative links for cross-references

## Templates

Templates for each section are available in the `templates` directory:

- [Architecture Template](templates/architecture_template.md)
- [Implementation Template](templates/implementation_template.md)
- [Guide Template](templates/guide_template.md)
- [Integration Template](templates/integration_template.md)
