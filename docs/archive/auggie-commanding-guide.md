# Auggie Commanding Guide

## Introduction

This guide provides comprehensive instructions for effectively commanding Auggie, the AI coding agent from Augment Code. Understanding how to properly interact with Auggie will maximize your development productivity and help you achieve better results when implementing Vana's components.

## Understanding Auggie

Auggie is an advanced AI coding agent designed to deeply understand codebases and automate complex software development tasks. Unlike simpler code assistants, Auggie:

- Maintains persistent memory across sessions
- Autonomously executes multi-step tasks
- Accesses external tools and services via MCP
- Understands project context holistically
- Implements complete features spanning multiple files

## Core Interaction Modes

### Agent Mode vs. Chat Mode

Auggie operates in two primary modes:

1. **Agent Mode (Auto)**: Auggie works autonomously, making file changes and executing commands with minimal supervision. Best for complex tasks spanning multiple files.

2. **Agent Mode (Non-Auto)**: Auggie suggests changes but waits for your approval before executing them. Best when you want more control over implementation.

3. **Chat Mode**: Conversational assistant that answers questions and provides guidance but doesn't directly modify code. Best for exploration and learning.

## Effective Commanding Techniques

### Breaking Down Complex Tasks

Instead of asking for everything at once, break tasks into manageable steps:

**❌ Ineffective:**
"Implement a knowledge graph database with vector search, Vertex AI integration, and a REST API."

**✅ Effective:**
1. "Let's implement a knowledge graph storage system."
2. "Now let's create the vector search integration." 
3. "Let's connect this to Vertex AI."
4. "Finally, expose these capabilities through a REST API."

### Providing Context and Examples

Always include relevant context and examples:

**❌ Ineffective:**
"Implement tests for the hybrid_search class."

**✅ Effective:**
"Implement tests for the hybrid_search class in tools/hybrid_search.py. Reference the pattern used in test_vector_search.py for consistency."

### Specifying Implementation Details

Be explicit about implementation details, patterns, and conventions:

**❌ Ineffective:**
"Add a web search integration."

**✅ Effective:**
"Add a web search integration using the Google Custom Search API. Follow our tool pattern with proper error handling and logging. Store the API key in environment variables following our security conventions."

### Using Checkpoints Effectively

Leverage Auggie's checkpoint system to manage complex changes:

1. Instruct Auggie to create explicit checkpoints at logical steps
2. Review changes at each checkpoint 
3. If necessary, revert to a specific checkpoint and redirect

Example: "Create a checkpoint after setting up the basic structure, before implementing the API methods."

### MCP Tool Integration

When working with Model Context Protocol (MCP) tools:

1. Explicitly mention which MCP tools to use
2. Provide authentication details if needed
3. Specify expected inputs/outputs

Example: "Use the Knowledge Graph MCP tool to store the entity relationships. The MCP server is already configured in our environment."

## Command Patterns for Common Tasks

### Implementing New Features

```
Implement [feature name] with the following requirements:
1. [Requirement 1]
2. [Requirement 2]
...

Use these existing components:
- [Component 1] in [location]
- [Component 2] in [location]
...

Follow these design patterns:
- [Pattern 1]
- [Pattern 2]
...

Create appropriate tests following our test conventions.
```

### Code Refactoring

```
Refactor [component] to:
1. [Goal 1]
2. [Goal 2]
...

Make sure to:
- Maintain existing functionality
- Update all relevant tests
- Update documentation
```

### Debugging Issues

```
Debug the issue in [component]:
1. Error message/behavior: [description]
2. Expected behavior: [description]
3. Relevant files: [file list]

Use logs and tests to identify the root cause.
```

### Documentation Generation

```
Generate documentation for [component] that includes:
1. Overview and purpose
2. API reference
3. Usage examples
4. Integration notes

Follow our Markdown documentation format in docs/
```

## Memory Management

Auggie maintains "Augment Memories" that persist across sessions. You can influence these:

1. **Explicit Memory Commands**: "Remember to always use camelCase for variable names in JavaScript files."

2. **Correction-Based Learning**: "You're using snake_case here, but our convention is camelCase. Please fix this and remember for future code."

3. **Memory Review**: Occasionally ask "What preferences and patterns have you remembered about our project?" to verify Auggie's understanding.

## Working with Vana-Specific Components

For our Vana project, use these specific command patterns:

### Knowledge Graph Operations

```
Implement the Knowledge Graph [operation] with:
1. Entity support for [entity types]
2. Relation mapping for [relation types]
3. Integration with MCP server at [endpoint]
4. Proper error handling and logging
```

### Vector Search Implementation

```
Enhance the Vector Search implementation to:
1. Use Vertex AI embedding model [model name]
2. Optimize chunk size to [size] tokens with [overlap] token overlap
3. Include metadata for [metadata fields]
4. Implement caching for frequent queries
```

### Hybrid Search Operations

```
Update the Hybrid Search to:
1. Balance results from Knowledge Graph and Vector Search with [weighting strategy]
2. Optimize result ranking using [algorithm]
3. Add filtering capability for [filter types]
4. Improve response formatting for [use case]
```

## Best Practices

1. **Start Small**: Begin with simpler tasks to build Auggie's understanding of your codebase.

2. **Be Explicit**: Clearly state file paths, dependencies, and expected outcomes.

3. **Provide Feedback**: Tell Auggie when it does something particularly well or poorly.

4. **Use Checkpoints**: For complex tasks, instruct Auggie to create regular checkpoints.

5. **Review Changes**: Always review code changes before final acceptance.

6. **Set Constraints**: Specify performance, security, or compatibility requirements upfront.

7. **Share Knowledge**: If Auggie seems unaware of a project convention, explicitly share it.

## Troubleshooting

### When Auggie Produces Incorrect Code

1. Identify the specific issue
2. Explain the problem clearly
3. Provide the correct pattern
4. Ask Auggie to fix and remember the correct approach

Example: "The error handling here doesn't follow our pattern. We use a centralized error handler from utils/error.js rather than inline try/catch blocks. Please refactor this and remember our error handling convention."

### When Auggie Misunderstands Requirements

1. Clarify the misunderstood requirement
2. Provide additional context or examples
3. Ask for confirmation of understanding
4. Request a revised implementation

Example: "You've implemented this as a synchronous function, but we need it to be async to handle external API calls. Please revise the implementation to use async/await pattern."

### When Auggie Gets Stuck in a Loop

1. Stop the current execution
2. Analyze why it's looping
3. Provide clearer success criteria
4. Break the task into smaller steps

## Conclusion

Effective communication with Auggie requires clarity, context, and structured commands. By following the patterns in this guide, you'll achieve better results and maximize productivity when working on the Vana project. Remember that Auggie learns from your interactions, so consistent communication will improve results over time.
