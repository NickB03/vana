# Enhanced Memory Operations for VANA

This document describes the enhanced memory operations available in the VANA system, which extend the basic memory capabilities with more sophisticated features.

## Overview

The enhanced memory operations provide the following capabilities:

1. **Memory Filtering**: Filter memories by date, tags, and relevance
2. **Memory Tagging**: Add tags to memories for better organization
3. **Memory Prioritization**: Prioritize memories based on relevance to both query and context
4. **Memory Analytics**: Get insights about stored memories

## Command Reference

### Basic Commands

| Command | Description |
|---------|-------------|
| `!memory_on` | Start recording the conversation |
| `!memory_off` | Stop recording and clear the buffer |
| `!rag` | Save the current buffer to the knowledge base |
| `!rag tag <tag1> <tag2> ...` | Save with tags |

### Enhanced Commands

| Command | Description |
|---------|-------------|
| `!memory_filter date <query> <start_date> <end_date>` | Filter memories by date range |
| `!memory_filter tags <query> <tag1> <tag2> ...` | Filter memories by tags |
| `!memory_analytics` | Get analytics about stored memories |
| `!memory_help` | Show help text for memory commands |

## Usage Examples

### Memory Recording and Saving

```
User: !memory_on
Assistant: Memory recording started. All conversations will be buffered until saved with !rag or discarded with !memory_off.

User: How do I implement memory in VANA?
Assistant: You can implement memory in VANA using the Ragie API...

User: !rag tag important documentation
Assistant: Memory saved successfully to knowledge base. Tagged with: important, documentation
```

### Memory Filtering

```
User: !memory_filter date "project planning" 2023-01-01 2023-12-31
Assistant: Memories for 'project planning' between 2023-01-01 and 2023-12-31

1. [2023-06-15T14:30:00Z] (Score: 0.89)
   Source: chat_history
   User: How should we plan the VANA project? Assistant: I recommend starting with a clear architecture document...

2. [2023-07-22T09:15:00Z] (Score: 0.78)
   Source: chat_history
   User: What's the timeline for the VANA project? Assistant: Based on our planning sessions...

User: !memory_filter tags "vector search" documentation important
Assistant: Memories for 'vector search' with tags: documentation, important

1. [2023-08-10T16:45:00Z] (Score: 0.92)
   Source: chat_history
   User: How do I set up Vector Search for VANA? Assistant: To set up Vector Search, you'll need to...
```

### Memory Analytics

```
User: !memory_analytics
Assistant: Memory Analytics

Total memories: 156

Memories by source:
- chat_history: 124
- daily_sync: 32

Memories by date (last 7 days):
- 2023-09-01: 12
- 2023-09-02: 8
- 2023-09-03: 15
- 2023-09-04: 10
- 2023-09-05: 7
- 2023-09-06: 9
- 2023-09-07: 5
```

## Implementation Details

### Memory Filtering

Memory filtering allows you to retrieve memories based on specific criteria:

- **Date Filtering**: Filter memories created within a specific date range
- **Tag Filtering**: Filter memories that have specific tags
- **Combined Filtering**: Apply multiple filters for more precise results

### Memory Tagging

Tags provide a way to categorize and organize memories:

- Tags are added at the time of memory creation
- Multiple tags can be applied to a single memory
- Tags can be used for filtering and organization

### Memory Prioritization

The prioritization algorithm considers:

1. Relevance to the query
2. Relevance to the context
3. Recency of the memory
4. Importance (based on tags)

### Memory Analytics

Analytics provide insights about:

- Total number of memories
- Distribution by source
- Distribution by date
- Most common tags
- Usage patterns

## Integration with n8n

The enhanced memory operations are integrated with n8n workflows:

1. **Manual Memory Save Workflow**: Handles the `!rag` command with tag support
2. **Daily Memory Sync Workflow**: Automatically syncs recent conversations

## Error Handling

The enhanced memory operations include robust error handling:

- Network errors are gracefully handled
- API errors are reported with clear messages
- Missing credentials are detected and reported
- Invalid commands receive helpful error messages

## Future Enhancements

Planned enhancements for the memory system:

1. **Memory Summarization**: Automatically summarize large memory sets
2. **Memory Visualization**: Visual representation of memory connections
3. **Memory Pruning**: Automatically remove redundant or outdated memories
4. **Cross-Agent Memory Sharing**: Share memories between different agents
