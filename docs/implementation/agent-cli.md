# Agent CLI Implementation

[Home](../../index.md) > [Implementation](../index.md) > Agent CLI

This document describes the implementation of the command-line interface (CLI) for the VANA agent.

## Overview

The VANA agent CLI provides a command-line interface for interacting with the VANA agent. It supports three modes of operation:

- **Interactive Mode**: Allows you to have a conversation with the agent in the terminal
- **Web UI Mode**: Launches the ADK web UI for a more visual interaction experience
- **Single Message Mode**: Processes a single message and returns the response

The CLI is implemented in the `agent/cli.py` file and provides a flexible interface for interacting with the agent.

## Components

### VanaCLI Class

The `VanaCLI` class is the main class for the CLI interface. It provides methods for:

- Creating and configuring the agent
- Starting a session
- Processing messages
- Running in interactive mode
- Launching the web UI

#### Key Methods

```python
def __init__(self):
    """Initialize the CLI interface."""
    self.agent = self._create_agent()
    self.session_id = None
    self.user_id = "cli_user"
```

The constructor initializes the CLI interface by creating an agent and setting up the session state.

```python
def _create_agent(self) -> VanaAgent:
    """
    Create and configure the VANA agent.
    
    Returns:
        Configured VanaAgent instance
    """
    # Create agent
    agent = VanaAgent(name="vana", model="gemini-1.5-pro")
    
    # Add memory components
    agent.short_term_memory = ShortTermMemory()
    agent.memory_bank = MemoryBankManager()
    
    # Register tools
    agent.register_tool("echo", echo)
    agent.register_tool("read_file", read_file)
    # ... other tools ...
    
    return agent
```

The `_create_agent` method creates and configures the agent with memory components and tools.

```python
def start_session(self) -> str:
    """
    Start a new session.
    
    Returns:
        Session ID
    """
    self.session_id = self.agent.create_session(self.user_id)
    logger.info(f"Started session {self.session_id}")
    return self.session_id
```

The `start_session` method creates a new session for the agent.

```python
def process_message(self, message: str) -> str:
    """
    Process a message with the agent.
    
    Args:
        message: User message
        
    Returns:
        Agent response
    """
    if not self.session_id:
        self.start_session()
    
    response = self.agent.process_message(message, session_id=self.session_id)
    
    return response
```

The `process_message` method processes a message with the agent and returns the response.

```python
def interactive_mode(self):
    """Run the CLI in interactive mode."""
    print("VANA Agent CLI - Interactive Mode")
    print("Type 'exit' or 'quit' to exit, 'help' for help")
    
    self.start_session()
    
    while True:
        try:
            user_input = input("\nYou: ")
            
            if user_input.lower() in ["exit", "quit"]:
                print("Exiting VANA Agent CLI")
                break
            
            if user_input.lower() == "help":
                self._print_help()
                continue
            
            response = self.process_message(user_input)
            print(f"\nVANA: {response}")
            
        except KeyboardInterrupt:
            print("\nExiting VANA Agent CLI")
            break
        except Exception as e:
            print(f"Error: {str(e)}")
```

The `interactive_mode` method runs the CLI in interactive mode, allowing the user to have a conversation with the agent.

```python
def launch_web_ui(self, port: int = 8080):
    """
    Launch the ADK web UI.
    
    Args:
        port: Port to run the web UI on
    """
    try:
        # Get the current directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(current_dir, ".."))
        
        # Run the ADK web command
        print(f"Launching ADK web UI on port {port}...")
        subprocess.run(["adk", "web", "--port", str(port)], cwd=project_root)
    except FileNotFoundError:
        print("Error: ADK command not found. Please make sure the Google ADK is installed.")
        print("You can install it with: pip install google-adk")
    except Exception as e:
        print(f"Error launching ADK web UI: {str(e)}")
```

The `launch_web_ui` method launches the ADK web UI for a more visual interaction experience.

### Command-Line Interface

The CLI provides a command-line interface for interacting with the agent. It uses the `argparse` module to parse command-line arguments.

```python
def parse_args():
    """
    Parse command-line arguments.
    
    Returns:
        Parsed arguments
    """
    parser = argparse.ArgumentParser(description="VANA Agent CLI")
    
    # Add subparsers for different modes
    subparsers = parser.add_subparsers(dest="mode", help="Mode to run the CLI in")
    
    # Interactive mode
    interactive_parser = subparsers.add_parser("interactive", help="Run in interactive mode")
    
    # Web UI mode
    web_parser = subparsers.add_parser("web", help="Launch the ADK web UI")
    web_parser.add_argument("--port", type=int, default=8080, help="Port to run the web UI on")
    
    # Single message mode
    message_parser = subparsers.add_parser("message", help="Process a single message")
    message_parser.add_argument("message", help="Message to process")
    
    return parser.parse_args()
```

The `parse_args` function parses command-line arguments for the CLI.

```python
def main():
    """Main entry point for the CLI."""
    args = parse_args()
    cli = VanaCLI()
    
    if args.mode == "interactive":
        cli.interactive_mode()
    elif args.mode == "web":
        cli.launch_web_ui(port=args.port)
    elif args.mode == "message":
        response = cli.process_message(args.message)
        print(response)
    else:
        # Default to interactive mode
        cli.interactive_mode()
```

The `main` function is the entry point for the CLI. It parses command-line arguments and runs the CLI in the appropriate mode.

## Tool Integration

The CLI integrates with the agent's tools by registering them with the agent. This allows the user to execute tool commands directly from the CLI.

```python
def _create_agent(self) -> VanaAgent:
    # ... other code ...
    
    # Register tools
    agent.register_tool("echo", echo)
    agent.register_tool("read_file", read_file)
    agent.register_tool("write_file", write_file)
    agent.register_tool("list_directory", list_directory)
    agent.register_tool("file_exists", file_exists)
    agent.register_tool("vector_search", vector_search)
    agent.register_tool("search_knowledge", search_knowledge)
    agent.register_tool("get_health_status", get_health_status)
    agent.register_tool("web_search", web_search)
    agent.register_tool("kg_query", kg_query)
    agent.register_tool("kg_store", kg_store)
    agent.register_tool("kg_relationship", kg_relationship)
    agent.register_tool("kg_extract_entities", kg_extract_entities)
    
    return agent
```

The `_create_agent` method registers all available tools with the agent.

## Memory Integration

The CLI integrates with the agent's memory components by adding them to the agent.

```python
def _create_agent(self) -> VanaAgent:
    # ... other code ...
    
    # Add memory components
    agent.short_term_memory = ShortTermMemory()
    agent.memory_bank = MemoryBankManager()
    
    # ... other code ...
    
    return agent
```

The `_create_agent` method adds the short-term memory and memory bank components to the agent.

## Error Handling

The CLI includes comprehensive error handling to ensure a smooth user experience.

```python
def interactive_mode(self):
    # ... other code ...
    
    while True:
        try:
            # ... other code ...
        except KeyboardInterrupt:
            print("\nExiting VANA Agent CLI")
            break
        except Exception as e:
            print(f"Error: {str(e)}")
```

The `interactive_mode` method catches and handles exceptions to prevent the CLI from crashing.

```python
def launch_web_ui(self, port: int = 8080):
    try:
        # ... other code ...
    except FileNotFoundError:
        print("Error: ADK command not found. Please make sure the Google ADK is installed.")
        print("You can install it with: pip install google-adk")
    except Exception as e:
        print(f"Error launching ADK web UI: {str(e)}")
```

The `launch_web_ui` method catches and handles exceptions when launching the ADK web UI.

## Usage

The CLI can be used in three modes:

1. **Interactive Mode**:
   ```bash
   python -m agent.cli interactive
   ```

2. **Web UI Mode**:
   ```bash
   python -m agent.cli web --port 8080
   ```

3. **Single Message Mode**:
   ```bash
   python -m agent.cli message "Hello, VANA!"
   ```

For more detailed usage instructions, see the [Agent CLI Guide](../guides/agent-cli-guide.md).
