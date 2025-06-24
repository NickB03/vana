# VANA Memory Management System

This module provides memory management capabilities for the VANA project using n8n workflows and the Model Context Protocol (MCP).

## Overview

The memory management system allows agents to:
- Start and stop recording conversations
- Save conversations to a knowledge base (Ragie)
- Retrieve relevant information from past conversations

## Components

### 1. Memory Buffer Manager

The `MemoryBufferManager` class manages a buffer of conversation messages:
- Starts and stops recording
- Adds messages to the buffer
- Clears the buffer
- Provides status information

### 2. MCP Interface

The `MemoryMCP` class provides an interface for agents to interact with the memory system:
- Handles memory-related commands (`!memory_on`, `!memory_off`, `!rag`)
- Triggers n8n workflows to save memory to Ragie
- Provides feedback on memory operations

### 3. n8n Workflows

Two n8n workflows are used for memory management:
- **Manual Memory Save**: Triggered by the `!rag` command to save the current buffer
- **Daily Memory Sync**: Runs on a schedule to sync recent conversations

## Usage

### Memory Commands

Agents can use the following commands:
- `!memory_on`: Start buffering new chat turns
- `!memory_off`: Stop buffering, discard uncommitted memory
- `!rag`: Save buffered memory permanently into vector store

### Integration with Agents

To integrate the memory system with an agent:

```python
from tools.memory import MemoryBufferManager, MemoryMCP

class MyAgent:
    def __init__(self):
        self.memory_buffer = MemoryBufferManager()
        self.memory_mcp = MemoryMCP(self.memory_buffer)

    def process_message(self, message):
        # Check if it's a memory command
        if message.startswith("!"):
            return self.memory_mcp.handle_command(message)

        # Process normal message
        response = self.generate_response(message)

        # Add to memory buffer if recording is on
        if self.memory_buffer.memory_on:
            self.memory_buffer.add_message("user", message)
            self.memory_buffer.add_message("assistant", response)

        return response
```

## Environment Variables

The following environment variables are required:
- `N8N_WEBHOOK_URL`: URL of the n8n webhook for saving memory
- `N8N_WEBHOOK_USER`: Username for webhook authentication
- `N8N_WEBHOOK_PASSWORD`: Password for webhook authentication
- `RAGIE_API_KEY`: API key for Ragie

## n8n Workflow Setup

1. Import the workflow JSON files into n8n
2. Configure the Ragie API key in n8n credentials
3. Activate the workflows
4. Copy the webhook URL and update the environment variables
