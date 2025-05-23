# VANA Agent Demo Guide

This guide provides detailed information on how to run and understand the VANA agent demo.

## Table of Contents

1. [Introduction](#introduction)
2. [Running the Demo](#running-the-demo)
3. [Demo Sections](#demo-sections)
   - [Introduction](#introduction-section)
   - [Memory Demo](#memory-demo)
   - [Knowledge Graph Demo](#knowledge-graph-demo)
   - [Vector Search Demo](#vector-search-demo)
   - [Web Search Demo](#web-search-demo)
   - [File System Demo](#file-system-demo)
   - [Conclusion](#conclusion-section)
4. [Interactive vs. Non-Interactive Mode](#interactive-vs-non-interactive-mode)
5. [Customizing the Demo](#customizing-the-demo)
6. [Troubleshooting](#troubleshooting)

## Introduction

The VANA agent demo is a guided demonstration of the agent's capabilities, including:

- Short-term memory and context preservation
- Knowledge graph integration
- Vector search for semantic retrieval
- Web search for real-time information
- File system operations

The demo walks you through each capability with examples, allowing you to see the agent in action and understand its features.

## Running the Demo

To run the demo, use the following command:

```bash
python -m scripts.demo_agent
```

By default, the demo runs in interactive mode, which means it will pause after each section and wait for you to press Enter to continue. If you prefer to run the demo without pausing, you can use the `--non-interactive` flag:

```bash
python -m scripts.demo_agent --non-interactive
```

## Demo Sections

The demo is divided into several sections, each showcasing a different capability of the VANA agent.

### Introduction Section

The introduction section provides an overview of the agent's capabilities. It asks the agent to introduce itself and explain what it can do.

**Example Interaction:**

```
User: Hello! Can you introduce yourself and explain what you can do?

VANA: Hello! I'm VANA, an AI assistant designed to help you with various tasks. I have several capabilities:

1. I can maintain context across our conversation using my short-term memory.
2. I can store and retrieve structured knowledge using my knowledge graph integration.
3. I can search for information semantically using Vector Search.
4. I can find real-time information on the web using web search.
5. I can interact with the file system to read and write files.

How can I assist you today?
```

### Memory Demo

The memory demo showcases the agent's ability to maintain context across interactions. It demonstrates how the agent can remember information about the user and refer back to it in later interactions.

**Example Interaction:**

```
User: My name is Demo User and I'm interested in artificial intelligence.

VANA: Nice to meet you, Demo User! It's great to hear that you're interested in artificial intelligence. That's a fascinating field with many exciting developments. Is there any particular aspect of AI that you're most interested in?

User: What's my name and what am I interested in?

VANA: Your name is Demo User, and you mentioned that you're interested in artificial intelligence.
```

### Knowledge Graph Demo

The knowledge graph demo demonstrates the agent's ability to store and retrieve structured knowledge. It shows how the agent can remember facts about entities and relationships between them.

**Example Interaction:**

```
User: Please remember that VANA is an AI project with memory and knowledge graph capabilities.

VANA: I've stored that information. VANA (which is me) is an AI project with memory and knowledge graph capabilities. Is there anything else you'd like me to remember about VANA?

User: Also remember that VANA uses Vector Search for semantic retrieval.

VANA: I've stored that relationship. VANA uses Vector Search for semantic retrieval. This is an important capability that allows me to find information based on meaning rather than just keywords.

User: What do you know about VANA and what technologies does it use?

VANA: Based on what you've told me, I know that VANA (which is me) is an AI project with memory and knowledge graph capabilities. VANA uses Vector Search technology for semantic retrieval, which allows for finding information based on meaning rather than just keywords.
```

### Vector Search Demo

The vector search demo showcases the agent's ability to perform semantic search using Vector Search. It demonstrates how the agent can find information based on meaning rather than just keywords.

**Example Interaction:**

```
User: Can you search for information about 'memory systems in AI agents'?

VANA: I'll search for information about memory systems in AI agents.

Here's what I found:

1. Memory systems in AI agents allow for context preservation, enabling agents to maintain information across interactions.
2. Knowledge graphs store structured information about entities and relationships, providing a way for agents to organize and retrieve knowledge.

These memory systems are crucial for AI agents to provide contextually relevant responses and maintain coherent conversations.
```

### Web Search Demo

The web search demo demonstrates the agent's ability to search the web for real-time information. It shows how the agent can find up-to-date information on topics that may not be in its knowledge base.

**Example Interaction:**

```
User: What are the latest developments in AI agent technology? Please search the web.

VANA: I'll search the web for the latest developments in AI agent technology.

Here's what I found:

1. Recent advances in AI agents include improved memory systems and knowledge retrieval, allowing for more contextually relevant responses.
2. Vector search is being increasingly used in AI agents for semantic retrieval of information based on meaning rather than keywords.

These developments are making AI agents more capable of understanding and responding to complex queries with relevant information.
```

### File System Demo

The file system demo showcases the agent's ability to interact with the file system. It demonstrates how the agent can read and write files, list directories, and check if files exist.

**Example Interaction:**

```
User: Can you list the files in the memory-bank directory and tell me what they contain?

VANA: I'll list the files in the memory-bank directory and provide a summary of their contents.

Files in the memory-bank directory:
1. activeContext.md - Contains information about the current focus of the project
2. progress.md - Contains information about completed tasks and progress
3. projectbrief.md - Contains the project goals, scope, and requirements
4. productContext.md - Contains information about the problems, UX goals, and solution vision
5. systemPatterns.md - Contains information about the system design, architecture, and technical decisions
6. techContext.md - Contains information about the tools, languages, dependencies, and constraints

These files serve as the memory bank for the VANA agent, providing persistent knowledge across sessions.
```

### Conclusion Section

The conclusion section wraps up the demo by asking the agent to summarize what capabilities it has demonstrated.

**Example Interaction:**

```
User: Thank you for the demo. Can you summarize what capabilities you've demonstrated?

VANA: Throughout this demo, I've demonstrated several key capabilities:

1. Short-term Memory: I showed how I can remember information about you and our conversation, maintaining context across multiple interactions.

2. Knowledge Graph Integration: I demonstrated how I can store and retrieve structured knowledge about entities (like VANA) and relationships (like VANA using Vector Search).

3. Vector Search: I showed how I can perform semantic search to find information based on meaning rather than just keywords.

4. Web Search: I demonstrated how I can search the web for real-time information on topics like the latest developments in AI agent technology.

5. File System Interaction: I showed how I can interact with the file system to list files and provide information about their contents.

These capabilities work together to make me a versatile AI assistant that can help with a wide range of tasks while maintaining context and providing relevant information.
```

## Interactive vs. Non-Interactive Mode

The demo can be run in two modes:

- **Interactive Mode (default)**: The demo pauses after each section and waits for you to press Enter to continue. This allows you to take your time to read and understand each section.

- **Non-Interactive Mode**: The demo runs through all sections without pausing. This is useful for automated testing or when you want to see the entire demo without interruption.

To run the demo in non-interactive mode, use the `--non-interactive` flag:

```bash
python -m scripts.demo_agent --non-interactive
```

## Customizing the Demo

You can customize the demo by modifying the `scripts/demo_agent.py` file. Here are some ways you can customize it:

- Add new sections to showcase additional capabilities
- Modify the example interactions to focus on specific use cases
- Change the order of the sections to highlight different aspects of the agent
- Add more detailed explanations or examples

## Troubleshooting

### Common Issues

1. **Demo Not Running**

   If the demo doesn't run, make sure you're in the project root directory and that you have all the required dependencies installed.

2. **Mock Responses**

   The demo uses mock responses for external services like vector search and web search. If you want to use real services, you'll need to modify the `scripts/demo_agent.py` file to use the real services instead of mocks.

3. **File System Demo Errors**

   If you encounter errors in the file system demo, make sure the agent has permission to read and write files in the specified directories.

### Getting Help

If you encounter any issues not covered in this guide, please:

1. Check the logs in the `logs` directory for error messages
2. Consult the documentation in the `docs` directory
3. Contact the project maintainers for assistance
