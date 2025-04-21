# VANA Project: Next Steps Guide

This guide provides step-by-step instructions to get your VANA multi-agent system up and running. Each step includes detailed explanations and exact commands to run, designed for users with minimal technical background.

## Table of Contents
- [Step 1: Setting Up Your Environment](#step-1-setting-up-your-environment)
- [Step 2: Configuring Your Google Cloud Account](#step-2-configuring-your-google-cloud-account)
- [Step 3: Setting Up Vector Search](#step-3-setting-up-vector-search)
- [Step 4: Running the Agent Locally](#step-4-running-the-agent-locally)
- [Step 5: Testing Your Agent](#step-5-testing-your-agent)
- [Step 6: Deploying to Google Cloud](#step-6-deploying-to-google-cloud)
- [Troubleshooting](#troubleshooting)

## Step 1: Setting Up Your Environment

These steps will prepare your computer to run the VANA agent system.

### 1.1 Open Your Terminal

- **On Mac**: Press `Command + Space`, type "Terminal", and press Enter
- **On Windows**: Press `Windows + R`, type "cmd", and press Enter

### 1.2 Navigate to the Project Folder

Type the following command and press Enter:
```
cd path/to/vana
```

Replace "path/to/vana" with the actual location of the project on your computer.

### 1.3 Set Up the Python Environment

Run these commands one by one:

```
python3 -m venv .venv
```

This creates a virtual environment for the project.

Next, activate the environment:

- **On Mac/Linux**:
  ```
  source .venv/bin/activate
  ```

- **On Windows**:
  ```
  .venv\Scripts\activate
  ```

Your command prompt should now show `(.venv)` at the beginning of the line.

### 1.4 Install Required Packages

Run this command:

```
pip install -r adk-setup/requirements.txt
```

This will install all the necessary software packages. It might take a few minutes.

## Step 2: Configuring Your Google Cloud Account

### 2.1 Create a Service Account

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (analystai-454200)
3. In the left menu, go to "IAM & Admin" > "Service Accounts"
4. Click "Create Service Account"
5. Name it "vana-agent-service" and click "Create and Continue"
6. Add the following roles:
   - Vertex AI User
   - Storage Object Admin
   - Vertex AI Vector Search Admin
7. Click "Continue" and then "Done"

### 2.2 Create a Service Account Key

1. Find your new service account in the list and click on it
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" and click "Create"
5. The key file will download automatically

### 2.3 Add the Key to Your Project

1. Create a folder called "secrets" in your project:
   ```
   mkdir -p secrets
   ```

2. Move the downloaded key file to the "secrets" folder
3. Rename it to something simple like "service-account-key.json"

### 2.4 Update Your Environment File

1. Open the `.env` file in a text editor
2. Update the following line to point to your key file:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./secrets/service-account-key.json
   ```
3. Save and close the file

## Step 3: Setting Up Vector Search

Vector Search allows your agents to find relevant information quickly.

### 3.1 Create a Service Account for Vector Search

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (analystai-454200)
3. In the left menu, go to "IAM & Admin" > "Service Accounts"
4. Click "Create Service Account"
5. Name it "vana-vector-search-sa" and click "Create and Continue"
6. Add the following roles:
   - Vertex AI User (`roles/aiplatform.user`)
   - Vertex AI Admin (`roles/aiplatform.admin`)
   - Storage Object Admin (`roles/storage.objectAdmin`)
7. Click "Continue" and then "Done"

### 3.2 Create a Service Account Key

1. Find your new service account in the list and click on the three dots (⋮) at the end of the row
2. Select "Manage keys"
3. In the "Keys" tab, click "Add Key" > "Create new key"
4. Choose "JSON" and click "Create"
5. The key file will download automatically

### 3.3 Add the Key to Your Project

1. Rename the downloaded key file to something simple like "analystai-454200-vector-search.json"
2. Move the key file to the "secrets" folder in your project
3. Update the `.env` file to point to your new key file:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./secrets/analystai-454200-vector-search.json
   ```

### 3.4 Run the Setup Script

Run this command:

```
source .venv/bin/activate
python setup_vector_search.py
```

This will:
1. Create a Vector Search index with the appropriate configuration
2. Create a Vector Search index endpoint
3. Deploy the index to the endpoint

The process might take 5-10 minutes to complete. You'll see progress messages in the terminal.

### 3.5 Prepare Knowledge Documents

Create text files with relevant knowledge in the `knowledge_docs` directory:

```
mkdir -p knowledge_docs
# Add your .txt files to this directory
```

### 3.6 Generate and Upload Embeddings

Run the embedding generation script:

```
python prepare_embeddings.py
```

This will:
1. Read all text files in the `knowledge_docs` directory
2. Generate embeddings using Vertex AI's text-embedding-004 model
3. Upload the embeddings to Google Cloud Storage

### 3.7 Update the Vector Search Index

Run the index update script:

```
python update_index_api.py
```

This will initiate an update operation to add the embeddings to the Vector Search index. The operation may take some time to complete.

### 3.8 Check the Update Operation Status

Check the status of the update operation:

```
python check_operation.py
```

Once the operation is complete, you can test the search functionality:

```
python tools/search_knowledge_tool.py
```

## Step 4: Running the Agent Locally

Now you'll start the agent system on your computer.

### 4.1 Start the ADK Web Interface

Run these commands:

```
cd adk-setup
adk web
```

You should see a message saying the server has started.

### 4.2 Open the Web Interface

Open your web browser and go to:

```
http://localhost:8000
```

You should see the ADK web interface where you can interact with your agents.

## Step 5: Testing Your Agent

Now that your agent is running, you can test it out.

### 5.1 Select Your Agent

In the web interface:
1. Click on "Agents" in the left sidebar
2. Select "ben" from the list of agents

### 5.2 Start a Conversation

1. In the chat interface, type a message like:
   ```
   Can you help me design a system architecture?
   ```
2. Press Enter or click the send button
3. Wait for Ben to respond and potentially delegate to other agents

### 5.3 Try Different Queries

Test the agent with different types of requests to see how it handles them:
- "Design an agent architecture for data processing"
- "Create a user interface for monitoring agents"
- "How would you implement a self-healing system?"

## Step 6: Deploying to Google Cloud

When you're ready to make your agent available online, you can deploy it to Google Cloud.

### 6.1 Run the Deployment Script

Run this command:

```
python adk-setup/deploy.py
```

This will package your agent and deploy it to Google Cloud. It might take several minutes.

### 6.2 Access Your Deployed Agent

When deployment is complete, you'll see a URL in the terminal. Copy this URL and open it in your web browser to access your deployed agent.

## Troubleshooting

### "Permission denied" errors

If you see permission errors:
1. Check that your service account has the correct roles
2. Verify that the path to your service account key is correct in the `.env` file
3. Make sure you've activated the virtual environment with `source .venv/bin/activate`

### "Module not found" errors

If Python can't find a module:
1. Make sure you've activated the virtual environment
2. Try reinstalling the requirements:
   ```
   pip install -r adk-setup/requirements.txt
   ```

### Vector Search setup fails

If the Vector Search setup fails:
1. Check your Google Cloud project has the Vertex AI API enabled
2. Verify your service account has Vertex AI Admin permissions
3. Make sure your `.env` file has the correct project ID and location
4. If you see errors about machine types or shard sizes, try modifying the `setup_vector_search.py` script to use:
   ```python
   # When creating the index
   shard_size="SHARD_SIZE_SMALL"  # Compatible with e2-standard-2

   # When deploying the index
   machine_type="e2-standard-2"  # Affordable machine type
   ```
5. If you see network configuration errors, add `public_endpoint_enabled=True` to the endpoint creation parameters

### Vector Search embedding update fails

If the embedding update fails:
1. Check that your embeddings are in the correct format (see `prepare_embeddings.py`)
2. Verify that the GCS path is a directory, not a file (e.g., `gs://bucket-name/directory/` not `gs://bucket-name/file.json`)
3. Make sure the update operation has enough time to complete (can take 10+ minutes)
4. Check the operation status with `python check_operation.py`
5. If you get a 501 error when searching, the index update may still be in progress

### Vector Search query fails with 501 UNIMPLEMENTED error

If you encounter a 501 UNIMPLEMENTED error when querying the Vector Search index:
1. Verify that the update operation has completed successfully with `python check_operation.py`
2. Check that the endpoint is properly configured for querying
3. Verify that the deployed index ID is correct in your search code
4. Try using the REST API directly with `curl` or Postman to rule out client library issues
5. Check for API compatibility issues between the client libraries and the Vector Search API
6. Consider updating the client libraries to the latest versions
7. Consult with a Google Cloud expert for assistance

### Vector Search returns no results

1. Verify that the update operation has completed successfully
2. Check that your query is relevant to the content in your knowledge documents
3. Try using the REST API directly with `curl` or Postman to rule out client library issues
4. Verify that the deployed index ID is correct in your search code
5. Check the logs in Google Cloud Console for any errors

### Web interface doesn't load

If the web interface doesn't appear:
1. Check that the server is running (you should see messages in the terminal)
2. Try accessing http://localhost:8000 in a different browser
3. Make sure no other application is using port 8000

---

If you encounter any issues not covered here, please reach out to the development team for assistance.
