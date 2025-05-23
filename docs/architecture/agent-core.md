# Agent Core Architecture

[Home](../../index.md) > [Architecture Documentation](index.md) > Agent Core

## 1. Overview

The VANA Agent Core provides the foundation for the Single Agent Platform MVP. It is designed to be modular, extensible, and robust, with a focus on task execution, tool integration, and state management.

The core architecture follows a task-based approach, where user messages are parsed into structured tasks that can be executed by the agent. The agent can use a variety of tools to accomplish these tasks, and maintains state across multiple interactions within a session.

## 2. Key Components

### 2.1 VanaAgent

The `VanaAgent` class is the central component of the agent core. It provides the following functionality:

- **Task Parsing**: Converts user messages into structured tasks
- **Tool Integration**: Registers and executes tools
- **Session Management**: Creates and loads sessions
- **State Management**: Maintains conversation history and other state
- **Error Handling**: Gracefully handles errors during task execution

### 2.2 TaskParser

The `TaskParser` class is responsible for parsing user messages into structured tasks. It uses pattern matching to determine the type of task (search, tool request, conversation, etc.) and extracts relevant parameters.

### 2.3 Tools

Tools are modular components that provide specific functionality to the agent. Each tool is a function or class that can be registered with the agent and executed when needed. The agent core includes the following tools:

- **Echo Tool**: A simple tool that echoes back the input text (used for testing)
- **File System Tool**: Provides file operations such as reading, writing, and listing files
- **Vector Search Tool**: Provides access to the Vertex AI Vector Search service for semantic search
- **Web Search Tool**: Provides access to the Google Custom Search API for real-time web search
- **Knowledge Graph Tool**: Provides access to the MCP-based Knowledge Graph for structured knowledge

### 2.4 Memory Components

The agent core integrates with memory components to maintain context across conversations and access persistent knowledge:

- **Short-Term Memory**: In-memory storage for recent interactions within a session
- **Memory Bank**: Interface to the file-based memory bank for persistent knowledge
- **Knowledge Graph**: Interface to the MCP-based Knowledge Graph for structured knowledge

### 2.5 CLI Interface

The agent core includes a command-line interface (CLI) for interacting with the agent. The CLI supports three modes of operation:

- **Interactive Mode**: Allows you to have a conversation with the agent in the terminal
- **Web UI Mode**: Launches the ADK web UI for a more visual interaction experience
- **Single Message Mode**: Processes a single message and returns the response

## 3. Data Flow

The typical data flow through the agent core is as follows:

1. **User Message**: The user sends a message to the agent
2. **Session Management**: The agent creates or loads a session for the user
3. **Task Parsing**: The message is parsed into a structured task
4. **Tool Selection**: If the task requires a tool, the appropriate tool is selected
5. **Task Execution**: The task is executed, possibly using one or more tools
6. **Response Generation**: A response is generated based on the task execution
7. **State Update**: The conversation history and other state is updated
8. **Response Delivery**: The response is returned to the user

## 4. Session Management

The agent core includes comprehensive session management functionality:

- **Session Creation**: Creates a new session for a user
- **Session Loading**: Loads an existing session
- **Session State**: Maintains conversation history and other state within a session
- **Memory Integration**: Integrates with short-term memory and memory bank components

The agent maintains session state through the following components:

- **Conversation History**: Stores the conversation history for the current session
- **Short-Term Memory**: Provides in-memory storage for recent interactions
- **Memory Bank**: Provides access to persistent knowledge across sessions

## 5. Tool Integration

The agent core provides a flexible mechanism for integrating tools:

- **Tool Registration**: Tools can be registered with the agent at runtime
- **Tool Execution**: Tools can be executed directly via commands (e.g., `!echo Hello, world!`)
- **Tool Discovery**: The agent can provide a list of available tools

Tools can be implemented as simple functions or as classes with more sophisticated functionality. Each tool follows a consistent pattern:

- **Class Implementation**: A class that implements the tool functionality
- **Function Wrapper**: A simple function that wraps the class for easy use
- **Metadata**: Information about the tool, its parameters, and return values
- **Error Handling**: Consistent error handling and reporting

The agent core includes several tools:

### 5.1 Echo Tool

The Echo tool is a simple tool that echoes back the input text. It's primarily used for testing the agent's tool integration capabilities.

### 5.2 File System Tool

The File System tool provides file operations such as reading, writing, and listing files. These operations are implemented with appropriate security checks and error handling.

### 5.3 Vector Search Tool

The Vector Search tool provides access to the Vertex AI Vector Search service for semantic search and knowledge retrieval. It includes methods for searching, querying, and uploading content.

### 5.4 Web Search Tool

The Web Search tool provides access to the Google Custom Search API for real-time web search. It includes methods for searching the web and formatting the results.

### 5.5 Knowledge Graph Tool

The Knowledge Graph tool provides access to the MCP-based Knowledge Graph for storing and retrieving structured knowledge. It includes methods for querying the Knowledge Graph, storing information, storing relationships, and extracting entities from text.

## 6. Memory Architecture

The agent core integrates with memory components to maintain context across conversations and access persistent knowledge:

### 6.1 Short-Term Memory

The Short-Term Memory component provides in-memory storage for recent interactions within a session. It supports:

- Adding interactions with role, content, and metadata
- Retrieving all or recent interactions
- Filtering interactions by role
- Searching for interactions containing specific text
- Summarizing interactions
- Clearing the memory buffer
- Getting statistics about the memory buffer

### 6.2 Memory Bank

The Memory Bank component provides an interface to the file-based memory bank for persistent knowledge. It supports:

- Reading memory bank files
- Updating memory bank files
- Listing all memory bank files
- Extracting sections from memory bank files
- Updating sections in memory bank files

### 6.3 Knowledge Graph

The Knowledge Graph component provides an interface to the MCP-based Knowledge Graph for structured knowledge. It supports:

- Querying the Knowledge Graph for entities
- Storing information in the Knowledge Graph
- Storing relationships between entities
- Extracting entities from text

## 7. CLI Architecture

The agent core includes a command-line interface (CLI) for interacting with the agent. The CLI architecture consists of:

### 7.1 VanaCLI Class

The `VanaCLI` class provides methods for:

- Creating and configuring the agent
- Starting a session
- Processing messages
- Running in interactive mode
- Launching the web UI

### 7.2 Command-Line Interface

The CLI provides a command-line interface for interacting with the agent. It uses the `argparse` module to parse command-line arguments and supports three modes of operation:

- **Interactive Mode**: Allows you to have a conversation with the agent in the terminal
- **Web UI Mode**: Launches the ADK web UI for a more visual interaction experience
- **Single Message Mode**: Processes a single message and returns the response

## 8. Error Handling

The agent core includes robust error handling:

- **Tool Errors**: Errors during tool execution are caught and reported
- **Task Parsing Errors**: Errors during task parsing are handled gracefully
- **Session Errors**: Errors during session management are reported
- **Memory Errors**: Errors during memory operations are handled gracefully
- **CLI Errors**: Errors during CLI operations are caught and reported

All errors are logged and included in the response to the user, ensuring transparency and facilitating debugging.

## 9. Future Extensions

The agent core is designed to be extensible, with several planned enhancements:

- **LLM Integration**: Integration with large language models for more sophisticated response generation
- **Advanced Tool Integration**: Support for more sophisticated tools, including those that require authentication or have side effects
- **Multi-Turn Conversations**: Support for multi-turn conversations with context preservation
- **Structured Output**: Support for structured output formats (e.g., JSON, Markdown)
- **Enhanced Memory Integration**: More sophisticated memory retrieval mechanisms based on relevance to the current context

## 8. Code Structure

The agent core code is organized as follows:

```
agent/
├── __init__.py
├── core.py           # VanaAgent class
├── task_parser.py    # TaskParser class
└── tools/
    ├── __init__.py
    ├── echo.py       # Echo tool
    ├── file_system.py # File System tool
    ├── vector_search.py # Vector Search tool
    └── web_search.py # Web Search tool
```

Tests for the agent core are organized as follows:

```
tests/
├── agent/
│   ├── test_core.py          # Tests for VanaAgent
│   ├── test_task_parser.py   # Tests for TaskParser
│   └── tools/
│       ├── test_echo.py      # Tests for Echo tool
│       ├── test_file_system.py # Tests for File System tool
│       ├── test_vector_search.py # Tests for Vector Search tool
│       └── test_web_search.py # Tests for Web Search tool
└── integration/
    ├── test_agent_tools.py   # Basic integration tests for agent with tools
    └── test_agent_tools_extended.py # Extended integration tests for all tools
```

## 9. Usage Examples

### 9.1 Basic Usage

```python
from agent.core import VanaAgent
from agent.tools.echo import echo

# Create an agent
agent = VanaAgent()

# Register a tool
agent.register_tool("echo", echo)

# Process a message
response = agent.process_message("Hello, world!", user_id="user123")
print(response)  # Echo: Hello, world!

# Process a tool command
response = agent.process_message("!echo Hello, world!", user_id="user123")
print(response)  # Echo: Hello, world!
```

### 9.2 Using Multiple Tools

```python
from agent.core import VanaAgent
from agent.tools.echo import echo
from agent.tools.file_system import read_file, write_file
from agent.tools.vector_search import search as vector_search
from agent.tools.web_search import search as web_search

# Create an agent
agent = VanaAgent()

# Register tools
agent.register_tool("echo", echo)
agent.register_tool("read_file", read_file)
agent.register_tool("write_file", write_file)
agent.register_tool("vector_search", vector_search)
agent.register_tool("web_search", web_search)

# Process tool commands
response1 = agent.process_message("!echo Hello, world!", user_id="user123")
print(response1)  # Echo: Hello, world!

response2 = agent.process_message("!write_file /tmp/test.txt Test content", user_id="user123")
print(response2)  # {"success": true}

response3 = agent.process_message("!read_file /tmp/test.txt", user_id="user123")
print(response3)  # Test content

response4 = agent.process_message("!vector_search What is VANA?", user_id="user123")
print(response4)  # [{"content": "VANA is...", "score": 0.9, ...}, ...]

response5 = agent.process_message("!web_search VANA AI agent", user_id="user123")
print(response5)  # [{"title": "VANA AI...", "link": "https://...", ...}, ...]
```

### 9.3 Custom Tool

```python
from agent.core import VanaAgent

# Create an agent
agent = VanaAgent()

# Define a custom tool
def reverse(text):
    """Reverse the input text."""
    return text[::-1]

# Register the custom tool
agent.register_tool("reverse", reverse)

# Process a tool command
response = agent.process_message("!reverse Hello, world!", user_id="user123")
print(response)  # !dlrow ,olleH
```

### 9.4 Session Management

```python
from agent.core import VanaAgent
from agent.tools.echo import echo
from agent.tools.file_system import read_file

# Create an agent
agent = VanaAgent()

# Register tools
agent.register_tool("echo", echo)
agent.register_tool("read_file", read_file)

# Create a session
session_id = agent.create_session(user_id="user123")

# Process messages in the session
response1 = agent.process_message("!echo Hello!", session_id=session_id)
response2 = agent.process_message("!read_file /tmp/test.txt", session_id=session_id)

# Get conversation history
history = agent.get_conversation_history()
print(history)  # [{"role": "user", "content": "!echo Hello!", ...}, ...]
```

For more detailed examples of using the tools, see the [Agent Tool Usage Guide](../guides/agent-tool-usage.md).
