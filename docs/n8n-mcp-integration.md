# n8n and MCP Integration for VANA Memory System

This document provides detailed information about the integration of n8n and MCP (Message Control Protocol) for the VANA memory system.

## Overview

The n8n and MCP integration enhances the VANA memory system by adding workflow orchestration and standardized command handling. This allows for more sophisticated memory management capabilities, including persistent memory across sessions, automated memory syncing, and standardized memory commands.

## n8n Deployment

### Why Railway.app?

Railway.app is the recommended platform for hosting n8n for the VANA memory integration for the following reasons:

- **Cost**: Free up to ~$5/mo usage
- **Setup**: Quick setup (5-10 minutes)
- **Features**: Auto SSL, subdomain, monitoring, no ops maintenance
- **Reliability**: 99% uptime for prototypes
- **Scalability**: Simple pay-as-you-go if needed

### Deployment Steps

1. **Create a Railway.app Account**
   - Sign up at [Railway.app](https://railway.app)
   - Connect your GitHub account

2. **Fork the n8n Repository**
   - Fork the [official n8n repository](https://github.com/n8n-io/n8n)
   - Alternatively, use Railway's template if available

3. **Deploy to Railway**
   - Create a new project in Railway
   - Connect your forked repository
   - Configure environment variables:
     ```
     N8N_BASIC_AUTH_USER=your_username
     N8N_BASIC_AUTH_PASSWORD=your_password
     WEBHOOK_URL=your_railway_app_url
     RAGIE_API_KEY=your_ragie_api_key
     ```
   - Deploy the application

4. **Verify Deployment**
   - Access your n8n instance at the provided URL
   - Log in with the configured credentials
   - Create a test workflow to verify functionality

## n8n Workflows

### Manual Memory Save Workflow (`manual_chat_save.n8n.json`)

This workflow is triggered by the `!rag` command and saves the current chat buffer to Ragie.

**Nodes:**
1. **Webhook - Save Trigger**
   - Type: Webhook
   - Purpose: Catch incoming POST when `!rag` is typed
   - Configuration:
     - Method: POST
     - Path: /save-memory
     - Authentication: Basic Auth

2. **IF - Check Memory Mode**
   - Type: IF
   - Purpose: Only allow save if memory_on == true
   - Configuration:
     - Condition: `{{$json.memory_on}} == true`

3. **Get Chat Buffer**
   - Type: Function
   - Purpose: Pull current buffered messages
   - Configuration:
     - Code: `return { buffer: $input.item.json.buffer };`

4. **Format for Ragie**
   - Type: Set
   - Purpose: Transform buffer into proper format
   - Configuration:
     - Value: `{ "documents": {{$json.buffer}} }`

5. **HTTP - Upload to Ragie**
   - Type: HTTP Request
   - Purpose: POST to Ragie API /upload endpoint
   - Configuration:
     - Method: POST
     - URL: https://api.ragie.ai/upload
     - Headers: 
       - Authorization: Bearer {{$env.RAGIE_API_KEY}}
       - Content-Type: application/json
     - Body: `{{$json}}`

6. **Clear Chat Buffer**
   - Type: Function
   - Purpose: Empty temp storage after upload
   - Configuration:
     - Code: `return { success: true, cleared: true };`

### Daily Memory Sync Workflow (`daily_memory_sync.n8n.json`)

This workflow runs on a schedule and syncs recent chat logs to Ragie.

**Nodes:**
1. **Schedule Trigger**
   - Type: Schedule
   - Purpose: Run daily at a specific time
   - Configuration:
     - Frequency: Daily
     - Time: 00:00

2. **Get Recent Chat Logs**
   - Type: Function
   - Purpose: Pull logs from the last 24 hours
   - Configuration:
     - Code: `// Code to retrieve logs from storage`

3. **Process Logs**
   - Type: Function
   - Purpose: Format and chunk if needed
   - Configuration:
     - Code: `// Code to process and chunk logs`

4. **HTTP - Upload to Ragie**
   - Type: HTTP Request
   - Purpose: POST to Ragie API /upload endpoint
   - Configuration:
     - Method: POST
     - URL: https://api.ragie.ai/upload
     - Headers: 
       - Authorization: Bearer {{$env.RAGIE_API_KEY}}
       - Content-Type: application/json
     - Body: `{{$json}}`

5. **Update Sync Status**
   - Type: Function
   - Purpose: Record successful sync
   - Configuration:
     - Code: `return { success: true, timestamp: new Date().toISOString() };`

## MCP Integration

### Memory Commands

The MCP integration supports the following commands:

- `!memory_on` - Start buffering new chat turns
- `!memory_off` - Stop buffering, discard uncommitted memory
- `!rag` - Save buffered memory permanently into vector store

### Memory Buffer Manager

The memory buffer manager is responsible for:

- Storing messages during active memory sessions
- Formatting messages for storage in the vector database
- Clearing the buffer after successful saves or when commanded

### MCP Interface Implementation

```python
class MemoryBufferManager:
    def __init__(self):
        self.buffer = []
        self.memory_on = False
    
    def add_message(self, message):
        if self.memory_on:
            self.buffer.append(message)
    
    def get_buffer(self):
        return self.buffer
    
    def clear(self):
        self.buffer = []
        
    def start_recording(self):
        self.memory_on = True
        
    def stop_recording(self):
        self.memory_on = False

class MemoryMCP:
    def __init__(self, buffer_manager):
        self.buffer_manager = buffer_manager
        self.webhook_url = os.environ.get("N8N_WEBHOOK_URL")
    
    def handle_command(self, command):
        if command == "!memory_on":
            self.buffer_manager.start_recording()
            return "Memory recording started"
        
        elif command == "!memory_off":
            self.buffer_manager.stop_recording()
            self.buffer_manager.clear()
            return "Memory recording stopped and buffer cleared"
        
        elif command == "!rag":
            if not self.buffer_manager.memory_on:
                return "Error: Memory recording is not active"
            
            # Trigger n8n webhook for saving memory
            self._trigger_save_workflow()
            return "Memory saved to knowledge base"
    
    def _trigger_save_workflow(self):
        """Trigger the n8n workflow to save memory"""
        payload = {
            "buffer": self.buffer_manager.get_buffer(),
            "memory_on": self.buffer_manager.memory_on
        }
        
        try:
            response = requests.post(self.webhook_url, json=payload)
            response.raise_for_status()
            
            # Clear buffer if save was successful
            if response.status_code == 200:
                self.buffer_manager.clear()
                
            return response.json()
        except Exception as e:
            print(f"Error triggering save workflow: {e}")
            return None
```

### Integration with Ben Agent

```python
from memory.mcp import MemoryMCP
from memory.buffer import MemoryBufferManager

class BenAgent(Agent):
    # ... existing code ...
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Set up memory buffer and MCP
        self.memory_buffer = MemoryBufferManager()
        self.memory_mcp = MemoryMCP(self.memory_buffer)
        
    def process_message(self, message):
        # Check if it's a memory command
        if message.startswith("!"):
            command = message.split()[0]
            return self.memory_mcp.handle_command(command)
        
        # Otherwise, process normally and add to buffer if memory is on
        response = super().process_message(message)
        
        if self.memory_mcp.memory_on:
            self.memory_buffer.add_message({
                "role": "user",
                "content": message
            })
            self.memory_buffer.add_message({
                "role": "assistant",
                "content": response
            })
        
        return response
```

## Testing

### Testing n8n Workflows

1. **Test Manual Save Workflow**
   - Create a test webhook request with sample data
   - Verify that the workflow processes the data correctly
   - Check that the data is uploaded to Ragie

2. **Test Daily Sync Workflow**
   - Manually trigger the workflow
   - Verify that logs are retrieved and processed
   - Check that the data is uploaded to Ragie

### Testing MCP Integration

1. **Test Memory Commands**
   - Test `!memory_on` command
   - Add some messages to the buffer
   - Test `!rag` command
   - Verify that the buffer is cleared
   - Test `!memory_off` command

2. **Test Integration with Ben Agent**
   - Start a conversation with the Ben agent
   - Use memory commands during the conversation
   - Verify that messages are added to the buffer
   - Verify that the buffer is saved to Ragie

## Monitoring and Maintenance

### Monitoring n8n

- Monitor workflow executions in the Railway.app dashboard
- Set up alerts for failed workflows
- Implement regular backups of n8n workflows

### Monitoring MCP

- Log all MCP command executions
- Monitor buffer size to prevent memory issues
- Implement error handling for failed webhook calls

## Future Enhancements

- Implement more sophisticated memory operations (filtering, tagging)
- Add support for multi-agent shared memory
- Transition to Vertex AI Vector Search for improved scalability
- Create a memory analytics dashboard
