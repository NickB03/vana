# VANA Agent CLI Guide

This guide provides detailed information on how to use the VANA agent command-line interface (CLI).

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Basic Usage](#basic-usage)
4. [Interactive Mode](#interactive-mode)
5. [Web UI Mode](#web-ui-mode)
6. [Single Message Mode](#single-message-mode)
7. [Tool Commands](#tool-commands)
8. [Examples](#examples)
9. [Troubleshooting](#troubleshooting)

## Introduction

The VANA agent CLI provides a command-line interface for interacting with the VANA agent. It supports three modes of operation:

- **Interactive Mode**: Allows you to have a conversation with the agent in the terminal
- **Web UI Mode**: Launches the ADK web UI for a more visual interaction experience
- **Single Message Mode**: Processes a single message and returns the response

The CLI also provides access to all of the agent's tools, including file system operations, vector search, web search, and knowledge graph integration.

## Installation

The VANA agent CLI is included with the VANA agent. To use it, you need to have the VANA agent installed and configured.

If you want to use the Web UI mode, you also need to have the Google ADK installed:

```bash
pip install google-adk
```

## Basic Usage

The basic syntax for the VANA agent CLI is:

```bash
python -m agent.cli [mode] [options]
```

Where `[mode]` is one of:

- `interactive`: Run in interactive mode
- `web`: Launch the ADK web UI
- `message`: Process a single message

If no mode is specified, the CLI defaults to interactive mode.

## Interactive Mode

Interactive mode allows you to have a conversation with the agent in the terminal. To start interactive mode:

```bash
python -m agent.cli interactive
```

In interactive mode, you can:

- Type any message to interact with the agent
- Use `!command` to execute agent tools directly
- Type `help` to see available commands
- Type `exit` or `quit` to exit

Example session:

```
VANA Agent CLI - Interactive Mode
Type 'exit' or 'quit' to exit, 'help' for help

You: Hello
VANA: Hello! I'm VANA, your AI assistant. How can I help you today?

You: What can you do?
VANA: I can help you with a variety of tasks, including:
- Answering questions and providing information
- Searching for information using vector search and web search
- Interacting with the file system (reading and writing files)
- Storing and retrieving information in a knowledge graph
- Maintaining context across our conversation

Is there something specific you'd like help with?

You: help
VANA Agent CLI Help:
  - Type any message to interact with the agent
  - Use '!command' to execute agent tools directly
  - Type 'exit' or 'quit' to exit

Available tools:
  - !echo
  - !read_file
  - !write_file
  - !list_directory
  - !file_exists
  - !vector_search
  - !search_knowledge
  - !get_health_status
  - !web_search
  - !kg_query
  - !kg_store
  - !kg_relationship
  - !kg_extract_entities

You: exit
Exiting VANA Agent CLI
```

## Web UI Mode

Web UI mode launches the ADK web UI for a more visual interaction experience. To start Web UI mode:

```bash
python -m agent.cli web [--port PORT]
```

Where `PORT` is the port to run the web UI on (default: 8080).

This will launch the ADK web UI in your default browser, where you can interact with the agent using a graphical interface.

## Single Message Mode

Single message mode processes a single message and returns the response. To use single message mode:

```bash
python -m agent.cli message "Your message here"
```

Example:

```bash
python -m agent.cli message "What is VANA?"
VANA is an AI agent with memory and knowledge graph capabilities. It can help you with a variety of tasks, including answering questions, searching for information, and interacting with the file system.
```

## Tool Commands

You can execute agent tools directly using the `!command` syntax in interactive mode. The available tools are:

- `!echo [message]`: Echo a message
- `!read_file [path]`: Read a file
- `!write_file [path] [content]`: Write to a file
- `!list_directory [path]`: List files in a directory
- `!file_exists [path]`: Check if a file exists
- `!vector_search [query]`: Search using vector search
- `!search_knowledge [query]`: Search knowledge base
- `!get_health_status`: Get vector search health status
- `!web_search [query]`: Search the web
- `!kg_query [entity_type] [query]`: Query the knowledge graph
- `!kg_store [entity_name] [entity_type] [observation]`: Store information in the knowledge graph
- `!kg_relationship [entity1] [relationship] [entity2]`: Store a relationship in the knowledge graph
- `!kg_extract_entities [text]`: Extract entities from text

Example:

```
You: !read_file /path/to/file.txt
VANA: This is the content of the file.

You: !web_search VANA AI agent
VANA: [Web search results for "VANA AI agent"]
```

## Examples

### Example 1: Interactive Conversation

```bash
python -m agent.cli interactive
```

```
You: Hello
VANA: Hello! I'm VANA, your AI assistant. How can I help you today?

You: Can you tell me about memory systems in AI?
VANA: [Detailed response about memory systems in AI]

You: How does that relate to VANA?
VANA: [Response explaining how memory systems are used in VANA]
```

### Example 2: Using the Web UI

```bash
python -m agent.cli web --port 8080
```

This will launch the ADK web UI in your default browser, where you can interact with the agent using a graphical interface.

### Example 3: Using Tool Commands

```bash
python -m agent.cli interactive
```

```
You: !list_directory /path/to/directory
VANA: [List of files in the directory]

You: !read_file /path/to/file.txt
VANA: [Content of the file]

You: !kg_store VANA project "VANA is an AI project with memory capabilities"
VANA: Information stored successfully.

You: !kg_query project VANA
VANA: [Information about VANA from the knowledge graph]
```

## Troubleshooting

### Common Issues

1. **ADK Web UI Not Launching**

   If the ADK web UI doesn't launch, make sure you have the Google ADK installed:

   ```bash
   pip install google-adk
   ```

   Also, check that the port is not already in use. You can specify a different port:

   ```bash
   python -m agent.cli web --port 8081
   ```

2. **Tool Command Not Found**

   If a tool command is not found, make sure you're using the correct syntax:

   ```
   !tool_name arg1 arg2 ...
   ```

   You can see the list of available tools by typing `help` in interactive mode.

3. **File Not Found**

   If a file is not found when using file system tools, make sure you're using the correct path. Relative paths are relative to the current working directory.

### Getting Help

If you encounter any issues not covered in this guide, please:

1. Check the logs in the `logs` directory for error messages
2. Consult the documentation in the `docs` directory
3. Contact the project maintainers for assistance
