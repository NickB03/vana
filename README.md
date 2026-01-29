# Vana — AI Chat & Artifact Workspace

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Vana is a web-based AI chat and artifact workspace built with React, Vite, and Supabase. It focuses on interactive, runnable artifacts (React components, HTML, Mermaid diagrams, SVGs), with a chat-first UI and a modular design system to support rapid iteration and demos.

## Key Features (High Level)

- **Real-time chat UI** with streaming responses.
- **Interactive artifacts** rendered in Sandpack (React/HTML/SVG/Mermaid).
- **Supabase-backed** auth, storage, and Edge Functions.
- **Responsive layout** with a reusable design system.
- **TypeScript-first** codebase with Vite and Vitest.

## Quick Start

### Prerequisites

-   Node.js v20+
-   npm v10+
-   Git

### Installation

1.  Clone the repository:
    ```bash
    git clone <repo-url>
    cd <repo-directory>
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up environment variables:
    Create a `.env` file in the root directory and configure your Supabase credentials. See [Configuration](docs/CONFIGURATION.md) for details.

### Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:8080`.

## Documentation Index

Start with the documentation index for a map of the available guides:

- [Documentation Index](docs/INDEX.md)

### Core Guides
- [User Guide](docs/USER_GUIDE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Configuration](docs/CONFIGURATION.md)
- [API Reference](docs/API_REFERENCE.md)

### Engineering Guides
- [Development Patterns](docs/DEVELOPMENT_PATTERNS.md)
- [Testing Strategy](docs/TESTING_STRATEGY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [CI/CD Overview](docs/CI_CD.md)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
