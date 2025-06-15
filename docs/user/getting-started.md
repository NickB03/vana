# Getting Started with VANA

## What is VANA?
VANA is a sophisticated multi-agent AI system that helps you accomplish complex tasks through intelligent agent coordination and specialized tool execution. Think of it as having a team of AI specialists at your disposal, each expert in their domain.

### Key Capabilities
- **Code Execution**: Run and analyze code in multiple languages (Python, JavaScript, Shell)
- **Data Science**: Advanced data analysis, visualization, and machine learning
- **Information Retrieval**: Intelligent search across knowledge bases and the web
- **Task Coordination**: Complex workflow management and multi-step task execution
- **Memory Management**: Persistent context and knowledge storage across sessions

## Quick Start Guide

### 1. Access the VANA Interface
Navigate to your VANA deployment URL:
- **Development**: `https://vana-dev-960076421399.us-central1.run.app`
- **Production**: `https://vana-prod-960076421399.us-central1.run.app`

### 2. Understanding the Interface
The VANA interface consists of:
- **Agent Selector**: Choose which agent to interact with
- **Message Input**: Type your requests in natural language
- **Response Area**: View agent responses and tool execution results
- **Tool Indicators**: Visual feedback showing which tools are being used

### 3. Select an Agent
VANA features **7 discoverable agents** using a simplified multi-agent architecture with proxy pattern:

#### Real Agents (3)
| Agent | Type | Best For | Example Use Cases |
|-------|------|----------|-------------------|
| **VANA Orchestrator** | Real | Central coordination, task routing, 19 core tools | "Help me analyze data and create a report" |
| **Code Execution** | Real | Secure multi-language code execution (Python, JS, Shell) | "Execute this Python script safely in sandbox" |
| **Data Science** | Real | Data analysis, visualization, machine learning | "Analyze this dataset and create visualizations" |

#### Proxy Agents (4) - Discovery Pattern
| Agent | Type | Behavior | Purpose |
|-------|------|----------|---------|
| **Memory** | Proxy→VANA | All requests automatically delegate to VANA | Agent discovery compatibility |
| **Orchestration** | Proxy→VANA | All requests automatically delegate to VANA | Agent discovery compatibility |
| **Specialists** | Proxy→VANA | All requests automatically delegate to VANA | Agent discovery compatibility |
| **Workflows** | Proxy→VANA | All requests automatically delegate to VANA | Agent discovery compatibility |

> **💡 How Proxy Agents Work**: The 4 proxy agents appear as discoverable agents for compatibility, but all requests are automatically redirected to the VANA orchestrator. Users can interact with any agent normally - the system handles delegation transparently.

### 4. Start with Simple Requests
Begin with straightforward requests to understand how VANA works:

**Example 1: Basic Echo Test**
```
Message: "Hello VANA, can you echo this message back to me?"
Expected Response: VANA will use the echo tool and return your message
```

**Example 2: Information Retrieval**
```
Message: "What are VANA's capabilities and how many agents are available?"
Expected Response: VANA will search its knowledge base and provide detailed information
```

**Example 3: Code Execution**
```
Message: "Execute this Python code: print('Hello, World!')"
Expected Response: VANA will delegate to the Code Execution agent and show the output
```

## Basic Usage Examples

### Code Execution and Analysis
VANA can execute code in multiple languages and provide detailed analysis:

**Python Example:**
```
User: "Execute this Python code and explain what it does:
import pandas as pd
import numpy as np

data = {'A': [1, 2, 3, 4, 5], 'B': [10, 20, 30, 40, 50]}
df = pd.DataFrame(data)
print(df.describe())
"

VANA Response: 
- Executes the code in a secure sandbox
- Shows the statistical summary output
- Explains that the code creates a DataFrame and generates descriptive statistics
- Provides insights about the data distribution
```

**JavaScript Example:**
```
User: "Run this JavaScript code:
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);
console.log('Sum:', sum);
"

VANA Response:
- Executes the code in Node.js environment
- Shows output: "Sum: 15"
- Explains the reduce function and array summation
```

### Data Science and Visualization
VANA can perform complex data analysis and create visualizations:

**Data Analysis Example:**
```
User: "I have a CSV file with sales data. Can you analyze it and create visualizations?"

VANA Response:
1. Analyzes the uploaded data structure
2. Generates descriptive statistics
3. Creates appropriate visualizations (histograms, scatter plots, etc.)
4. Provides insights about trends and patterns
5. Suggests further analysis opportunities
```

**Machine Learning Example:**
```
User: "Build a simple linear regression model for this dataset"

VANA Response:
1. Preprocesses the data (handles missing values, outliers)
2. Splits data into training and testing sets
3. Trains a linear regression model
4. Evaluates model performance with metrics
5. Creates visualization of predictions vs actual values
6. Provides model interpretation and recommendations
```

### Information Search and Retrieval
VANA implements a memory-first hierarchy for intelligent information retrieval:

**Knowledge Base Search:**
```
User: "What is the agent-as-tool pattern in VANA?"

VANA Response:
- Searches session memory first
- Checks VANA knowledge base
- Provides detailed explanation of the pattern
- Includes code examples and use cases
```

**Web Search (when needed):**
```
User: "What's the current weather in San Francisco?"

VANA Response:
- Recognizes this requires external information
- Uses web search capabilities
- Provides current weather information
- Cites sources for the information
```

## Advanced Features

### Agent-as-Tool Pattern
VANA can automatically delegate tasks to specialist agents:

```
User: "Analyze this data and then execute code to visualize it"

Workflow:
1. VANA receives the request
2. Delegates data analysis to Data Science agent
3. Data Science agent analyzes the data
4. VANA delegates visualization to Code Execution agent
5. Code Execution agent creates and runs visualization code
6. VANA consolidates results and presents final response
```

### Memory Integration
VANA remembers context across conversations:

**Session Memory:**
- Maintains conversation context
- Remembers previous requests and responses
- Builds on earlier interactions

**Knowledge Base:**
- Stores structured information about VANA system
- Provides consistent answers about capabilities
- Maintains system documentation and examples

**Vector Search:**
- Semantic search across large knowledge corpora
- Finds relevant information based on meaning, not just keywords
- Integrates with Google's RAG (Retrieval Augmented Generation) system

### Multi-Step Workflows
VANA can handle complex, multi-step tasks using its 19 core tools and specialist agents:

```
User: "I need to process a dataset, clean it, analyze it, create visualizations, and generate a report"

VANA Workflow:
1. VANA uses adk_read_file to access the dataset
2. VANA delegates to Data Science agent for cleaning and analysis
3. VANA delegates to Code Execution agent for visualization creation
4. VANA coordinates the workflow using adk_coordinate_task
5. VANA uses adk_write_file to save results
6. VANA generates comprehensive report combining all results
```

## Security Features

### Sandbox Execution
All code execution happens in secure, isolated environments:
- **Container Isolation**: Each execution runs in a separate Docker container
- **Resource Limits**: Memory, CPU, and time constraints prevent abuse
- **Network Restrictions**: Limited network access for security
- **Input Validation**: All code is validated before execution

### Access Control
VANA implements comprehensive security measures:
- **Authentication**: Secure access control for API endpoints
- **Authorization**: Role-based permissions for different operations
- **Audit Logging**: Complete audit trail of all system operations
- **Rate Limiting**: Protection against abuse and overuse

## Best Practices

### Effective Communication
- **Be Specific**: Provide clear, detailed requests for better results
- **Use Context**: Reference previous conversations when relevant
- **Ask Follow-ups**: Don't hesitate to ask for clarification or additional information

### Task Organization
- **Break Down Complex Tasks**: Large tasks work better when broken into steps
- **Use Appropriate Agents**: Select the right agent for your specific needs
- **Leverage Memory**: Build on previous work and stored information

### Error Handling
- **Review Error Messages**: VANA provides detailed error information
- **Try Alternative Approaches**: If one method fails, try a different approach
- **Report Issues**: Help improve the system by reporting persistent problems

## Common Use Cases

### Software Development
- Code review and analysis
- Debugging assistance
- Performance optimization
- Documentation generation

### Data Analysis
- Exploratory data analysis
- Statistical modeling
- Data visualization
- Report generation

### Research and Learning
- Information gathering
- Concept explanation
- Example generation
- Best practice recommendations

### Automation
- Workflow coordination
- Task scheduling
- Process optimization
- System monitoring

## Getting Help

### Built-in Help
Ask VANA directly for help:
```
"How do I use the data science agent?"
"What tools are available for code execution?"
"Can you explain the memory hierarchy?"
```

### Documentation
- **API Reference**: Detailed API documentation for developers
- **Architecture Guide**: System design and component overview
- **Deployment Guide**: Setup and configuration instructions
- **Troubleshooting**: Common issues and solutions

### Support Channels
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Comprehensive guides and examples
- **Community**: Connect with other VANA users

## Next Steps

### Explore Advanced Features
1. **Try Complex Workflows**: Experiment with multi-step tasks
2. **Use Multiple Agents**: See how agents work together
3. **Leverage Memory**: Build persistent knowledge bases
4. **Integrate APIs**: Connect VANA with external services

### Contribute to VANA
1. **Report Issues**: Help improve the system
2. **Suggest Features**: Share ideas for enhancements
3. **Contribute Code**: Participate in development
4. **Share Examples**: Help others learn from your use cases

### Learn More
- Read the architecture documentation to understand how VANA works
- Explore the API reference for programmatic access
- Check out the deployment guide for setting up your own instance
- Review the troubleshooting guide for common issues

Welcome to VANA! Start with simple requests and gradually explore more complex capabilities as you become familiar with the system.
