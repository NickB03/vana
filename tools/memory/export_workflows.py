#!/usr/bin/env python3
"""
Export n8n workflow definitions to JSON files.
These files can be imported into n8n.
"""

import json
import logging
import os
import sys

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))


def export_workflows():
    """Export workflow definitions to JSON files"""
    # Define the Manual Memory Save workflow
    manual_memory_save = {
        "nodes": [
            {
                "parameters": {
                    "path": "save-memory",
                    "options": {"raw": False},
                    "responseMode": "lastNode",
                    "responseData": "allEntries",
                    "authentication": "basicAuth",
                },
                "name": "Webhook",
                "type": "n8n-nodes-base.webhook",
                "position": [250, 300],
            },
            {
                "parameters": {
                    "conditions": {
                        "string": [
                            {
                                "value1": '={{$json["memory_on"]}}',
                                "operation": "equal",
                                "value2": True,
                            }
                        ]
                    }
                },
                "name": "IF",
                "type": "n8n-nodes-base.if",
                "position": [450, 300],
            },
            {
                "parameters": {
                    "functionCode": '// Format the buffer data for Ragie\nconst buffer = $input.item.json.buffer;\n\n// If buffer is empty, return error\nif (!buffer || buffer.length === 0) {\n  return {\n    success: false,\n    error: "Buffer is empty"\n  };\n}\n\n// Combine all messages into a single text document\nlet combinedText = "";\nfor (const message of buffer) {\n  combinedText += `${message.role}: ${message.content}\\n\\n`;\n}\n\n// Create document object for Ragie\nconst document = {\n  text: combinedText,\n  metadata: {\n    source: "chat_history",\n    timestamp: new Date().toISOString()\n  }\n};\n\nreturn {\n  documents: [document],\n  success: true\n};'
                },
                "name": "Format For Ragie",
                "type": "n8n-nodes-base.function",
                "position": [650, 200],
            },
            {
                "parameters": {
                    "url": "https://api.ragie.ai/upload",
                    "method": "POST",
                    "authentication": "genericCredentialType",
                    "genericAuthType": "httpHeaderAuth",
                    "httpHeaderAuth": {
                        "name": "Authorization",
                        "value": "Bearer {{$env.RAGIE_API_KEY}}",
                    },
                    "sendBody": True,
                    "bodyParameters": {"parameters": [{"name": "documents", "value": "={{$json.documents}}"}]},
                    "options": {},
                },
                "name": "Upload to Ragie",
                "type": "n8n-nodes-base.httpRequest",
                "position": [850, 200],
            },
            {
                "parameters": {
                    "functionCode": '// Process response and create a meaningful message\nconst success = $input.item.json.success;\n\nif (success) {\n  return {\n    success: true,\n    message: "Memory saved successfully to knowledge base.",\n    clear_buffer: true\n  };\n} else {\n  return {\n    success: false,\n    message: "Failed to save memory: " + ($input.item.json.error || "Unknown error"),\n    clear_buffer: false\n  };\n}'
                },
                "name": "Response Handler",
                "type": "n8n-nodes-base.function",
                "position": [1050, 200],
            },
            {
                "parameters": {
                    "functionCode": 'return {\n  success: false,\n  message: "Memory recording is not active. Use !memory_on first."\n};'
                },
                "name": "Error: Not Active",
                "type": "n8n-nodes-base.function",
                "position": [650, 400],
            },
        ],
        "connections": {
            "Webhook": {"main": [[{"node": "IF", "type": "main", "index": 0}]]},
            "IF": {
                "main": [
                    [{"node": "Format For Ragie", "type": "main", "index": 0}],
                    [{"node": "Error: Not Active", "type": "main", "index": 0}],
                ]
            },
            "Format For Ragie": {"main": [[{"node": "Upload to Ragie", "type": "main", "index": 0}]]},
            "Upload to Ragie": {"main": [[{"node": "Response Handler", "type": "main", "index": 0}]]},
        },
        "active": True,
        "settings": {},
        "name": "Manual Memory Save",
    }

    # Define the Daily Memory Sync workflow
    daily_memory_sync = {
        "nodes": [
            {
                "parameters": {"rule": {"interval": [{"field": "hours", "minutesInterval": 1440}]}},
                "name": "Schedule",
                "type": "n8n-nodes-base.scheduleTrigger",
                "position": [250, 300],
            },
            {
                "parameters": {
                    "functionCode": '// This is a placeholder for actual log retrieval\n// In a real implementation, this would fetch logs from a database or file system\n\n// For testing, we\'ll generate a mock log\nconst mockLogs = [\n  {\n    role: "user",\n    content: "How do I implement memory in VANA?",\n    timestamp: new Date(Date.now() - 86400000).toISOString()\n  },\n  {\n    role: "assistant",\n    content: "You can implement memory in VANA using the Ragie API...",\n    timestamp: new Date(Date.now() - 86300000).toISOString()\n  }\n];\n\nreturn {\n  logs: mockLogs\n};'
                },
                "name": "Get Recent Logs",
                "type": "n8n-nodes-base.function",
                "position": [450, 300],
            },
            {
                "parameters": {
                    "functionCode": '// Format logs for Ragie API\nconst logs = $input.item.json.logs;\n\n// If logs are empty, return empty array\nif (!logs || logs.length === 0) {\n  return {\n    documents: [],\n    success: true\n  };\n}\n\n// Group logs by conversation (this is simplified - real implementation would use session IDs)\nconst conversations = {};\nlet conversationId = 0;\n\nfor (let i = 0; i < logs.length; i++) {\n  const log = logs[i];\n  \n  // Start a new conversation if this is a new user message after an assistant message\n  if (i > 0 && log.role === "user" && logs[i-1].role === "assistant") {\n    conversationId++;\n  }\n  \n  if (!conversations[conversationId]) {\n    conversations[conversationId] = [];\n  }\n  \n  conversations[conversationId].push(log);\n}\n\n// Create documents for each conversation\nconst documents = [];\nfor (const id in conversations) {\n  const convo = conversations[id];\n  \n  let text = "";\n  for (const message of convo) {\n    text += `${message.role}: ${message.content}\\n\\n`;\n  }\n  \n  documents.push({\n    text: text,\n    metadata: {\n      source: "daily_sync",\n      timestamp: new Date().toISOString(),\n      conversation_id: id\n    }\n  });\n}\n\nreturn {\n  documents: documents,\n  success: true\n};'
                },
                "name": "Format Logs for Ragie",
                "type": "n8n-nodes-base.function",
                "position": [650, 300],
            },
            {
                "parameters": {
                    "url": "https://api.ragie.ai/upload",
                    "method": "POST",
                    "authentication": "genericCredentialType",
                    "genericAuthType": "httpHeaderAuth",
                    "httpHeaderAuth": {
                        "name": "Authorization",
                        "value": "Bearer {{$env.RAGIE_API_KEY}}",
                    },
                    "sendBody": True,
                    "bodyParameters": {"parameters": [{"name": "documents", "value": "={{$json.documents}}"}]},
                    "options": {},
                },
                "name": "Upload to Ragie",
                "type": "n8n-nodes-base.httpRequest",
                "position": [850, 300],
            },
            {
                "parameters": {
                    "functionCode": '// Log the result of the upload\nconst success = $input.item.json.success;\nconst documentCount = $input.item.json.documents ? $input.item.json.documents.length : 0;\n\nreturn {\n  success: success,\n  message: success \n    ? `Successfully uploaded ${documentCount} conversation documents to knowledge base.` \n    : "Failed to upload documents to knowledge base.",\n  timestamp: new Date().toISOString()\n};'
                },
                "name": "Log Result",
                "type": "n8n-nodes-base.function",
                "position": [1050, 300],
            },
        ],
        "connections": {
            "Schedule": {"main": [[{"node": "Get Recent Logs", "type": "main", "index": 0}]]},
            "Get Recent Logs": {"main": [[{"node": "Format Logs for Ragie", "type": "main", "index": 0}]]},
            "Format Logs for Ragie": {"main": [[{"node": "Upload to Ragie", "type": "main", "index": 0}]]},
            "Upload to Ragie": {"main": [[{"node": "Log Result", "type": "main", "index": 0}]]},
        },
        "active": True,
        "settings": {},
        "name": "Daily Memory Sync",
    }

    # Ensure the directory exists
    os.makedirs("../../n8n-workflows", exist_ok=True)

    # Save the workflows as JSON files
    with open("../../n8n-workflows/manual_memory_save.json", "w") as f:
        json.dump(manual_memory_save, f, indent=2)

    with open("../../n8n-workflows/daily_memory_sync.json", "w") as f:
        json.dump(daily_memory_sync, f, indent=2)

    logger.info("Workflow definitions exported to n8n-workflows/")
    return True


def main():
    """Main function"""
    logger.info("Starting workflow export")

    # Export workflows
    success = export_workflows()

    if success:
        logger.info("Workflow export completed successfully")
        return 0
    else:
        logger.error("Workflow export failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
