# Security Overview

[Home](../../index.md) > [Architecture](../index.md) > Security Overview

This document provides an overview of the security considerations and implemented patterns within the VANA project. Security is an ongoing concern, and this document outlines the current approach.

## 1. Core Principles

VANA's security approach is guided by the following principles:

*   **Least Privilege:** Components and service accounts should only have the permissions necessary to perform their intended functions.
*   **Defense in Depth:** Employ multiple layers of security controls where appropriate.
*   **Secure Configuration:** Manage sensitive information like API keys and credentials securely, avoiding hardcoding.
*   **Authentication & Authorization:** Protect sensitive endpoints and functionalities.
*   **Auditability:** Log important security-related events.

## 2. Key Security Components & Considerations

### 2.1. Credential Management
*   **Environment Variables (`.env` files):**
    *   API keys (GCP, MCP, Google Custom Search), database credentials (if any), and other secrets are managed through environment variables.
    *   The `.env` file itself is git-ignored and should be specific to each deployment environment.
    *   `config/environment.py` is responsible for loading these variables into the application.
*   **GCP Service Accounts:**
    *   VANA uses GCP Service Account JSON key files for authenticating with Google Cloud services (Vertex AI, GCS, Document AI).
    *   These key files should be stored securely (e.g., in a `secrets/` directory that is git-ignored or managed via a secrets manager in a production environment).
    *   The path to the service account key is specified via the `GOOGLE_APPLICATION_CREDENTIALS` environment variable.
    *   IAM permissions for the service account should be scoped to the minimum required for VANA's operations (e.g., Vertex AI User, Storage Object Admin if GCS is used).

### 2.2. Dashboard Security (`dashboard/`)
*   **Authentication:**
    *   The Flask API backend (`dashboard/flask_app.py`) implements authentication for accessing the monitoring dashboard.
    *   This is controlled by the `DASHBOARD_AUTH_ENABLED` environment variable.
    *   User credentials (usernames and hashed passwords) are typically stored in a JSON file specified by `DASHBOARD_CREDENTIALS_FILE` (e.g., `dashboard/auth/credentials.json`). This file should be protected.
    *   Session management is handled by Flask, using a `DASHBOARD_SECRET_KEY` for signing session cookies.
*   **Authorization (Conceptual):**
    *   While current focus is on basic authentication, future enhancements could include role-based access control (RBAC) if different user roles with varying levels of access to the dashboard are required.
*   **HTTPS:**
    *   In a production deployment, the Flask API and Streamlit UI should be served over HTTPS to protect data in transit. This is typically handled by a reverse proxy (e.g., Nginx, Caddy) or a PaaS deployment environment.

### 2.3. API Security (External Services)
*   **MCP Server:** Communication with the MCP Knowledge Graph server uses an API key (`MCP_API_KEY`) for authentication, sent as part of the HTTP request.
*   **Google Custom Search API:** Uses an API key (`GOOGLE_SEARCH_API_KEY`) and a Custom Search Engine ID (`GOOGLE_SEARCH_ENGINE_ID`).
    *   **Note:** A known issue is that `tools/web_search_client.py` currently contains a hardcoded API key. This needs to be refactored to use the environment variables.
*   **GCP Services:** Authenticated via the Service Account credentials.

### 2.4. Input Validation & Sanitization
*   **API Endpoints:** Any data received by the Flask API (e.g., from the Streamlit UI or other clients) should be validated and sanitized to prevent common web vulnerabilities (e.g., XSS, injection attacks), although the current dashboard API primarily serves data rather than accepting complex user inputs for processing.
*   **Tool Inputs:** Core tools in `tools/` that accept external input (e.g., search queries) should be mindful of how this input is processed, especially if it's used to construct queries for backend services.

### 2.5. Audit Logging
*   **Dashboard Audit Log:** The Flask API can be configured to log important events (e.g., login attempts, significant actions) to an audit log file specified by `DASHBOARD_AUDIT_LOG_FILE`.
*   **System Logging (`tools/logging/`):** While primarily for operational monitoring, structured logs can also aid in security investigations by providing a trail of system activities.

### 2.6. Dependency Management
*   Regularly updating dependencies (e.g., via `pip install -r requirements.txt --upgrade`) is important to patch known vulnerabilities in third-party libraries.
*   A consolidated `requirements.txt` (planned) will make this easier to manage.

## 3. Network Security
*   **Firewalls:** In a cloud deployment, GCP firewall rules should be configured to restrict access to VANA's components (e.g., Flask API, Streamlit UI) only from necessary IP ranges or VPCs.
*   **Internal Communication:** If VANA components were to be distributed across multiple machines/services, secure communication channels (e.g., TLS) would be essential.

## 4. Future Considerations
*   **Secrets Management:** For production, consider using a dedicated secrets management service (e.g., Google Secret Manager, HashiCorp Vault) instead of relying solely on `.env` files.
*   **Vulnerability Scanning:** Incorporate static and dynamic application security testing (SAST/DAST) tools into the development lifecycle.
*   **Rate Limiting:** Protect public-facing API endpoints (if any) from abuse.
*   **More Granular Access Control:** If the system grows to support multiple users with different roles, implement more fine-grained authorization.

This overview provides a snapshot of VANA's current security posture and areas for ongoing attention. Security is an iterative process, and these practices will evolve as the system develops.
