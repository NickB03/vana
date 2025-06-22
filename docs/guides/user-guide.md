# 👤 User Guide

Welcome to VANA! This comprehensive guide will help you understand and effectively use the VANA multi-agent AI system for your tasks.

## 🎯 What is VANA?

VANA is an advanced multi-agent AI system featuring **7 discoverable agents** (3 real + 4 proxy) that can help you with:
- **Task Coordination** - Central coordination using 19 core tools + conditional tools
- **Code Execution** - Secure multi-language code execution (Python, JavaScript, Shell)
- **Data Science** - Data analysis, visualization, cleaning, and machine learning
- **File Operations** - Reading, writing, and managing files securely
- **Search Capabilities** - Vector search, web search, and knowledge base queries
- **System Monitoring** - Health checks and system status monitoring
- **Workflow Management** - Multi-step task coordination and execution

### 📊 Current System Status (Verified 2025-06-15)
- **Discoverable Agents**: 7 (3 real + 4 proxy using simplified architecture)
- **Core Tools**: 19 always available + conditional tools when dependencies available
- **Real Agents**: VANA Orchestrator, Code Execution Specialist, Data Science Specialist
- **Proxy Agents**: Memory, Orchestration, Specialists, Workflows (all delegate to VANA)
- **Infrastructure**: Google Cloud Run with excellent performance and auto-scaling
- **Architecture**: Simplified multi-agent with proxy pattern (not complex orchestration)

## 🚀 Getting Started

### Accessing VANA

**Production Service**: [https://vana-prod-960076421399.us-central1.run.app](https://vana-prod-960076421399.us-central1.run.app)

**Local Development**: http://localhost:8080 (after running `python main.py`)

### First Steps

1. **Open the web interface** in your browser
2. **Start with a simple request** to get familiar with the system
3. **Explore different capabilities** using the examples below
4. **Check the health dashboard** to monitor system status

## 💬 How to Interact with VANA

### Basic Interaction Pattern

VANA uses natural language processing, so you can communicate in plain English:

```
"Generate a Python function to calculate fibonacci numbers"
"Search for the latest AI research papers"
"What's the current system health status?"
"Read the contents of README.md file"
"Analyze this dataset and create visualizations"
```

### Request Structure

For best results, structure your requests with:
- **Clear objective** - What you want to accomplish
- **Specific details** - Any constraints or preferences
- **Context** - Background information if relevant

**Good Example:**
```
"I need to analyze a CSV dataset with sales data.
Please clean the data, perform statistical analysis,
and create visualizations showing trends by month and region."
```

**Less Effective:**
```
"Analyze data"
```

## 🎯 Core Capabilities

### 1. File Operations & Data Management

VANA provides secure file operations using its core tools:

#### File Reading & Writing
```
"Read the contents of config.json and explain the configuration"
"Write this data to a new CSV file called sales_report.csv"
"Check if the file backup.sql exists in the current directory"
```

#### Directory Management
```
"List all Python files in the src/ directory"
"Show me the directory structure of this project"
"Find all files modified in the last week"
```

#### Data Processing
```
"Read this CSV file and show me the first 10 rows"
"Convert this JSON data to a formatted table"
"Extract specific columns from this dataset"
```

### 2. Code Execution & Development

VANA provides secure code execution and development assistance:

#### Multi-Language Code Execution
```
"Execute this Python code: print('Hello, World!')"
"Run this JavaScript function and show the output"
"Execute this shell command: ls -la"
```

#### Code Analysis & Debugging
```
"Execute this Python function and explain what it does: [paste code]"
"Run this code and help me debug any errors"
"Test this algorithm with sample data and show the results"
```

#### Development Assistance
```
"Create a Python function to calculate fibonacci numbers"
"Generate a simple REST API endpoint example"
"Write a function to parse CSV data"
```

#### Secure Execution Environment
```
"Execute this data processing script safely"
"Run this analysis code with resource monitoring"
"Test this function with different input parameters"
```

### 3. Search & Information Retrieval

VANA provides powerful search capabilities using its core tools:

#### Vector Search (Semantic)
```
"Search for information about machine learning algorithms"
"Find documents related to data science best practices"
"Look for content about system architecture patterns"
```

#### Web Search (Real-Time with Intelligent Processing)
```
"What time is it in Tokyo right now?"
"What's the weather in London today?"
"Search the web for latest trends in artificial intelligence"
"Find current information about Python programming best practices"
"What are the recent developments in cloud computing?"
```

**Features:**
- **Real-Time Data**: Current time, weather, and live information
- **Intelligent Processing**: Automatic data extraction and formatting
- **Clear Responses**: "The current time in Tokyo is 04:24 AM" instead of raw search results

#### Knowledge Base Search
```
"Search the VANA knowledge base for agent coordination patterns"
"Find information about tool integration in the system"
"Look up documentation about security features"
```

### 4. Data Science & Analytics

VANA provides comprehensive data science capabilities:

#### Data Analysis
```
"Analyze this dataset and show descriptive statistics"
"Create visualizations for this sales data"
"Identify patterns and trends in this time series data"
```

#### Machine Learning
```
"Build a simple regression model for this dataset"
"Perform clustering analysis on customer data"
"Create a classification model and evaluate its performance"
```

#### Statistical Computing
```
"Calculate correlation coefficients for these variables"
"Perform hypothesis testing on this sample data"
"Generate statistical summaries and insights"
```

## 🛠️ Advanced Features

### Multi-Agent Coordination

VANA automatically coordinates between its real agents for complex tasks:

```
"Analyze this dataset, clean the data, create visualizations,
and generate a comprehensive report with statistical insights"
```

This request will involve:
- **VANA Orchestrator** - Coordinating the overall workflow using core tools
- **Data Science Agent** - Performing data analysis and statistical computations
- **Code Execution Agent** - Running data processing and visualization code
- **File Operations** - Reading input data and writing results using adk_read_file/adk_write_file
- **Coordination Tools** - Using adk_coordinate_task and adk_delegate_to_agent

### Long-Running Tasks

For complex operations, VANA supports asynchronous processing:

```
"Process this large dataset and generate a comprehensive analysis report"
"Create a detailed competitive analysis of the AI industry"
"Generate documentation for our entire codebase"
```

You'll receive:
- **Task ID** - To track progress
- **Status Updates** - Regular progress reports
- **Final Results** - Complete deliverables when finished

### Human-in-the-Loop Workflows

VANA can request approval for important decisions:

```
"Plan a vacation to Europe, but ask for my approval before booking anything"
"Generate code for a payment system, but let me review before implementation"
"Research investment opportunities and present options for my decision"
```

## 📊 Monitoring & Status

### System Health Dashboard

Access the health dashboard at `/health` to monitor:
- **Agent Status** - Health of all agents
- **Tool Performance** - Success rates and response times
- **Resource Usage** - Memory, CPU, and API quotas
- **Recent Activity** - Latest tasks and their outcomes

### Task Tracking

Monitor your requests:
- **Active Tasks** - Currently running operations
- **Completed Tasks** - Finished requests with results
- **Failed Tasks** - Issues and error messages
- **Performance Metrics** - Response times and success rates

## 🎯 Best Practices

### Writing Effective Requests

1. **Be Specific** - Include relevant details and constraints
2. **Provide Context** - Background information helps VANA understand your needs
3. **Set Expectations** - Mention deadlines or quality requirements
4. **Break Down Complex Tasks** - Split large requests into smaller parts

### Optimizing Performance

1. **Use Caching** - Similar requests benefit from cached results
2. **Batch Related Tasks** - Group similar operations together
3. **Monitor Resources** - Check system status for optimal timing
4. **Provide Feedback** - Help VANA learn from your preferences

### Security Considerations

1. **Protect Sensitive Data** - Don't share passwords or personal information
2. **Review Generated Code** - Always review code before implementation
3. **Verify Information** - Cross-check important research findings
4. **Use Secure Channels** - Access VANA through HTTPS connections

## 🚨 Troubleshooting

### Common Issues

#### Slow Response Times
- Check system health dashboard
- Try breaking down complex requests
- Monitor resource usage

#### Unexpected Results
- Provide more specific instructions
- Include additional context
- Try rephrasing your request

#### Task Failures
- Check error messages in the dashboard
- Verify input data format
- Retry with simplified parameters

### Getting Help

1. **Check Documentation** - Review relevant guides and references
2. **Monitor Logs** - Look for error messages and warnings
3. **Contact Support** - Create an issue on GitHub
4. **Community Resources** - Check discussions and forums

## 🏗️ VANA Architecture Overview

VANA is built as a multi-agent AI system using Google's Agent Development Kit (ADK). Here's how the system is organized:

### 📁 Core Components

#### **Agents** - Specialized AI Agents
- **VANA Root Agent** - Main orchestrator and coordinator
- **Specialist Agents** - Domain-specific expertise (code, data science, workflows)
- **Sub-Agents** - Focused task execution

#### **Tools** - Extensible Functionality
- **File Operations** - Read, write, and manage files
- **Search Capabilities** - Web search, knowledge base, vector search
- **Agent Coordination** - Multi-agent workflow management
- **System Integration** - Health monitoring, task management

#### **Deployment** - Cloud-Native Architecture
- **Google Cloud Run** - Scalable container deployment
- **FastAPI** - High-performance API framework
- **ADK Integration** - Google's agent development platform

### 🎯 Key Features

**Multi-Agent Coordination:**
- Agents can delegate tasks to specialized sub-agents
- Intelligent task routing based on capabilities
- Shared state management across agent interactions

**Extensible Tool System:**
- 50+ built-in tools for common operations
- Easy integration of new tools and capabilities
- ADK-compatible tool framework

**Production Ready:**
- Comprehensive testing framework (90%+ success rate)
- Cloud deployment with monitoring
- Security and performance optimizations

---

## 📚 Examples by Use Case

### Business Professional
```
"Prepare for my quarterly board meeting by researching industry trends,
analyzing our competitor's recent moves, and creating a presentation
outline with key talking points"
```

### Software Developer
```
"Help me build a microservice for user authentication including
API endpoints, database schema, unit tests, and deployment configuration"
```

### Researcher
```
"Conduct a literature review on quantum computing applications in
cryptography, summarize key findings, and identify research gaps"
```

### Data Scientist
```
"Analyze this dataset for patterns, create visualizations, and build
a predictive model with performance metrics and recommendations"
```

## 🎉 Success Tips

1. **Start Simple** - Begin with basic requests to understand capabilities
2. **Iterate and Refine** - Build on previous results for better outcomes
3. **Explore Features** - Try different types of requests to discover capabilities
4. **Provide Feedback** - Help VANA improve by sharing your experience
5. **Stay Updated** - Check for new features and improvements

---

**Ready to get started?** Try your first request and discover the power of VANA's multi-agent AI system!

**Need more help?** Check out our [API Reference](api-reference.md) or [Developer Guide](developer-guide.md) for technical details.
