# VANA Examples

Practical examples demonstrating VANA's multi-agent capabilities across various use cases.

## 🚀 Quick Start Examples

### Basic Interactions

#### Time and System Information
```bash
# Get current time
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "What time is it?"}'

# System health check
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "Check system health and performance"}'
```

#### Simple Calculations
```bash
# Mathematical operations
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "Calculate the factorial of 10"}'

# Data analysis
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the average of these numbers: 15, 23, 42, 8, 31"}'
```

---

## 📁 File Operations

### File Management
```bash
# Create a file
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "Create a file called notes.txt with my daily tasks list"}'

# Read file contents
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "Read the contents of the notes.txt file"}'

# List directory contents
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "List all files in the current directory"}'
```

### Document Processing
```bash
# Create a structured document
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Create a meeting agenda document with the following items: 
    1. Project status review
    2. Budget discussion
    3. Next quarter planning
    4. Action items assignment"
  }'

# Generate a report
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Create a quarterly report template with sections for:
    - Executive summary
    - Key metrics
    - Achievements
    - Challenges
    - Future plans"
  }'
```

---

## 💻 Code Generation and Execution

### Python Scripts
```bash
# Generate a data processing script
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Write a Python script that reads a CSV file, calculates basic statistics (mean, median, mode), and saves the results to a new file"
  }'

# Create a web scraper
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Create a Python script that scrapes product information from an e-commerce website and saves it to a JSON file"
  }'
```

### Algorithm Implementation
```bash
# Sorting algorithms
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Implement a quicksort algorithm in Python with comments explaining each step"
  }'

# Data structures
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Create a binary search tree implementation with insert, search, and delete operations"
  }'
```

---

## 📊 Data Analysis and Visualization

### Statistical Analysis
```bash
# Analyze dataset
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Analyze the sales data in the file sales_2024.csv and provide insights on trends, seasonal patterns, and top-performing products"
  }'

# Generate visualizations
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Create bar charts and line graphs showing monthly sales trends from the provided data"
  }'
```

### Machine Learning
```bash
# Predictive modeling
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Build a machine learning model to predict customer churn based on the customer data in the database"
  }'

# Data preprocessing
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Clean and preprocess the dataset by handling missing values, removing outliers, and normalizing numerical features"
  }'
```

---

## 🌐 Web Research and Information Gathering

### Research Tasks
```bash
# Market research
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Research the latest trends in artificial intelligence and provide a summary of key developments in 2024"
  }'

# Competitive analysis
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Find information about the top 5 project management tools, compare their features, pricing, and user reviews"
  }'
```

### Technical Documentation
```bash
# API documentation research
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Find the latest documentation for the OpenAI API and summarize the key endpoints and parameters"
  }'

# Technology comparison
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Compare React, Vue.js, and Angular frameworks in terms of performance, learning curve, and ecosystem"
  }'
```

---

## 🔄 Complex Workflows

### Multi-Step Automation
```bash
# Complete data pipeline
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Create a complete data processing pipeline that:
    1. Downloads data from an API
    2. Cleans and validates the data
    3. Performs statistical analysis
    4. Generates visualizations
    5. Creates a summary report
    6. Saves all outputs to organized folders"
  }'
```

### Project Setup
```bash
# Full project initialization
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Set up a complete Python web application project with:
    - Flask backend with authentication
    - SQLite database setup
    - API endpoints for CRUD operations
    - Frontend templates
    - Configuration files
    - Documentation
    - Testing framework"
  }'
```

---

## 🎯 Domain-Specific Examples

### Financial Analysis
```bash
# Portfolio analysis
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Analyze a stock portfolio and calculate risk metrics, return on investment, and provide diversification recommendations"
  }'

# Budget planning
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Create a personal budget planner that categorizes expenses, tracks spending patterns, and suggests cost-saving opportunities"
  }'
```

### Healthcare Data
```bash
# Medical data analysis
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Analyze patient data to identify patterns in treatment outcomes and suggest areas for improvement in care delivery"
  }'
```

### E-commerce
```bash
# Inventory management
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Create an inventory management system that tracks stock levels, predicts demand, and generates reorder alerts"
  }'

# Customer analytics
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Analyze customer behavior data to identify purchase patterns, segment customers, and recommend personalization strategies"
  }'
```

---

## 🛠️ Development and DevOps

### Code Quality
```bash
# Code review automation
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Review the Python code in the src/ directory and provide suggestions for improving code quality, performance, and security"
  }'

# Testing automation
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Generate comprehensive unit tests for the functions in the utils.py module"
  }'
```

### Infrastructure
```bash
# Deployment scripts
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Create Docker deployment configuration for a Flask application with PostgreSQL database and Redis cache"
  }'

# Monitoring setup
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Set up application monitoring with health checks, performance metrics, and alert configurations"
  }'
```

---

## 📚 Educational Examples

### Learning Materials
```bash
# Tutorial creation
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Create a beginner-friendly tutorial on machine learning concepts with practical Python examples"
  }'

# Code explanation
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Explain how the following algorithm works step by step: [provide algorithm code]"
  }'
```

---

## 🧪 Advanced Use Cases

### AI and Machine Learning
```bash
# Model comparison
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Compare different machine learning algorithms for predicting house prices and recommend the best approach"
  }'

# Natural language processing
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Create a sentiment analysis system that processes customer reviews and categorizes them as positive, negative, or neutral"
  }'
```

### Automation and Integration
```bash
# API integration
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Create a system that integrates with multiple APIs to aggregate data from different sources and provide unified reporting"
  }'

# Workflow automation
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Automate the process of collecting daily sales reports, analyzing performance metrics, and sending summary emails to stakeholders"
  }'
```

---

## 💡 Tips for Effective Usage

### Writing Better Requests
1. **Be Specific**: Provide clear, detailed descriptions
2. **Include Context**: Mention relevant files, data, or constraints
3. **Specify Output**: Describe the desired format or structure
4. **Break Down Complex Tasks**: Split large tasks into manageable steps

### Best Practices
1. **Start Simple**: Begin with basic tasks and gradually increase complexity
2. **Iterate**: Refine requests based on initial results
3. **Combine Capabilities**: Leverage multiple agents for comprehensive solutions
4. **Validate Results**: Always review and test generated code or analysis

### Error Handling
1. **Check Responses**: Verify that tasks completed successfully
2. **Provide Feedback**: Report issues or unexpected results
3. **Retry with Clarification**: Rephrase requests if results aren't as expected

---

## 🔗 Integration Examples

### Python Client Integration
```python
import requests
import json

class VANAClient:
    def __init__(self, base_url="http://localhost:8081"):
        self.base_url = base_url
    
    def execute_task(self, task_description):
        """Execute a task through VANA."""
        try:
            response = requests.post(
                f"{self.base_url}/run",
                json={"input": task_description},
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": f"Request failed: {e}"}

# Usage example
client = VANAClient()

# Data analysis task
result = client.execute_task(
    "Analyze the sales data and create a monthly trend report"
)
print(json.dumps(result, indent=2))

# Code generation task
result = client.execute_task(
    "Write a Python function to calculate compound interest"
)
print(result["result"]["output"])
```

---

*These examples demonstrate VANA's versatility across different domains and use cases. Start with simple examples and gradually explore more complex scenarios as you become familiar with the system.*