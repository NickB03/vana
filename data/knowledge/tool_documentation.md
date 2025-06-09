---
title: Tool Documentation
created: 2025-06-08T14:45:13.054429
source: vana_knowledge_base_creator
type: system_documentation
---

# VANA Tool Documentation

## Search Tools

### brave_search_mcp
- **Purpose**: Web search using Brave Search API
- **Usage**: `brave_search_mcp("search query")`
- **Features**: Rate limit protection, intelligent caching
- **Output**: Structured search results with URLs and snippets

### search_knowledge  
- **Purpose**: Search VANA knowledge base using RAG pipeline
- **Usage**: `search_knowledge("VANA capabilities")`
- **Features**: Semantic search, VANA-specific knowledge
- **Output**: Relevant knowledge with confidence scores

### vector_search
- **Purpose**: Semantic similarity search using Vertex AI
- **Usage**: `vector_search("technical documentation")`
- **Features**: Vector embeddings, similarity matching
- **Output**: Similar content with relevance scores

## File Operations

### adk_read_file
- **Purpose**: Read file contents
- **Usage**: `adk_read_file("path/to/file.txt")`
- **Features**: Error handling, encoding detection
- **Output**: File contents as string

### adk_write_file
- **Purpose**: Write content to file
- **Usage**: `adk_write_file("path/to/file.txt", "content")`
- **Features**: Directory creation, backup handling
- **Output**: Success confirmation

### adk_list_directory
- **Purpose**: List directory contents
- **Usage**: `adk_list_directory("path/to/directory")`
- **Features**: Recursive listing, file type detection
- **Output**: Directory structure

## System Tools

### adk_echo
- **Purpose**: Echo input for testing
- **Usage**: `adk_echo("test message")`
- **Features**: Simple testing and validation
- **Output**: Echoed message

### adk_check_task_status
- **Purpose**: Check task execution status
- **Usage**: `adk_check_task_status("task_id")`
- **Features**: Progress tracking, status monitoring
- **Output**: Task status and progress

### adk_generate_report
- **Purpose**: Generate formatted reports
- **Usage**: `adk_generate_report(data, format="markdown")`
- **Features**: Multiple formats, template support
- **Output**: Formatted report document
