# Secure Credential Setup for VANA

[Home](../../index.md) > [Guides](../index.md) > Credential Setup

This guide explains how to set up and manage credentials securely for VANA, particularly for accessing Google Cloud Platform (GCP) services like Vertex AI Vector Search.

## Overview

VANA requires access to GCP services, which necessitates secure handling of service account credentials. The primary method for providing these credentials is via a GCP service account key file (JSON format).

## 1. GCP Service Account Key

### a. Creating a Service Account and Key

If you don't already have one, you need to create a service account in your GCP project with the necessary permissions for Vertex AI (e.g., Vertex AI User, Vertex AI Service Agent) and any other services VANA might use (like Cloud Storage or Document AI).

1.  **Go to the GCP Console:** Navigate to "IAM & Admin" > "Service Accounts".
2.  **Select your project.**
3.  **Click "+ CREATE SERVICE ACCOUNT".**
    *   Fill in the service account name (e.g., `vana-service-account`).
    *   Provide a description.
    *   Click "CREATE AND CONTINUE".
4.  **Grant Permissions:**
    *   Assign appropriate roles. For Vertex AI Vector Search, roles like "Vertex AI User" and potentially "Storage Object Viewer" (if data is in GCS) are common.
    *   Click "CONTINUE".
5.  **Grant users access (optional):** You can skip this for now.
6.  **Click "DONE".**
7.  **Create a Key:**
    *   Find the newly created service account in the list.
    *   Click the three dots (Actions) next to it and select "Manage keys".
    *   Click "ADD KEY" > "Create new key".
    *   Choose **JSON** as the key type.
    *   Click "CREATE". A JSON file will be downloaded to your computer. **This is your service account key file. Keep it secure.**

### b. Storing the Service Account Key File

*   **Do NOT commit this JSON key file to your Git repository.**
*   Store it in a secure location on the machine where VANA will run (e.g., your development machine, or a server if deploying).
*   A common practice is to place it in a non-versioned directory, for example, `~/.config/gcloud/` or a dedicated secure folder for your project outside the repository.

## 2. Configuring VANA to Use the Credentials

VANA's `config/environment.py` module is designed to pick up the path to this service account key file via an environment variable.

1.  **Set the `GOOGLE_APPLICATION_CREDENTIALS` Environment Variable:**
    This is the standard environment variable used by Google Cloud client libraries to find service account credentials.

    *   **For Local Development (in your `.env` file):**
        Add or update the following line in your `.env` file located in the VANA project root:
        ```env
        GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/downloaded-service-account-key.json"
        ```
        Replace `/path/to/your/downloaded-service-account-key.json` with the actual absolute path to the JSON key file you downloaded.

    *   **For Systemd Services (if deploying):**
        If you are running VANA components as systemd services (see [Deploying VANA Services with Systemd](./deployment-systemd.md)), this environment variable should also be available to the service. This can be achieved by:
        *   Ensuring the `EnvironmentFile` directive in your systemd service files points to a valid `.env` file that includes this variable.
        *   Alternatively, setting it directly in the systemd service file using the `Environment=` directive (less common for sensitive data like file paths).

2.  **Template for Credentials (Reference):**
    A template `config/templates/credentials.json.template` is provided as a reference for the structure of the GCP service account JSON file. You do not typically need to modify this template; use the actual JSON file downloaded from GCP.

## 3. How VANA Uses the Credentials

*   The `config/environment.py` module includes a `get_gcp_credentials()` method and logic within `get_vector_search_config()` that attempts to locate and validate the credentials file specified by `GOOGLE_APPLICATION_CREDENTIALS`.
*   Google Cloud client libraries (e.g., `google-cloud-aiplatform`) automatically detect and use the credentials pointed to by this environment variable for authentication when making API calls to GCP services.

## 4. Basic Validation

The `config/environment.py` script performs basic validation:
*   Checks if the `GOOGLE_APPLICATION_CREDENTIALS` environment variable is set.
*   Checks if the file specified by the variable exists.
*   Attempts to parse the JSON file and checks for the presence of essential keys (`type`, `project_id`, `private_key_id`, `private_key`, `client_email`).

If issues are detected (e.g., file not found, malformed JSON), warnings or errors will be logged.

## 5. Security Best Practices

*   **Principle of Least Privilege:** Grant your service account only the permissions it absolutely needs to function.
*   **Key Rotation:** Periodically create new keys for your service account and delete old ones. Update the `GOOGLE_APPLICATION_CREDENTIALS` path accordingly.
*   **Secure Storage:** Protect the JSON key file. Access to this file grants access to your GCP resources as the service account.
*   **Environment Variables:** Be cautious about where and how you set environment variables, especially in shared or production environments. Use secure mechanisms provided by your deployment platform if available (e.g., secret management services).
*   **Audit Logs:** Regularly review GCP audit logs to monitor the activity of your service accounts.

By following these steps, you can securely configure VANA to access the necessary GCP services.