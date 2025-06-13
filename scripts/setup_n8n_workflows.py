#!/usr/bin/env python3
"""
Setup script for n8n workflows.

This script sets up the n8n workflows for the VANA project.
"""

import os
import sys
import json
import logging
import requests
import argparse
from getpass import getpass

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Setup n8n workflows for VANA")
    parser.add_argument("--n8n-url", help="n8n URL (e.g., http://localhost:5678)")
    parser.add_argument("--n8n-username", help="n8n username")
    parser.add_argument("--n8n-password", help="n8n password")
    parser.add_argument("--vector-search-api-url", help="Vector Search API URL")
    parser.add_argument("--vector-search-api-key", help="Vector Search API key")
    parser.add_argument("--mcp-server-url", help="MCP server URL")
    parser.add_argument("--mcp-api-key", help="MCP API key")
    parser.add_argument("--mcp-namespace", help="MCP namespace")
    parser.add_argument("--webhook-username", help="Webhook username")
    parser.add_argument("--webhook-password", help="Webhook password")
    parser.add_argument("--workflows-dir", help="Directory containing workflow JSON files", default="n8n-workflows")
    parser.add_argument("--env-file", help="Path to .env file to update", default=".env")
    parser.add_argument("--skip-env-update", help="Skip updating the .env file", action="store_true")
    return parser.parse_args()

def get_input(prompt, default=None, password=False):
    """Get input from the user."""
    if default:
        prompt = f"{prompt} [{default}]: "
    else:
        prompt = f"{prompt}: "
    
    if password:
        value = getpass(prompt)
    else:
        value = input(prompt)
    
    return value if value else default

def check_n8n_available(n8n_url):
    """Check if n8n is available."""
    try:
        response = requests.get(f"{n8n_url}/healthz", timeout=5)
        return response.status_code == 200
    except Exception as e:
        logger.warning(f"n8n not available: {e}")
        return False

def get_n8n_credentials(args):
    """Get n8n credentials."""
    n8n_url = args.n8n_url or get_input("n8n URL", "http://localhost:5678")
    
    # Check if n8n is available
    if not check_n8n_available(n8n_url):
        logger.error(f"n8n not available at {n8n_url}")
        sys.exit(1)
    
    n8n_username = args.n8n_username or get_input("n8n username", "admin")
    n8n_password = args.n8n_password or get_input("n8n password", password=True)
    
    return n8n_url, n8n_username, n8n_password

def get_api_credentials(args):
    """Get API credentials."""
    vector_search_api_url = args.vector_search_api_url or get_input("Vector Search API URL", "https://api.vector-search.example.com")
    vector_search_api_key = args.vector_search_api_key or get_input("Vector Search API key", password=True)
    mcp_server_url = args.mcp_server_url or get_input("MCP server URL", "https://mcp.community.augment.co")
    mcp_api_key = args.mcp_api_key or get_input("MCP API key", password=True)
    mcp_namespace = args.mcp_namespace or get_input("MCP namespace", "vana-project")
    
    return vector_search_api_url, vector_search_api_key, mcp_server_url, mcp_api_key, mcp_namespace

def get_webhook_credentials(args):
    """Get webhook credentials."""
    webhook_username = args.webhook_username or get_input("Webhook username", "vana_webhook")
    webhook_password = args.webhook_password or get_input("Webhook password", password=True)
    
    return webhook_username, webhook_password

def create_credentials(n8n_url, n8n_username, n8n_password, vector_search_api_key, mcp_api_key, webhook_username, webhook_password):
    """Create credentials in n8n."""
    logger.info("Creating credentials in n8n...")
    
    # Create session
    session = requests.Session()
    
    # Login to n8n
    login_url = f"{n8n_url}/rest/login"
    login_data = {
        "email": n8n_username,
        "password": n8n_password
    }
    response = session.post(login_url, json=login_data)
    
    if response.status_code != 200:
        logger.error(f"Failed to login to n8n: {response.status_code} - {response.text}")
        sys.exit(1)
    
    # Create Vector Search API key credential
    credential_url = f"{n8n_url}/rest/credentials"
    
    # Check if Vector Search API key credential already exists
    response = session.get(credential_url)
    credentials = response.json()
    
    vector_search_credential_exists = False
    for credential in credentials:
        if credential.get("name") == "Vector Search API Key":
            vector_search_credential_exists = True
            logger.info("Vector Search API Key credential already exists")
            break
    
    if not vector_search_credential_exists:
        vector_search_credential_data = {
            "name": "Vector Search API Key",
            "type": "httpHeaderAuth",
            "data": {
                "name": "Authorization",
                "value": f"Bearer {vector_search_api_key}"
            }
        }
        response = session.post(credential_url, json=vector_search_credential_data)
        
        if response.status_code != 200:
            logger.error(f"Failed to create Vector Search API key credential: {response.status_code} - {response.text}")
        else:
            logger.info("Created Vector Search API key credential")
    
    # Check if MCP API key credential already exists
    mcp_credential_exists = False
    for credential in credentials:
        if credential.get("name") == "MCP API Key":
            mcp_credential_exists = True
            logger.info("MCP API Key credential already exists")
            break
    
    if not mcp_credential_exists:
        # Create MCP API key credential
        mcp_credential_data = {
            "name": "MCP API Key",
            "type": "httpHeaderAuth",
            "data": {
                "name": "Authorization",
                "value": f"Bearer {mcp_api_key}"
            }
        }
        response = session.post(credential_url, json=mcp_credential_data)
        
        if response.status_code != 200:
            logger.error(f"Failed to create MCP API key credential: {response.status_code} - {response.text}")
        else:
            logger.info("Created MCP API key credential")
    
    # Check if Webhook Auth credential already exists
    webhook_credential_exists = False
    for credential in credentials:
        if credential.get("name") == "Webhook Auth":
            webhook_credential_exists = True
            logger.info("Webhook Auth credential already exists")
            break
    
    if not webhook_credential_exists:
        # Create Webhook Auth credential
        webhook_credential_data = {
            "name": "Webhook Auth",
            "type": "basicAuth",
            "data": {
                "user": webhook_username,
                "password": webhook_password
            }
        }
        response = session.post(credential_url, json=webhook_credential_data)
        
        if response.status_code != 200:
            logger.error(f"Failed to create Webhook Auth credential: {response.status_code} - {response.text}")
        else:
            logger.info("Created Webhook Auth credential")
    
    return session

def create_environment_variables(session, n8n_url, vector_search_api_url, mcp_server_url, mcp_namespace):
    """Create environment variables in n8n."""
    logger.info("Creating environment variables in n8n...")
    
    # Get existing variables
    variables_url = f"{n8n_url}/rest/variables"
    response = session.get(variables_url)
    
    if response.status_code != 200:
        logger.error(f"Failed to get environment variables: {response.status_code} - {response.text}")
        return
    
    variables = response.json()
    
    # Check if variables already exist
    vector_search_api_url_exists = False
    mcp_server_url_exists = False
    mcp_namespace_exists = False
    
    for variable in variables:
        if variable.get("key") == "VECTOR_SEARCH_API_URL":
            vector_search_api_url_exists = True
        elif variable.get("key") == "MCP_SERVER_URL":
            mcp_server_url_exists = True
        elif variable.get("key") == "MCP_NAMESPACE":
            mcp_namespace_exists = True
    
    # Create variables if they don't exist
    if not vector_search_api_url_exists:
        variable_data = {
            "key": "VECTOR_SEARCH_API_URL",
            "value": vector_search_api_url
        }
        response = session.post(variables_url, json=variable_data)
        
        if response.status_code != 200:
            logger.error(f"Failed to create VECTOR_SEARCH_API_URL variable: {response.status_code} - {response.text}")
        else:
            logger.info("Created VECTOR_SEARCH_API_URL variable")
    
    if not mcp_server_url_exists:
        variable_data = {
            "key": "MCP_SERVER_URL",
            "value": mcp_server_url
        }
        response = session.post(variables_url, json=variable_data)
        
        if response.status_code != 200:
            logger.error(f"Failed to create MCP_SERVER_URL variable: {response.status_code} - {response.text}")
        else:
            logger.info("Created MCP_SERVER_URL variable")
    
    if not mcp_namespace_exists:
        variable_data = {
            "key": "MCP_NAMESPACE",
            "value": mcp_namespace
        }
        response = session.post(variables_url, json=variable_data)
        
        if response.status_code != 200:
            logger.error(f"Failed to create MCP_NAMESPACE variable: {response.status_code} - {response.text}")
        else:
            logger.info("Created MCP_NAMESPACE variable")

def import_workflows(session, n8n_url, workflows_dir):
    """Import workflows into n8n."""
    logger.info("Importing workflows into n8n...")
    
    # Get list of workflow files
    workflow_files = [f for f in os.listdir(workflows_dir) if f.endswith(".json")]
    
    if not workflow_files:
        logger.error(f"No workflow files found in {workflows_dir}")
        return []
    
    # Import each workflow
    imported_workflows = []
    for workflow_file in workflow_files:
        workflow_path = os.path.join(workflows_dir, workflow_file)
        
        # Read workflow file
        with open(workflow_path, "r") as f:
            workflow_data = json.load(f)
        
        # Import workflow
        import_url = f"{n8n_url}/rest/workflows"
        response = session.post(import_url, json=workflow_data)
        
        if response.status_code != 200:
            logger.error(f"Failed to import workflow {workflow_file}: {response.status_code} - {response.text}")
        else:
            workflow_id = response.json().get("id")
            workflow_name = workflow_data.get("name")
            logger.info(f"Imported workflow {workflow_name} with ID {workflow_id}")
            imported_workflows.append((workflow_id, workflow_name))
    
    return imported_workflows

def activate_workflows(session, n8n_url, imported_workflows):
    """Activate workflows in n8n."""
    logger.info("Activating workflows in n8n...")
    
    # Activate each workflow
    webhook_urls = {}
    for workflow_id, workflow_name in imported_workflows:
        # Activate workflow
        activate_url = f"{n8n_url}/rest/workflows/{workflow_id}/activate"
        response = session.post(activate_url)
        
        if response.status_code != 200:
            logger.error(f"Failed to activate workflow {workflow_name}: {response.status_code} - {response.text}")
        else:
            logger.info(f"Activated workflow {workflow_name}")
            
            # Get webhook URL
            workflow_url = f"{n8n_url}/rest/workflows/{workflow_id}"
            response = session.get(workflow_url)
            
            if response.status_code != 200:
                logger.error(f"Failed to get workflow {workflow_name}: {response.status_code} - {response.text}")
            else:
                workflow_data = response.json()
                nodes = workflow_data.get("nodes", [])
                
                for node in nodes:
                    if node.get("type") == "n8n-nodes-base.webhook":
                        webhook_path = node.get("parameters", {}).get("path", "")
                        webhook_url = f"{n8n_url}/webhook/{webhook_path}"
                        webhook_urls[workflow_name] = webhook_url
                        logger.info(f"Webhook URL for {workflow_name}: {webhook_url}")
    
    return webhook_urls

def update_env_file(env_file, n8n_url, webhook_urls, webhook_username, webhook_password):
    """Update the .env file with webhook URLs."""
    logger.info(f"Updating {env_file} with webhook URLs...")
    
    # Create env file if it doesn't exist
    if not os.path.exists(env_file):
        with open(env_file, "w") as f:
            f.write("# Environment variables for VANA\n\n")
    
    # Read existing env file
    with open(env_file, "r") as f:
        env_lines = f.readlines()
    
    # Update or add webhook URLs
    updated_lines = []
    updated_vars = set()
    
    for line in env_lines:
        if line.startswith("N8N_WEBHOOK_URL="):
            updated_lines.append(f"N8N_WEBHOOK_URL={n8n_url}\n")
            updated_vars.add("N8N_WEBHOOK_URL")
        elif line.startswith("N8N_WEBHOOK_USERNAME="):
            updated_lines.append(f"N8N_WEBHOOK_USERNAME={webhook_username}\n")
            updated_vars.add("N8N_WEBHOOK_USERNAME")
        elif line.startswith("N8N_WEBHOOK_PASSWORD="):
            updated_lines.append(f"N8N_WEBHOOK_PASSWORD={webhook_password}\n")
            updated_vars.add("N8N_WEBHOOK_PASSWORD")
        elif any(line.startswith(f"N8N_WEBHOOK_{workflow.upper().replace(' ', '_')}_URL=") for workflow in webhook_urls):
            # Skip existing webhook URL lines
            continue
        else:
            updated_lines.append(line)
    
    # Add missing variables
    if "N8N_WEBHOOK_URL" not in updated_vars:
        updated_lines.append(f"N8N_WEBHOOK_URL={n8n_url}\n")
    
    if "N8N_WEBHOOK_USERNAME" not in updated_vars:
        updated_lines.append(f"N8N_WEBHOOK_USERNAME={webhook_username}\n")
    
    if "N8N_WEBHOOK_PASSWORD" not in updated_vars:
        updated_lines.append(f"N8N_WEBHOOK_PASSWORD={webhook_password}\n")
    
    # Add webhook URLs
    for workflow_name, webhook_url in webhook_urls.items():
        var_name = f"N8N_WEBHOOK_{workflow_name.upper().replace(' ', '_')}_URL"
        updated_lines.append(f"{var_name}={webhook_url}\n")
    
    # Write updated env file
    with open(env_file, "w") as f:
        f.writelines(updated_lines)
    
    logger.info(f"Updated {env_file} with webhook URLs")

def main():
    """Main function."""
    # Parse arguments
    args = parse_args()
    
    # Print header
    logger.info("%s", "\n" + "=" * 80)
    logger.info("n8n Workflow Setup")
    logger.info("%s", "=" * 80 + "\n")
    
    # Get credentials
    n8n_url, n8n_username, n8n_password = get_n8n_credentials(args)
    vector_search_api_url, vector_search_api_key, mcp_server_url, mcp_api_key, mcp_namespace = get_api_credentials(args)
    webhook_username, webhook_password = get_webhook_credentials(args)
    
    # Create credentials in n8n
    session = create_credentials(n8n_url, n8n_username, n8n_password, vector_search_api_key, mcp_api_key, webhook_username, webhook_password)
    
    # Create environment variables in n8n
    create_environment_variables(session, n8n_url, vector_search_api_url, mcp_server_url, mcp_namespace)
    
    # Import workflows
    imported_workflows = import_workflows(session, n8n_url, args.workflows_dir)
    
    # Activate workflows
    webhook_urls = activate_workflows(session, n8n_url, imported_workflows)
    
    # Update .env file
    if not args.skip_env_update:
        update_env_file(args.env_file, n8n_url, webhook_urls, webhook_username, webhook_password)
    
    # Print footer
    logger.info("%s", "\n" + "=" * 80)
    logger.info("Setup Completed")
    logger.info("%s", "=" * 80 + "\n")
    
    # Print webhook URLs
    logger.info("Webhook URLs:")
    for workflow_name, webhook_url in webhook_urls.items():
        logger.info(f"  {workflow_name}: {webhook_url}")
    
    logger.info("\nThese URLs have been added to your .env file.")
    logger.info("You can now use the WorkflowInterface to trigger these workflows.")

if __name__ == "__main__":
    main()
