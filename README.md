# Vana - AI-Powered Development Assistant

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Vana is an AI-powered development assistant that transforms natural language into production-ready code, interactive React components, diagrams, and more. It leverages advanced language models to provide a seamless chat interface for generating interactive artifacts.

## Key Features

-   **Real-time Generation**: Streaming AI responses for immediate feedback.
-   **Interactive Artifacts**: Supports React components, HTML pages, Mermaid diagrams, and SVG graphics.
-   **Secure Architecture**: Built on Supabase with Row-Level Security (RLS) and strict authentication.
-   **Responsive Design**: Desktop and mobile capability.
-   **Smart Context**: Maintains conversation history with intelligent summarization.
-   **Developer-Friendly**: Full TypeScript support with modern tooling.

## Getting Started

### Prerequisites

-   Node.js v20+
-   npm v10+
-   Git

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/NickB03/llm-chat-site.git
    cd llm-chat-site
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

## Documentation

Comprehensive documentation is available in the `docs/` directory:

-   [User Guide](docs/USER_GUIDE.md)
-   [Architecture](docs/ARCHITECTURE.md)
-   [API Reference](docs/API_REFERENCE.md)
-   [Configuration](docs/CONFIGURATION.md)
-   [Contributing Guide](CONTRIBUTING.md)
-   [Changelog](CHANGELOG.md)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
