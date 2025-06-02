# Agent Core Implementation

[Home](../../index.md) > [Implementation](../index.md) > Agent Core

This document describes the implementation of the core agent class for the VANA Single Agent Platform.

## Overview

The VANA agent core provides the foundation for task execution, tool integration, and state management. It is designed to be modular, extensible, and robust, with a focus on task-based processing and tool integration.

The core agent is implemented in the `agent/core.py` file and provides a flexible framework for building AI agents.

## Components

### VanaAgent Class

The `VanaAgent` class is the main class for the agent core. It provides methods for:

- Task parsing and execution
- Tool registration and execution
- Session management
- State management
- Error handling

#### Key Methods

```python
def __init__(self, name: str = "vana", model: str = None):
    """
    Initialize the VANA agent.

    Args:
        name: Name of the agent
        model: LLM model to use (if None, uses environment variable or default)
    """
    self.name = name
    self.model = model or os.environ.get("VANA_MODEL", "gemini-1.5-pro")

    # Initialize task parser
    self.task_parser = TaskParser()

    # Initialize tools registry
    self.tools = {}

    # Initialize state
    self.conversation_history = []
    self.current_session_id = None
    self.current_user_id = None

    logger.info(f"Initialized {self.name} agent with model {self.model}")
```

The constructor initializes the agent with a name, model, task parser, tools registry, and state.

```python
def register_tool(self, tool_name: str, tool_function: Callable, description: str = None):
    """
    Register a tool with the agent.

    Args:
        tool_name: Name of the tool
        tool_function: Function that implements the tool
        description: Description of the tool
    """
    self.tools[tool_name] = {
        "function": tool_function,
        "description": description or tool_function.__doc__ or "No description provided"
    }
    logger.info(f"Registered tool: {tool_name}")
```

The `register_tool` method registers a tool with the agent, making it available for use in task execution.

```python
def create_session(self, user_id: str) -> str:
    """
    Create a new session for a user.

    Args:
        user_id: User identifier

    Returns:
        Session ID
    """
    session_id = str(uuid.uuid4())
    self.current_session_id = session_id
    self.current_user_id = user_id
    self.conversation_history = []

    logger.info(f"Created session {session_id} for user {user_id}")
    return session_id
```

The `create_session` method creates a new session for a user, generating a unique session ID and initializing the conversation history.

```python
def load_session(self, session_id: str, user_id: str) -> bool:
    """
    Load an existing session.

    Args:
        session_id: Session identifier
        user_id: User identifier

    Returns:
        True if session was loaded successfully, False otherwise
    """
    # In a real implementation, this would load session data from storage
    # For now, we just set the current session ID and user ID
    self.current_session_id = session_id
    self.current_user_id = user_id

    # Mock implementation - in a real system, we would load conversation history
    # from a database or other persistent storage
    self.conversation_history = []

    logger.info(f"Loaded session {session_id} for user {user_id}")
    return True
```

The `load_session` method loads an existing session, setting the current session ID and user ID.

```python
def process_message(self, message: str, session_id: str = None, user_id: str = None) -> str:
    """
    Process a user message and generate a response.

    Args:
        message: User message
        session_id: Session identifier (optional if already set)
        user_id: User identifier (optional if already set)

    Returns:
        Agent response
    """
    # Set or validate session
    if session_id:
        if self.current_session_id and session_id != self.current_session_id:
            # Load different session
            self.load_session(session_id, user_id or self.current_user_id)
        elif not self.current_session_id:
            # No current session, create or load
            if user_id:
                self.current_session_id = session_id
                self.current_user_id = user_id
            else:
                raise ValueError("User ID is required when setting a new session ID")
    elif not self.current_session_id:
        # No session ID provided and no current session
        if user_id:
            session_id = self.create_session(user_id)
        else:
            raise ValueError("Either session_id or user_id must be provided")

    # Add user message to conversation history
    self.conversation_history.append({
        "role": "user",
        "content": message,
        "timestamp": datetime.now().isoformat()
    })

    # Process message
    try:
        # Check if message is a tool command
        if message.startswith("!"):
            response = self._handle_tool_command(message)
        else:
            # Parse task
            task_info = self.task_parser.parse(message)

            # Generate response based on task
            response = self._generate_response(message, task_info)

        # Add response to conversation history
        self.conversation_history.append({
            "role": "assistant",
            "content": response,
            "timestamp": datetime.now().isoformat()
        })

        return response

    except Exception as e:
        error_message = f"Error processing message: {str(e)}"
        logger.error(error_message)

        # Add error to conversation history
        self.conversation_history.append({
            "role": "assistant",
            "content": error_message,
            "timestamp": datetime.now().isoformat(),
            "error": True
        })

        return error_message
```

The `process_message` method processes a user message and generates a response. It handles session management, adds messages to the conversation history, and processes the message using either tool commands or task parsing.

```python
def _handle_tool_command(self, command: str) -> str:
    """
    Handle a tool command.

    Args:
        command: Tool command (starting with !)

    Returns:
        Tool response
    """
    # Parse command
    parts = command[1:].split(maxsplit=1)
    tool_name = parts[0]
    args = parts[1] if len(parts) > 1 else ""

    # Check if tool exists
    if tool_name not in self.tools:
        return f"Unknown tool: {tool_name}. Available tools: {', '.join(self.tools.keys())}"

    # Execute tool
    try:
        tool = self.tools[tool_name]["function"]
        return tool(args)
    except Exception as e:
        error_message = f"Error executing tool {tool_name}: {str(e)}"
        logger.error(error_message)
        return error_message
```

The `_handle_tool_command` method handles tool commands, parsing the command, checking if the tool exists, and executing the tool.

```python
def _generate_response(self, message: str, task_info: Dict[str, Any]) -> str:
    """
    Generate a response to a user message.

    Args:
        message: User message
        task_info: Task information from parser

    Returns:
        Generated response
    """
    # In a real implementation, this would use an LLM to generate a response
    # For now, we return a simple echo response
    task_type = task_info.get("type", "unknown")
    return f"Echo: {message}\nTask type: {task_type}"
```

The `_generate_response` method generates a response to a user message based on the task information.

```python
def get_available_tools(self) -> List[Dict[str, str]]:
    """
    Get a list of available tools.

    Returns:
        List of tool information dictionaries
    """
    return [
        {"name": name, "description": info["description"]}
        for name, info in self.tools.items()
    ]
```

The `get_available_tools` method returns a list of available tools with their names and descriptions.

```python
def get_conversation_history(self) -> List[Dict[str, Any]]:
    """
    Get the conversation history for the current session.

    Returns:
        List of message dictionaries
    """
    return self.conversation_history
```

The `get_conversation_history` method returns the conversation history for the current session.

### TaskParser Class

The `TaskParser` class is responsible for parsing user messages into structured tasks. It is implemented in the `agent/task_parser.py` file.

```python
class TaskParser:
    """
    Task parser for the VANA agent.

    This class is responsible for parsing user messages into structured tasks.
    """

    def __init__(self):
        """Initialize the task parser."""
        pass

    def parse(self, message: str) -> Dict[str, Any]:
        """
        Parse a user message into a structured task.

        Args:
            message: User message

        Returns:
            Task information dictionary
        """
        # Simple implementation - in a real system, this would use more sophisticated parsing
        if "search" in message.lower():
            return {"type": "search", "query": message}
        elif "help" in message.lower():
            return {"type": "help"}
        else:
            return {"type": "conversation", "message": message}
```

The `TaskParser` class provides a simple implementation for parsing user messages into structured tasks.

## Tool Integration

The agent core integrates with tools through the `register_tool` method and the `_handle_tool_command` method. Tools are registered with the agent and can be executed using tool commands.

```python
# Register a tool
agent.register_tool("echo", echo)

# Execute a tool command
response = agent.process_message("!echo Hello, world!")
```

## Session Management

The agent core includes basic session management functionality through the `create_session` and `load_session` methods. Sessions are identified by a unique session ID and associated with a user ID.

```python
# Create a session
session_id = agent.create_session("user123")

# Load a session
agent.load_session(session_id, "user123")
```

## State Management

The agent core maintains state through the `conversation_history` attribute, which stores the conversation history for the current session.

```python
# Get conversation history
history = agent.get_conversation_history()
```

## Error Handling

The agent core includes robust error handling to ensure that errors during message processing are caught and reported.

```python
try:
    # Process message
    # ...
except Exception as e:
    error_message = f"Error processing message: {str(e)}"
    logger.error(error_message)

    # Add error to conversation history
    self.conversation_history.append({
        "role": "assistant",
        "content": error_message,
        "timestamp": datetime.now().isoformat(),
        "error": True
    })

    return error_message
```

## Usage

The agent core can be used as follows:

```python
from agent.core import VanaAgent
from agent.tools.echo import echo

# Create an agent
agent = VanaAgent()

# Register a tool
agent.register_tool("echo", echo)

# Create a session
session_id = agent.create_session("user123")

# Process a message
response = agent.process_message("Hello, world!", session_id=session_id)
print(response)  # Echo: Hello, world!

# Process a tool command
response = agent.process_message("!echo Hello, world!", session_id=session_id)
print(response)  # Echo: Hello, world!
```

For more detailed usage instructions, see the [Agent Usage Guide](../guides/agent-usage.md).
