# VANA Agent Tool Usage Guide

This guide provides detailed information on how to use the various tools available in the VANA agent.

## Table of Contents

1. [Introduction](#introduction)
2. [Echo Tool](#echo-tool)
3. [File System Tools](#file-system-tools)
4. [Vector Search Tools](#vector-search-tools)
5. [Web Search Tools](#web-search-tools)
6. [Knowledge Graph Tools](#knowledge-graph-tools)
7. [Using Tools in Code](#using-tools-in-code)
8. [Using Tools via Agent Commands](#using-tools-via-agent-commands)

## Introduction

VANA's agent architecture is built around a modular tool system. Each tool provides specific functionality that the agent can use to perform tasks. Tools can be used directly in code or via agent commands.

## Echo Tool

The Echo tool is a simple tool that echoes back the input text. It's primarily used for testing the agent's tool integration capabilities.

### Usage

```python
from agent.tools.echo import echo

# Using the echo function
result = echo("Hello, world!")
print(result)  # Output: "Echo: Hello, world!"

# Using the EchoTool class
from agent.tools.echo import EchoTool
echo_tool = EchoTool(prefix="Custom: ")
result = echo_tool.execute("Hello, world!")
print(result)  # Output: "Custom: Hello, world!"
```

### Agent Command

```
!echo Hello, world!
```

## File System Tools

The File System tools provide file operations such as reading, writing, and listing files. These operations are implemented with appropriate security checks and error handling.

### Available Functions

- `read_file(path)`: Read a file and return its contents
- `write_file(path, content, append=False)`: Write content to a file
- `list_directory(path)`: List contents of a directory
- `file_exists(path)`: Check if a file exists

### Usage

```python
from agent.tools.file_system import read_file, write_file, list_directory, file_exists

# Reading a file
content = read_file("/path/to/file.txt")
if isinstance(content, dict) and not content.get("success", False):
    print(f"Error: {content['error']}")
else:
    print(f"Content: {content}")

# Writing to a file
result = write_file("/path/to/new_file.txt", "Hello, world!")
if result["success"]:
    print("File written successfully")
else:
    print(f"Error: {result['error']}")

# Appending to a file
result = write_file("/path/to/file.txt", "Appended content", append=True)

# Listing a directory
contents = list_directory("/path/to/directory")
if isinstance(contents, dict) and not contents.get("success", False):
    print(f"Error: {contents['error']}")
else:
    for item in contents:
        print(f"{item['name']} ({item['type']})")

# Checking if a file exists
exists = file_exists("/path/to/file.txt")
if isinstance(exists, dict) and not exists.get("success", False):
    print(f"Error: {exists['error']}")
else:
    print(f"File exists: {exists}")
```

### Agent Commands

```
!read_file /path/to/file.txt
!write_file /path/to/file.txt This is the content to write
!list_directory /path/to/directory
!file_exists /path/to/file.txt
```

## Vector Search Tools

The Vector Search tools provide access to the Vertex AI Vector Search service for semantic search and knowledge retrieval.

### Available Functions

- `search(query, top_k=5)`: Search for relevant content using Vector Search
- `search_knowledge(query, top_k=5)`: Search for knowledge using Vector Search
- `get_health_status()`: Get the health status of the Vector Search client
- `upload_content(content, metadata=None)`: Upload content to Vector Search

### Usage

```python
from agent.tools.vector_search import search, search_knowledge, get_health_status, upload_content

# Searching for content
results = search("What is VANA?", top_k=3)
if isinstance(results, dict) and not results.get("success", False):
    print(f"Error: {results['error']}")
else:
    for result in results:
        print(f"Content: {result['content']}")
        print(f"Score: {result['score']}")
        print(f"Source: {result['source']}")
        print("---")

# Searching for knowledge
results = search_knowledge("What is Vector Search?", top_k=3)
if isinstance(results, dict) and not results.get("success", False):
    print(f"Error: {results['error']}")
else:
    for result in results:
        print(f"Content: {result['content']}")
        print(f"Score: {result['score']}")
        print(f"Source: {result['source']}")
        print("---")

# Getting health status
status = get_health_status()
print(f"Status: {status['status']}")
print(f"Message: {status['message']}")

# Uploading content
result = upload_content(
    "This is some content to upload to Vector Search",
    metadata={"source": "example", "type": "text"}
)
if result["success"]:
    print("Content uploaded successfully")
else:
    print(f"Error: {result['error']}")
```

### Agent Commands

```
!vector_search What is VANA?
!search_knowledge What is Vector Search?
!get_health_status
!upload_content This is some content to upload to Vector Search
```

## Web Search Tools

The Web Search tools provide access to the Google Custom Search API for real-time web search.

### Available Functions

- `search(query, num_results=5)`: Search the web using Google Custom Search API
- `search_mock(query, num_results=5)`: Search using the mock implementation (for testing)

### Usage

```python
from agent.tools.web_search import search, search_mock

# Searching the web
results = search("VANA AI agent", num_results=3)
if isinstance(results, dict) and not results.get("success", False):
    print(f"Error: {results['error']}")
else:
    for result in results:
        print(f"Title: {result['title']}")
        print(f"Link: {result['link']}")
        print(f"Snippet: {result['snippet']}")
        print("---")

# Using the mock implementation for testing
results = search_mock("VANA AI agent", num_results=3)
for result in results:
    print(f"Title: {result['title']}")
    print(f"Link: {result['link']}")
    print(f"Snippet: {result['snippet']}")
    print("---")
```

### Agent Commands

```
!web_search VANA AI agent
```

## Knowledge Graph Tools

The Knowledge Graph tools provide access to the MCP-based Knowledge Graph for storing and retrieving structured knowledge.

### Available Functions

- `kg_query(entity_type, query_text)`: Query the Knowledge Graph for entities
- `kg_store(entity_name, entity_type, observation)`: Store information in the Knowledge Graph
- `kg_relationship(entity1, relationship, entity2)`: Store a relationship between two entities
- `kg_extract_entities(text)`: Extract entities from text

### Usage

```python
from agent.tools.knowledge_graph import kg_query, kg_store, kg_relationship, kg_extract_entities

# Querying the Knowledge Graph
entities = kg_query("project", "VANA")
if isinstance(entities, dict) and not entities.get("success", False):
    print(f"Error: {entities['error']}")
else:
    for entity in entities:
        print(f"Name: {entity['name']}")
        print(f"Type: {entity['type']}")
        print(f"Observation: {entity['observation']}")
        print("---")

# Storing information
result = kg_store("VANA", "project", "VANA is an AI project with memory and knowledge graph capabilities")
if result["success"]:
    print("Information stored successfully")
else:
    print(f"Error: {result['error']}")

# Storing a relationship
result = kg_relationship("VANA", "uses", "Vector Search")
if result["success"]:
    print("Relationship stored successfully")
else:
    print(f"Error: {result['error']}")

# Extracting entities from text
entities = kg_extract_entities("VANA is a project that uses Vector Search and Knowledge Graph technologies")
if isinstance(entities, dict) and not entities.get("success", False):
    print(f"Error: {entities['error']}")
else:
    for entity in entities:
        print(f"Name: {entity['name']}")
        print(f"Type: {entity['type']}")
        print(f"Observation: {entity['observation']}")
        print("---")
```

### Agent Commands

```
!kg_query project VANA
!kg_store VANA project "VANA is an AI project with memory and knowledge graph capabilities"
!kg_relationship VANA uses "Vector Search"
!kg_extract_entities "VANA is a project that uses Vector Search and Knowledge Graph technologies"
```

## Using Tools in Code

To use tools in your code, you can import the tool functions directly:

```python
from agent.tools.echo import echo
from agent.tools.file_system import read_file, write_file
from agent.tools.vector_search import search as vector_search
from agent.tools.web_search import search as web_search
from agent.tools.knowledge_graph import kg_query, kg_store, kg_relationship, kg_extract_entities

# Use the tools
echo_result = echo("Hello, world!")
file_content = read_file("/path/to/file.txt")
search_results = vector_search("What is VANA?")
web_results = web_search("VANA AI agent")
kg_entities = kg_query("project", "VANA")
kg_store_result = kg_store("VANA", "project", "VANA is an AI project")
```

## Using Tools via Agent Commands

To use tools via agent commands, you need to register the tools with the agent:

```python
from agent.core import VanaAgent
from agent.tools.echo import echo
from agent.tools.file_system import read_file, write_file, list_directory, file_exists
from agent.tools.vector_search import search as vector_search
from agent.tools.web_search import search as web_search
from agent.tools.knowledge_graph import kg_query, kg_store, kg_relationship, kg_extract_entities

# Create the agent
agent = VanaAgent(name="vana", model="gemini-1.5-pro")

# Register tools
agent.register_tool("echo", echo)
agent.register_tool("read_file", read_file)
agent.register_tool("write_file", write_file)
agent.register_tool("list_directory", list_directory)
agent.register_tool("file_exists", file_exists)
agent.register_tool("vector_search", vector_search)
agent.register_tool("web_search", web_search)
agent.register_tool("kg_query", kg_query)
agent.register_tool("kg_store", kg_store)
agent.register_tool("kg_relationship", kg_relationship)
agent.register_tool("kg_extract_entities", kg_extract_entities)

# Create a session
session_id = agent.create_session("user123")

# Process commands
response = agent.process_message("!echo Hello, world!", session_id=session_id)
print(response)  # Output: "Echo: Hello, world!"

response = agent.process_message("!vector_search What is VANA?", session_id=session_id)
print(response)  # Output: Vector search results

response = agent.process_message("!kg_query project VANA", session_id=session_id)
print(response)  # Output: Knowledge Graph entities

response = agent.process_message('!kg_store VANA project "VANA is an AI project"', session_id=session_id)
print(response)  # Output: Storage confirmation
```

You can also get a list of available tools:

```python
tools = agent.get_available_tools()
for tool in tools:
    print(f"{tool['name']}: {tool['description']}")
```

## Error Handling

All tools return structured responses that include success/failure information. When using tools directly, always check if the response is an error:

```python
from agent.tools.file_system import read_file

result = read_file("/path/to/file.txt")
if isinstance(result, dict) and not result.get("success", False):
    print(f"Error: {result['error']}")
else:
    print(f"Content: {result}")
```

When using tools via agent commands, the agent handles error checking and returns appropriate responses.
