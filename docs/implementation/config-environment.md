# Configuration System Implementation (`config/environment.py`)

[Home](../../index.md) > [Implementation](../index.md) > Configuration System

This document details the implementation of VANA's configuration system, centered around the `config/environment.py` module. This system is responsible for loading, parsing, and providing access to environment-specific settings required by various VANA components.

## 1. Overview

VANA's configuration strategy relies on environment variables, primarily loaded from a `.env` file at the project root. The `config/environment.py` module acts as a centralized point for accessing these configurations in a typed and consistent manner throughout the application.

**Key Goals:**
*   Keep sensitive data (API keys, credentials) out of version control.
*   Allow easy configuration changes without modifying code.
*   Support different configurations for various environments (e.g., `development`, `test`, `production`).
*   Provide type-safe access to configuration values.
*   Offer default values for non-critical settings.

## 2. Core Module: `config/environment.py`

This Python module is the heart of the configuration system.

### 2.1. Structure and Responsibilities

```python
# config/environment.py (Conceptual Structure)
import os
from dotenv import load_dotenv
from pathlib import Path

# Determine project root and load .env file
# This assumes .env is in the parent directory of config/ (i.e., project root)
BASE_DIR = Path(__file__).resolve().parent.parent 
# For .env in project root:
# For .env in config/ (less common): # DOTENV_PATH = BASE_DIR / '.env' 
DOTENV_PATH = BASE_DIR / '.env' 

if os.path.exists(DOTENV_PATH):
    load_dotenv(dotenv_path=DOTENV_PATH, override=True)
else:
    # Optionally print a warning if .env is expected but not found
    print(f"Warning: .env file not found at {DOTENV_PATH}. Using system environment variables and defaults.")

# Helper function for type conversion and default values
def get_env_variable(var_name, default=None, var_type=str):
    value = os.getenv(var_name, default)
    if value is None and default is None and var_type is not bool : # bool can be False
        # For critical variables, you might raise an error if not set
        # raise ValueError(f"Environment variable {var_name} not set and no default provided.")
        print(f"Warning: Environment variable {var_name} not set and no default provided.")
        return None # Or return default if it was meant to be None

    if var_type == bool:
        if isinstance(value, str): # Check if value is a string before lower()
            return value.lower() in ['true', '1', 't', 'y', 'yes']
        return bool(value) # Handle if value is already bool or int
    if var_type == int and value is not None:
        try:
            return int(value)
        except ValueError:
            print(f"Warning: Could not convert {var_name}='{value}' to int. Using default: {default}")
            return default # Or raise error
    if var_type == list and isinstance(value, str):
        return [item.strip() for item in value.split(',')]
    
    # For other types or if value is already correct type
    if value is not None:
        try:
            return var_type(value)
        except (TypeError, ValueError):
            print(f"Warning: Could not convert {var_name}='{value}' to {var_type}. Using default: {default}")
            return default
            
    return default # If value was None and default was provided

# --- VANA Environment ---
VANA_ENV = get_env_variable("VANA_ENV", "development") # E.g., development, test, production
IS_DEVELOPMENT = (VANA_ENV == "development")
IS_PRODUCTION = (VANA_ENV == "production")

# --- GCP Configuration ---
GCP_PROJECT_ID = get_env_variable("GOOGLE_CLOUD_PROJECT")
GCP_SERVICE_ACCOUNT_PATH = get_env_variable("GOOGLE_APPLICATION_CREDENTIALS") # Path to JSON key file
GCP_LOCATION = get_env_variable("GOOGLE_CLOUD_LOCATION", "us-central1")

# --- Vertex AI Vector Search ---
VECTOR_SEARCH_ENDPOINT_ID = get_env_variable("VECTOR_SEARCH_ENDPOINT_ID")
DEPLOYED_INDEX_ID = get_env_variable("DEPLOYED_INDEX_ID")
# Potentially other VS settings like embedding model ID

# --- MCP Knowledge Graph ---
MCP_ENDPOINT_DEFAULT = "http://localhost:5000" if IS_DEVELOPMENT and get_env_variable("USE_LOCAL_MCP", False, bool) else "https://mcp.community.augment.co"
MCP_ENDPOINT = get_env_variable("MCP_ENDPOINT", MCP_ENDPOINT_DEFAULT)
MCP_NAMESPACE = get_env_variable("MCP_NAMESPACE", "vana-default")
MCP_API_KEY = get_env_variable("MCP_API_KEY") # Should be None if not set, critical

# --- Google Custom Search (Web Search) ---
GOOGLE_SEARCH_API_KEY = get_env_variable("GOOGLE_SEARCH_API_KEY")
GOOGLE_SEARCH_ENGINE_ID = get_env_variable("GOOGLE_SEARCH_ENGINE_ID")

# --- Dashboard Configuration ---
DASHBOARD_SECRET_KEY = get_env_variable("DASHBOARD_SECRET_KEY", "default_very_secret_key_for_dev_only")
DASHBOARD_AUTH_ENABLED = get_env_variable("DASHBOARD_AUTH_ENABLED", True, bool)
DASHBOARD_CREDENTIALS_FILE = get_env_variable("DASHBOARD_CREDENTIALS_FILE", str(BASE_DIR / "dashboard" / "auth" / "credentials.json.example"))
FLASK_PORT = get_env_variable("FLASK_PORT", 5000, int)
FLASK_DEBUG = get_env_variable("FLASK_DEBUG", IS_DEVELOPMENT, bool) # Debug mode based on VANA_ENV

# --- Logging Configuration ---
LOG_LEVEL = get_env_variable("LOG_LEVEL", "INFO" if IS_PRODUCTION else "DEBUG").upper()
LOG_FILE_PATH = get_env_variable("LOG_FILE_PATH", str(BASE_DIR / "logs" / "vana_app.log"))
# Ensure logs directory exists (can be done here or in logger setup)
# Path(LOG_FILE_PATH).parent.mkdir(parents=True, exist_ok=True)


# --- Hybrid Search Configuration (Example) ---
HYBRID_SEARCH_MAX_PER_SOURCE = get_env_variable("HYBRID_SEARCH_MAX_PER_SOURCE", 5, int)
HYBRID_SEARCH_RANKING_STRATEGY = get_env_variable("HYBRID_SEARCH_RANKING_STRATEGY", "default_rrf")
HYBRID_WEIGHT_VS = get_env_variable("HYBRID_WEIGHT_VS", 0.5, float)
HYBRID_WEIGHT_KG = get_env_variable("HYBRID_WEIGHT_KG", 0.3, float)
HYBRID_WEIGHT_WEB = get_env_variable("HYBRID_WEIGHT_WEB", 0.2, float)


# --- Other Application Settings ---
# VANA_DATA_DIR = get_env_variable("VANA_DATA_DIR", str(BASE_DIR / "data"))
# Path(VANA_DATA_DIR).mkdir(parents=True, exist_ok=True)


# It's good practice to validate critical configurations
# For example, ensure GCP_PROJECT_ID is set if not in a specific mock/test mode
if not GCP_PROJECT_ID and VANA_ENV not in ["test_no_gcp", "mock"]: # Example conditional check
    # raise ValueError("CRITICAL: GOOGLE_CLOUD_PROJECT is not set in environment.")
    print("CRITICAL WARNING: GOOGLE_CLOUD_PROJECT is not set in environment.")

# Similarly for API keys if they are essential for core functionality
if not MCP_API_KEY and VANA_ENV not in ["test_no_mcp", "mock"]:
    print("WARNING: MCP_API_KEY is not set. Knowledge Graph features requiring auth may fail.")

```

*   **Imports:**
    *   `os`: For accessing system environment variables.
    *   `dotenv.load_dotenv`: From the `python-dotenv` library to load the `.env` file.
    *   `pathlib.Path`: For robust path manipulation.
*   **`.env` Loading:**
    *   Determines the project's base directory and the path to the `.env` file (usually at the project root).
    *   Calls `load_dotenv()` to load variables from `.env` into `os.environ`. `override=True` means variables in `.env` will take precedence over system-set environment variables if they conflict (this behavior can be debated; sometimes system vars should override).
*   **`get_env_variable` Helper Function:**
    *   A utility to retrieve an environment variable by name.
    *   Takes a `default` value if the variable is not set.
    *   Takes a `var_type` (e.g., `str`, `int`, `bool`, `list`) to perform type conversion.
    *   Handles boolean conversion for common string representations like "true", "1", "false", "0".
    *   Handles list conversion for comma-separated strings.
    *   Includes basic error handling for type conversion.
    *   May raise an error or print a warning for critical missing variables.
*   **Configuration Definitions:**
    *   Each configuration parameter used by VANA is defined as a top-level variable in this module (e.g., `GCP_PROJECT_ID`, `MCP_ENDPOINT`).
    *   These variables are populated by calling `get_env_variable` with the corresponding environment variable name, a default value (if applicable), and the expected type.
    *   Environment-specific logic can be applied (e.g., `MCP_ENDPOINT_DEFAULT` changing based on `VANA_ENV` and `USE_LOCAL_MCP`).
*   **Validation (Optional but Recommended):**
    *   Basic checks can be added at the end of the module to ensure critical configurations are present, raising an error or a prominent warning if not.

### 2.2. `.env` File and `.env.example`

*   **`.env`:** This file (git-ignored) contains the actual secrets and environment-specific values.
    ```env
    # .env (Example - DO NOT COMMIT ACTUAL SECRETS)
    VANA_ENV=development
    GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
    GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/gcp-service-account-key.json"
    # ... other variables ...
    MCP_API_KEY="your_mcp_api_key_here"
    LOG_LEVEL="DEBUG"
    ```
*   **`.env.example`:** This file (committed to version control) serves as a template, listing all required and optional environment variables with placeholder values or descriptions.
    ```env
    # .env.example
    VANA_ENV=development # development, test, or production

    # GCP Configuration
    GOOGLE_CLOUD_PROJECT=
    GOOGLE_APPLICATION_CREDENTIALS= # Path to your GCP Service Account JSON key file
    GOOGLE_CLOUD_LOCATION=us-central1
    # ... etc. ...
    ```

## 3. Usage in Application Components

Other VANA modules access configuration settings by importing them directly from `config.environment`:

```python
# In a tool like tools/vector_search/vector_search_client.py
from config import environment

class VectorSearchClient:
    def __init__(self):
        self.project_id = environment.GCP_PROJECT_ID
        self.location = environment.GCP_LOCATION
        self.endpoint_id = environment.VECTOR_SEARCH_ENDPOINT_ID
        # Use self.project_id, self.location etc. to initialize GCP clients
        # ...
```

## 4. Loading Order and Precedence

1.  **System Environment Variables:** Variables already set in the shell environment where the Python process is started.
2.  **`.env` File:** Variables loaded from the `.env` file. If `load_dotenv(override=True)` is used, these will overwrite any system environment variables with the same name. If `override=False` (or not specified, as default is `False` for `python-dotenv` versions < 1.0.0, and `True` for >=1.0.0 if `override` parameter is not explicitly passed), system variables take precedence. VANA's conceptual example uses `override=True`.
3.  **Default Values in `config/environment.py`:** If a variable is not found in either the system environment or the `.env` file, the default value specified in `get_env_variable` is used.

## 5. Managing Different Environments

The `VANA_ENV` variable is key:
*   Set `VANA_ENV=development` in your local `.env` file for development.
*   Set `VANA_ENV=production` in the environment of your production deployment.
*   `config/environment.py` can then use the value of `VANA_ENV` to adjust other settings (e.g., log levels, debug modes, default endpoints).

## 6. Security Considerations

*   The `.env` file containing secrets must **never** be committed to Git. Ensure it's in `.gitignore`.
*   The `GOOGLE_APPLICATION_CREDENTIALS` file should also be kept secure and git-ignored.
*   In production, consider more advanced secrets management solutions (e.g., Google Secret Manager, HashiCorp Vault) which `config/environment.py` could be adapted to query.

This system provides a robust and flexible way to manage VANA's configurations across different environments while keeping sensitive information secure.
