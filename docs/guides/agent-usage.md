# VANA Agent Usage Guide

[Home](../../index.md) > [Guides](index.md) > Agent Usage

## 1. Introduction

This guide provides instructions for using the VANA agent in your applications. The VANA agent is a flexible, extensible agent that can be used to process user messages, execute tasks, and integrate with various tools.

## 2. Installation

The VANA agent is part of the VANA project and is not currently available as a standalone package. To use the agent, you'll need to clone the VANA repository and include the agent module in your project.

```bash
git clone https://github.com/your-username/vana.git
cd vana
```

## 3. Basic Usage

### 3.1 Creating an Agent

To create a VANA agent, import the `VanaAgent` class from the `agent.core` module and instantiate it:

```python
from agent.core import VanaAgent

# Create an agent with default settings
agent = VanaAgent()

# Create an agent with custom settings
custom_agent = VanaAgent(
    name="custom_agent",
    model="gemini-1.5-pro"  # Or another model
)
```

### 3.2 Processing Messages

To process a user message, use the `process_message` method:

```python
# Process a message with a new session
response = agent.process_message("Hello, world!", user_id="user123")
print(response)

# Process a message with an existing session
response = agent.process_message(
    "How are you?",
    session_id="existing_session_id",
    user_id="user123"
)
print(response)
```

The `process_message` method returns the agent's response as a string.

### 3.3 Session Management

The VANA agent maintains state across multiple interactions within a session. You can create and load sessions as follows:

```python
# Create a new session
session_id = agent.create_session(user_id="user123")

# Load an existing session
agent.load_session(session_id="existing_session_id", user_id="user123")

# Process a message in the current session
response = agent.process_message("Hello, world!")
```

### 3.4 Conversation History

You can retrieve the conversation history for the current session using the `get_conversation_history` method:

```python
history = agent.get_conversation_history()
for message in history:
    print(f"{message['role']}: {message['content']}")
```

## 4. Tool Integration

### 4.1 Using Built-in Tools

The VANA agent comes with a simple "echo" tool for testing. You can use it as follows:

```python
from agent.core import VanaAgent
from agent.tools.echo import echo

# Create an agent
agent = VanaAgent()

# Register the echo tool
agent.register_tool("echo", echo)

# Process a tool command
response = agent.process_message("!echo Hello, world!", user_id="user123")
print(response)  # Echo: Hello, world!
```

### 4.2 Creating Custom Tools

You can create custom tools as functions or classes and register them with the agent:

```python
from agent.core import VanaAgent

# Create an agent
agent = VanaAgent()

# Define a custom tool function
def reverse(text):
    """Reverse the input text."""
    return text[::-1]

# Register the custom tool
agent.register_tool("reverse", reverse)

# Process a tool command
response = agent.process_message("!reverse Hello, world!", user_id="user123")
print(response)  # !dlrow ,olleH
```

For more sophisticated tools, you can create a class with an `execute` method:

```python
from agent.core import VanaAgent

# Create a custom tool class
class CalculatorTool:
    """A simple calculator tool."""
    
    def execute(self, expression):
        """Evaluate a mathematical expression."""
        try:
            result = eval(expression)
            return f"Result: {result}"
        except Exception as e:
            return f"Error: {str(e)}"
    
    def get_metadata(self):
        """Get metadata about the tool."""
        return {
            "name": "calculator",
            "description": "A simple calculator tool",
            "parameters": [
                {
                    "name": "expression",
                    "type": "string",
                    "description": "Mathematical expression to evaluate",
                    "required": True
                }
            ],
            "returns": {
                "type": "string",
                "description": "Evaluation result"
            }
        }

# Create an agent
agent = VanaAgent()

# Create and register the calculator tool
calculator = CalculatorTool()
agent.register_tool("calculator", calculator.execute, calculator.get_metadata()["description"])

# Process a tool command
response = agent.process_message("!calculator 2 + 2", user_id="user123")
print(response)  # Result: 4
```

### 4.3 Discovering Available Tools

You can get a list of available tools using the `get_available_tools` method:

```python
tools = agent.get_available_tools()
for tool in tools:
    print(f"{tool['name']}: {tool['description']}")
```

## 5. Task Parsing

The VANA agent uses a `TaskParser` to convert user messages into structured tasks. The parser recognizes several types of tasks:

- **Search**: Messages like "search for X", "find information about X", "look up X", "what is X"
- **Tool Request**: Messages like "use X tool", "run X", "execute X"
- **Conversation**: Messages like "hi", "hello", "how are you", "what's your name"

You can extend the parser by modifying the `task_patterns` dictionary in the `TaskParser` class.

## 6. Error Handling

The VANA agent includes robust error handling. Errors during message processing, tool execution, or session management are caught and included in the response to the user.

```python
# Define a tool that raises an exception
def error_tool(text):
    """A tool that always raises an exception."""
    raise ValueError("Test error")

# Register the tool
agent.register_tool("error", error_tool)

# Process a tool command that will raise an exception
response = agent.process_message("!error test", user_id="user123")
print(response)  # Error executing tool error: Test error
```

## 7. Advanced Usage

### 7.1 Integrating with External Services

You can integrate the VANA agent with external services by creating tools that interact with those services:

```python
import requests

def weather_tool(location):
    """Get the weather for a location."""
    try:
        # Make a request to a weather API
        response = requests.get(f"https://api.example.com/weather?location={location}")
        data = response.json()
        
        # Extract and format the weather information
        temperature = data["temperature"]
        conditions = data["conditions"]
        
        return f"Weather for {location}: {temperature}°C, {conditions}"
    except Exception as e:
        return f"Error getting weather: {str(e)}"

# Register the tool
agent.register_tool("weather", weather_tool, "Get the weather for a location")

# Process a tool command
response = agent.process_message("!weather New York", user_id="user123")
print(response)  # Weather for New York: 22°C, Partly Cloudy
```

### 7.2 Customizing Response Generation

In the current implementation, the agent's response generation is simple. In a future phase, this will be extended to support more sophisticated response generation using large language models.

## 8. Troubleshooting

### 8.1 Common Issues

- **Unknown Tool**: If you get an "Unknown tool" error, make sure you've registered the tool with the agent.
- **Session Not Found**: If you get a session-related error, make sure you're using a valid session ID.
- **Tool Execution Error**: If a tool raises an exception, the error will be included in the response.

### 8.2 Logging

The VANA agent uses Python's logging module to log information about its operations. You can configure the logging level as follows:

```python
import logging
logging.basicConfig(level=logging.DEBUG)  # Set to DEBUG for more detailed logs
```

## 9. Next Steps

The VANA agent is under active development, with several planned enhancements:

- **LLM Integration**: Integration with large language models for more sophisticated response generation
- **Memory Integration**: Integration with the VANA memory system for persistent state
- **Advanced Tool Integration**: Support for more sophisticated tools, including those that require authentication or have side effects
- **Multi-Turn Conversations**: Support for multi-turn conversations with context preservation
- **Structured Output**: Support for structured output formats (e.g., JSON, Markdown)
