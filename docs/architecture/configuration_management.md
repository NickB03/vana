# Configuration Management Architecture

[Home](../../index.md) > [Architecture](../index.md) > Configuration Management

This document describes VANA's architecture for managing system configurations. Proper configuration management is essential for security, flexibility across different environments (development, testing, production), and ease of deployment.

## 1. Overview

VANA primarily uses environment variables for configuration. These variables are loaded from `.env` files at the project root and accessed within the application through a dedicated Python module, `config/environment.py`. This approach keeps sensitive data like API keys out of version control and allows for easy modification of settings without code changes.

## 2. Architectural Diagram

```mermaid
graph TD
    subgraph ConfigurationSources["Configuration Sources"]
        DotEnvFile[".env File (Git-ignored)\n- API Keys\n- GCP Project ID\n- Endpoints\n- Feature Flags"]
        SystemEnvVars["System Environment Variables (Optional Fallback/Override)"]
    end

    subgraph VanaSystem["Vana System"]
        ConfigModule["Configuration Module (config/environment.py)\n- Loads .env\n- Provides typed access to settings"]

        subgraph ConfigConsumers["Configuration Consumers (Various Vana Components)"]
            direction LR
            CoreTools["Core Tools (tools/)"]
            DashboardApp["Dashboard (dashboard/)"]
            OperationalScripts["Operational Scripts (scripts/)"]
        end
    end

    %% Connections
    DotEnvFile -- "Primary source for" --> ConfigModule;
    SystemEnvVars -- "Can override/supplement" --> ConfigModule;

    ConfigModule -- "Provides settings to" --> CoreTools;
    ConfigModule -- "Provides settings to" --> DashboardApp;
    ConfigModule -- "Provides settings to" --> OperationalScripts;

    classDef configsource fill:#FFF2CC,stroke:#D6B656,stroke-width:2px;
    classDef vanamodule fill:#E1D5E7,stroke:#9673A6,stroke-width:2px;
    classDef vanaconsumer fill:#D5E8D4,stroke:#82B366,stroke-width:2px;

    class DotEnvFile, SystemEnvVars configsource;
    class ConfigModule vanamodule;
    class CoreTools, DashboardApp, OperationalScripts vanaconsumer;
```

## 3. Key Components

### 3.1. `.env` File
*   **Purpose:** The primary file for storing environment-specific configurations.
*   **Location:** Typically at the root of the VANA project.
*   **Content:** Contains key-value pairs defining environment variables, such as:
    *   GCP Project ID (`GOOGLE_CLOUD_PROJECT`)
    *   Path to GCP Service Account credentials (`GOOGLE_APPLICATION_CREDENTIALS`)
    *   API keys for external services (e.g., `MCP_API_KEY`, `GOOGLE_SEARCH_API_KEY`)
    *   Service endpoints (e.g., `VECTOR_SEARCH_ENDPOINT_ID`, `MCP_ENDPOINT`)
    *   Feature flags or behavior modifiers (e.g., `DASHBOARD_AUTH_ENABLED`, `USE_LOCAL_MCP`)
    *   VANA environment mode (`VANA_ENV`)
*   **Security:** This file should **NOT** be committed to version control (i.e., it should be listed in `.gitignore`). Each developer or deployment environment will have its own `.env` file.
*   **Template:** An example file, `.env.example`, is provided in the repository, listing all necessary variables with placeholder or default values. Users should copy this to `.env` and fill in their specific details.

### 3.2. `config/environment.py` Module
*   **Purpose:** This Python module is responsible for loading, parsing, and providing access to configuration variables within the VANA application.
*   **Key Responsibilities:**
    *   **Loading `.env`:** Uses a library like `python-dotenv` to load variables from the `.env` file into the process's environment.
    *   **Accessing System Environment Variables:** Can also read variables set directly in the system environment, which can override those in the `.env` file.
    *   **Type Conversion:** Converts environment variables (which are typically strings) into appropriate Python types (e.g., integers, booleans, lists).
    *   **Default Values:** Provides sensible default values for optional settings if they are not defined in the environment.
    *   **Centralized Access:** Offers a single, consistent way for all VANA components to access configuration settings.
    *   **Environment-Specific Logic:** May include logic based on the `VANA_ENV` variable (e.g., using a local MCP server endpoint if `VANA_ENV=development` and `USE_LOCAL_MCP=true`).
*   **Usage:** Other VANA modules import settings directly from `config.environment` (e.g., `from config.environment import GCP_PROJECT_ID`).

### 3.3. Configuration Consumers
*   These are any parts of the VANA system that require configuration settings to function:
    *   **Core Tools (`tools/`):** Clients for external services (`VectorSearchClient`, `KnowledgeGraphManager`, `WebSearchClient`) need API keys and endpoints. Other tools might need feature flags or operational parameters.
    *   **Dashboard (`dashboard/`):** The Flask backend and Streamlit frontend need settings for authentication, secret keys, API endpoints, etc.
    *   **Operational Scripts (`scripts/`):** Scripts for scheduled tasks or utilities often require configuration for connecting to services or defining their behavior.

## 4. Configuration Loading Process

1.  When a VANA application component or script starts, it typically imports necessary settings from `config.environment`.
2.  The `config/environment.py` module, upon its first import, executes its loading logic:
    *   It attempts to find and load a `.env` file from the project root (or a specified path).
    *   Variables from the `.env` file are loaded into the environment of the current process.
    *   The module then reads these variables (and any pre-existing system environment variables), performs type conversions, applies defaults, and makes them available as Python constants or attributes.
3.  The consuming component can then use these typed and validated settings.

## 5. Environment-Specific Configurations (`VANA_ENV`)

The `VANA_ENV` environment variable (e.g., `development`, `test`, `production`) plays a crucial role:

*   It allows `config/environment.py` to adjust certain settings based on the environment. For example:
    *   Using a local development MCP server in `development` vs. a cloud-hosted one in `production`.
    *   Setting different logging levels.
    *   Enabling or disabling debug features.
*   It helps in organizing data or log files by potentially prefixing paths with the environment name.

## 6. Best Practices and Security
*   **Never commit `.env` files or actual secrets to version control.** Use `.env.example` as a template.
*   Store GCP service account keys and other sensitive files in a secure, git-ignored location (e.g., a `secrets/` directory at the project root).
*   Ensure file permissions on `.env` and secret files are restrictive in production environments.
*   For highly sensitive production environments, consider integrating with a dedicated secrets management service (e.g., Google Secret Manager, HashiCorp Vault) instead of relying solely on `.env` files. `config/environment.py` could be adapted to fetch secrets from such a service.

This configuration management architecture provides VANA with a flexible and secure way to handle its diverse settings across different operational environments.
