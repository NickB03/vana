# VANA Installation Guide

[Home](../../index.md) > [Guides](../index.md) > Installation Guide

This guide provides step-by-step instructions for installing and setting up the VANA project on your local machine.

## 1. Prerequisites

Before you begin, ensure you have met all the prerequisites outlined in the main [README.md](../../README.md#%EF%B8%8F-prerequisites) file. Key prerequisites include:

*   **Python:** Version 3.9 or higher.
*   **Git:** For cloning the repository.
*   **Google Cloud Platform (GCP) Account:** With billing enabled, a project ID, and necessary APIs enabled (Vertex AI, Document AI).
*   **GCP Service Account:** A JSON key file with appropriate IAM permissions.
*   **API Keys:** For MCP Knowledge Graph and Google Custom Search, as applicable.
*   **External Tools:** Tesseract OCR installed and in your system's PATH if you plan to use the OCR capabilities of the current `DocumentProcessor`.

## 2. Cloning the Repository

1.  Open your terminal or command prompt.
2.  Navigate to the directory where you want to clone the VANA project.
3.  Run the following command:
    ```bash
    git clone https://github.com/NickB03/vana.git
    ```
4.  Change into the cloned project directory:
    ```bash
    cd vana
    ```

## 3. Setting Up a Python Virtual Environment

It is highly recommended to use a Python virtual environment to manage project dependencies and avoid conflicts with other Python projects or your system's Python installation.

1.  **Create the virtual environment:**
    From the project root directory (`vana/`), run:
    ```bash
    python3 -m venv .venv
    ```
    This creates a directory named `.venv` within your project, which will contain the Python interpreter and installed packages for this project.

2.  **Activate the virtual environment:**
    *   **On macOS and Linux:**
        ```bash
        source .venv/bin/activate
        ```
    *   **On Windows (Command Prompt):**
        ```bash
        .venv\Scripts\activate.bat
        ```
    *   **On Windows (PowerShell):**
        ```bash
        .venv\Scripts\Activate.ps1
        ```
    After activation, your terminal prompt should change to indicate that you are now working within the `.venv` environment (e.g., `(.venv) your-prompt$`).

## 4. Installing Dependencies

All core Python dependencies for VANA are listed in the `requirements.txt` file at the root of the project.

1.  Ensure your virtual environment is activated.
2.  From the project root directory (`vana/`), install the dependencies:
    ```bash
    pip install -r requirements.txt
    ```
    This command will download and install all necessary Python packages for the dashboard, core tools (including document processing, Vector Search, Knowledge Graph, Web Search), and their dependencies.

3.  **Additional System Dependencies (if applicable):**
    *   **Tesseract OCR:** If you plan to use the OCR capabilities of the current `DocumentProcessor` (for image-based PDFs or image files), you must have the Tesseract OCR engine installed on your system and ensure its executable is in your system's PATH. Installation varies by OS (e.g., `sudo apt-get install tesseract-ocr` on Debian/Ubuntu, `brew install tesseract` on macOS).
    *   **spaCy Models (Optional):** If you extend VANA to use spaCy for advanced NLP and it's not included in the main `requirements.txt`, you might need to install it and download specific language models:
        ```bash
        # pip install spacy
        # python -m spacy download en_core_web_sm
        ```

## 5. Configuring Environment Variables

VANA relies on environment variables for critical settings like API keys, GCP project details, and service endpoints. These are managed using a `.env` file in the project root.

### 5.1. Using the Configuration Script (Recommended)

VANA provides a script to help set up your environment configuration:

```bash
# Create a demo environment configuration
./scripts/configure_environment.sh --env demo

# Create a development environment configuration
./scripts/configure_environment.sh --env development
```

The script will:
1. Copy the appropriate template from `config/templates/`
2. Prompt you to customize key configuration values
3. Verify the configuration for common issues

### 5.2. Manual Configuration

Alternatively, you can manually create and edit a `.env` file:

1.  **Create the `.env` file from a template:**
    Navigate to the project root directory (`vana/`) if you aren't already there. Copy one of the template configuration files:
    ```bash
    # Copy the demo template
    cp config/templates/.env.demo .env

    # Or copy the development template
    cp config/templates/.env.development .env
    ```

2.  **Edit the `.env` file:**
    Open the newly created `.env` file with your preferred text editor:
    ```bash
    nano .env  # Or use vscode, vim, etc.
    ```
    You will need to fill in the values for various variables. Refer to the [Vector Search Environment Configuration](../implementation/vector-search-environment.md) document for details on each variable.

    **Crucial variables to set include:**
    *   `GOOGLE_CLOUD_PROJECT`: Your GCP Project ID.
    *   `GOOGLE_APPLICATION_CREDENTIALS`: The **absolute path** to your GCP Service Account JSON key file. For example: `/Users/yourname/secrets/vana-gcp-key.json`. Ensure this file is stored securely.
    *   `GOOGLE_CLOUD_LOCATION`: Your preferred GCP region (e.g., `us-central1`).
    *   `VECTOR_SEARCH_ENDPOINT_ID`: Your Vertex AI Vector Search Endpoint ID.
    *   `VECTOR_SEARCH_ENDPOINT_NAME`: The full resource name for the Vector Search endpoint.
    *   `VECTOR_SEARCH_INDEX_ID`: Your Vector Search index ID.
    *   `VECTOR_SEARCH_DEPLOYMENT_ID`: Your Vector Search deployment ID.
    *   API keys for MCP and Google Custom Search if you plan to use those integrations.
    *   Dashboard-related settings like `DASHBOARD_SECRET_KEY`.

    Save the file after making your changes.

### 5.3. Verifying Your Configuration

To verify that your environment is configured correctly:

```bash
# Run the verification script
python scripts/verify_vector_search_configuration.py
```

This script will check that all required environment variables are set and that the Vector Search service is accessible (if configured to use the real service).

## 6. Verifying Installation (Basic Checks)

While comprehensive tests should be run (see development or testing guides), you can perform some basic checks:

1.  **Check Python and pip:**
    Ensure they are using the versions from your virtual environment:
    ```bash
    which python
    which pip
    # On Windows: where python & where pip
    python --version
    pip --version
    ```
    The paths should point inside your `.venv` directory.

2.  **Try importing a key module (optional):**
    You can start a Python interpreter and try to import a VANA module to see if paths and basic dependencies are okay:
    ```bash
    python
    ```
    Then in the Python interpreter:
    ```python
    from config import environment
    print(environment.GCP_PROJECT_ID)  # Should print your project ID if .env is set up
    exit()
    ```

## 7. Next Steps

With the installation complete, you can proceed to:

*   **Run the Monitoring Dashboard:** See the [Running the Dashboard guide](running-dashboard.md) or the [Usage section in the main README.md](../../README.md#%EF%B8%8F-usage).
*   **Explore Operational Scripts:** Check out scripts in the `scripts/` directory for tasks like testing Vector Search health.
*   **Dive into Development:** If you're contributing to VANA, consult the development workflow and coding standards (to be detailed in `docs/development/`).

If you encounter any issues during installation, refer to the [Troubleshooting Guide](../troubleshooting/index.md) or specific error messages for guidance.
