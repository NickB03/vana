# Google Agent Development Kit (ADK) Bootstrap Guide

**Version:** 2.0.0  
**Date:** 2025-08-11  
**Purpose:** Comprehensive production-grade knowledge bootstrap for Google ADK development

---

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Core Concepts](#core-concepts)
4. [Agent Types & Patterns](#agent-types--patterns)
5. [Tools & Functions](#tools--functions)
6. [Workflow Implementation](#workflow-implementation)
7. [Communication Patterns](#communication-patterns)
8. [Callbacks & Hooks](#callbacks--hooks)
9. [Streaming & Real-time](#streaming--real-time)
10. [Error Handling & Resilience](#error-handling--resilience)
11. [Model Configuration](#model-configuration)
12. [Memory & Context Management](#memory--context-management)
13. [Rate Limiting & Throttling](#rate-limiting--throttling)
14. [Authentication & Security](#authentication--security)
15. [LiteLLM & Providers](#litellm--providers)
16. [LangChain Integration](#langchain-integration)
17. [Async Patterns](#async-patterns)
18. [Production Monitoring](#production-monitoring)
19. [Evaluation & Testing](#evaluation--testing)
20. [Deployment Strategies](#deployment-strategies)
21. [State Management](#state-management)
22. [Agent Communication Protocols](#agent-communication-protocols)
23. [Data Processing](#data-processing)
24. [Performance Tuning](#performance-tuning)
25. [Multi-tenancy](#multi-tenancy)
26. [Disaster Recovery](#disaster-recovery)
27. [Compliance & Governance](#compliance--governance)
28. [Best Practices](#best-practices)
29. [Resources & Links](#resources--links)

---

## Overview

The Google Agent Development Kit (ADK) is a Python framework for building production-ready AI agents. ADK provides:
- **Multi-agent orchestration** with hierarchical and workflow patterns
- **Tool integration** for extending agent capabilities
- **LLM flexibility** through LiteLLM support
- **Production deployment** via Google Cloud Run
- **Built-in evaluation** and testing frameworks
- **Streaming responses** with SSE/WebSocket support
- **Enterprise-grade security** and monitoring

### Key Components
- **LlmAgent**: Core agent class for LLM-powered agents
- **SequentialAgent**: Execute agents in order
- **ParallelAgent**: Execute agents concurrently
- **Tools**: Extend agent capabilities with functions
- **Callbacks**: Hook into agent lifecycle events
- **Streaming**: Real-time response streaming
- **Monitoring**: Production observability

---

## Quick Start

### Installation

#### Using Agent Starter Pack (Recommended)
```bash
# Install starter pack CLI
pip install agent-starter-pack

# Create new project with ADK Gemini Fullstack template
agent-starter-pack create my-project -a adk_gemini_fullstack -d cloud_run

# Navigate to project
cd my-project

# Set up environment
echo "GOOGLE_GENAI_USE_VERTEXAI=FALSE" > .env
echo "GOOGLE_GENAI_API_KEY=your-key-here" >> .env

# Install dependencies
pip install -r requirements.txt

# Run locally
adk web app/
```

#### Direct ADK Installation
```bash
# Install ADK
pip install google-adk

# Or with specific extras
pip install google-adk[litellm,langchain,streaming]
```

### Basic Agent Example
```python
from google.adk.agents import LlmAgent

# Create a simple agent
agent = LlmAgent(
    name="Assistant",
    model="gemini-2.0-flash",
    instruction="You are a helpful assistant."
)

# Run the agent
response = await agent.run("What is the capital of France?")
print(response)
```

---

## Core Concepts

### 1. Agent Hierarchy
Agents can have child agents for delegation:

```python
from google.adk.agents import LlmAgent

# Child agents
researcher = LlmAgent(
    name="Researcher",
    model="gemini-2.0-flash",
    description="Fetches information from sources",
    instruction="Research and summarize information."
)

writer = LlmAgent(
    name="Writer",
    model="gemini-2.0-flash",
    description="Creates well-structured content",
    instruction="Write clear, engaging content."
)

# Parent agent with children
coordinator = LlmAgent(
    name="Coordinator",
    model="gemini-2.0-flash",
    child_agents=[researcher, writer],
    instruction="Coordinate research and writing tasks."
)
```

### 2. Tools
Extend agents with custom functions:

```python
from google.adk.tools import FunctionTool

def search_web(query: str) -> str:
    """Search the web for information."""
    # Implementation here
    return f"Results for: {query}"

# Create tool
search_tool = FunctionTool(search_web)

# Agent with tools
agent = LlmAgent(
    name="SearchAgent",
    model="gemini-2.0-flash",
    tools=[search_tool],
    instruction="Use web search to answer questions."
)
```

### 3. Session State
Share state between agents:

```python
agent_a = LlmAgent(
    name="AgentA",
    model="gemini-2.0-flash",
    instruction="Calculate the sum of 5 + 3",
    output_mode="append"  # Append to session
)

agent_b = LlmAgent(
    name="AgentB",
    model="gemini-2.0-flash",
    instruction="Double the previous result",
    output_mode="replace"  # Replace session output
)
```

---

## Agent Types & Patterns

### SequentialAgent
Execute agents in order:

```python
from google.adk.agents import SequentialAgent, LlmAgent

step1 = LlmAgent(name="Step1_Fetch", model="gemini-2.0-flash")
step2 = LlmAgent(name="Step2_Process", model="gemini-2.0-flash")
step3 = LlmAgent(name="Step3_Format", model="gemini-2.0-flash")

sequential = SequentialAgent(
    name="Pipeline",
    child_agents=[step1, step2, step3]
)

result = await sequential.run("Process this data")
```

### ParallelAgent
Execute agents concurrently:

```python
from google.adk.agents import ParallelAgent, LlmAgent

analyzer1 = LlmAgent(name="Sentiment", model="gemini-2.0-flash")
analyzer2 = LlmAgent(name="Keywords", model="gemini-2.0-flash")
analyzer3 = LlmAgent(name="Summary", model="gemini-2.0-flash")

parallel = ParallelAgent(
    name="MultiAnalyzer",
    child_agents=[analyzer1, analyzer2, analyzer3]
)

results = await parallel.run("Analyze this text")
```

### Two-Phase Workflow (Human-in-the-Loop)
Implement plan-then-execute patterns:

```python
# Phase 1: Planning Agent
planner = LlmAgent(
    name="Planner",
    model="gemini-2.0-flash",
    instruction="Create a detailed plan for the task"
)

# Get plan and review
plan = await planner.run(user_request)
# Human reviews and approves plan

# Phase 2: Execution Agent
executor = LlmAgent(
    name="Executor",
    model="gemini-2.0-flash",
    tools=[...],
    child_agents=[...],
    instruction=f"Execute this plan: {plan}"
)

result = await executor.run(user_request)
```

---

## Tools & Functions

### Creating Custom Tools

```python
from google.adk.tools import FunctionTool
from typing import List, Dict

def analyze_data(data: List[Dict]) -> Dict:
    """Analyze dataset and return statistics."""
    return {
        "count": len(data),
        "summary": "Analysis complete"
    }

# Create tool with metadata
tool = FunctionTool(
    function=analyze_data,
    name="DataAnalyzer",
    description="Analyzes datasets"
)

# Use in agent
agent = LlmAgent(
    name="Analyst",
    model="gemini-2.0-flash",
    tools=[tool]
)
```

### Advanced Tool Patterns

#### Tool Composition
```python
class CompositeToolkit:
    """Compose multiple tools into a toolkit."""
    
    def __init__(self, tools: List[FunctionTool]):
        self.tools = tools
    
    def get_tool(self, name: str) -> FunctionTool:
        return next((t for t in self.tools if t.name == name), None)
    
    def chain_tools(self, *tool_names):
        """Chain tools together."""
        async def chained_execution(input_data):
            result = input_data
            for name in tool_names:
                tool = self.get_tool(name)
                result = await tool.execute(result)
            return result
        return FunctionTool(chained_execution, name="ChainedTools")
```

#### Dynamic Tool Generation
```python
def create_api_tool(endpoint: str, method: str = "GET"):
    """Dynamically create API tools."""
    async def api_call(**kwargs):
        async with httpx.AsyncClient() as client:
            response = await client.request(method, endpoint, **kwargs)
            return response.json()
    
    return FunctionTool(
        api_call,
        name=f"API_{endpoint.replace('/', '_')}",
        description=f"{method} request to {endpoint}"
    )
```

---

## Workflow Implementation

### Complex Multi-Agent System

```python
from google.adk.agents import LlmAgent, SequentialAgent, ParallelAgent
from google.adk.tools import FunctionTool

# Define specialized agents
data_fetcher = LlmAgent(
    name="DataFetcher",
    model="gemini-2.0-flash",
    tools=[fetch_tool],
    instruction="Fetch data from sources"
)

# Parallel analysis
sentiment_analyzer = LlmAgent(
    name="SentimentAnalyzer",
    model="gemini-2.0-flash",
    instruction="Analyze sentiment"
)

entity_extractor = LlmAgent(
    name="EntityExtractor",
    model="gemini-2.0-flash",
    instruction="Extract named entities"
)

parallel_analysis = ParallelAgent(
    name="AnalysisTeam",
    child_agents=[sentiment_analyzer, entity_extractor]
)

# Report generator
report_writer = LlmAgent(
    name="ReportWriter",
    model="gemini-2.0-flash",
    instruction="Generate comprehensive report"
)

# Main workflow
workflow = SequentialAgent(
    name="ResearchWorkflow",
    child_agents=[
        data_fetcher,
        parallel_analysis,
        report_writer
    ]
)

# Execute workflow
result = await workflow.run("Research topic: AI trends")
```

---

## Communication Patterns

### 1. Shared Session State
```python
# Agents communicate through session
agent_a = LlmAgent(
    name="Calculator",
    instruction="Calculate 10 * 5",
    output_mode="append"
)

agent_b = LlmAgent(
    name="Formatter",
    instruction="Format the previous result as currency",
    output_mode="replace"
)
```

### 2. Direct Message Passing
```python
# Pass results explicitly
result_a = await agent_a.run("Task A")
result_b = await agent_b.run(f"Process this: {result_a}")
```

### 3. Context Propagation
```python
# Use context for state
context = {"user_id": "123", "session": "abc"}

agent = LlmAgent(
    name="ContextAware",
    instruction="Use context: {context}"
)

result = await agent.run("Query", context=context)
```

---

## Callbacks & Hooks

### Lifecycle Callbacks

```python
from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext

class MonitoringCallback:
    async def before_agent_callback(self, context: CallbackContext):
        """Called before agent execution."""
        print(f"Starting: {context.agent.name}")
    
    async def after_agent_callback(self, context: CallbackContext):
        """Called after agent execution."""
        print(f"Completed: {context.agent.name}")
    
    async def before_tool_callback(self, context: CallbackContext):
        """Called before tool execution."""
        print(f"Tool call: {context.tool_name}")
    
    async def after_tool_callback(self, context: CallbackContext):
        """Called after tool execution."""
        print(f"Tool result: {context.tool_result}")

# Use callbacks
agent = LlmAgent(
    name="MonitoredAgent",
    model="gemini-2.0-flash",
    callbacks=[MonitoringCallback()]
)
```

### Common Callback Patterns

#### 1. Guardrails
```python
class SafetyCallback:
    async def before_llm_callback(self, context: CallbackContext):
        """Check input safety."""
        if contains_sensitive_data(context.prompt):
            raise ValueError("Sensitive data detected")
```

#### 2. Logging
```python
class LoggingCallback:
    async def after_llm_callback(self, context: CallbackContext):
        """Log LLM interactions."""
        logger.info(f"LLM Response: {context.response}")
```

#### 3. Metrics
```python
class MetricsCallback:
    async def after_agent_callback(self, context: CallbackContext):
        """Track performance metrics."""
        metrics.record(
            agent=context.agent.name,
            duration=context.duration,
            tokens=context.token_count
        )
```

---

## Streaming & Real-time

### Server-Sent Events (SSE) Implementation

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio

app = FastAPI()

async def generate_sse_stream(agent: LlmAgent, prompt: str):
    """Generate SSE stream from agent."""
    async for chunk in agent.stream(prompt):
        yield f"data: {json.dumps({'text': chunk})}\n\n"
        await asyncio.sleep(0.01)  # Small delay for client processing
    yield "data: [DONE]\n\n"

@app.post("/api/stream")
async def stream_response(request: dict):
    agent = LlmAgent(
        name="StreamingAgent",
        model="gemini-2.0-flash",
        streaming=True
    )
    
    return StreamingResponse(
        generate_sse_stream(agent, request["prompt"]),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )
```

### WebSocket Implementation

```python
from fastapi import WebSocket
import json

@app.websocket("/ws/agent")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    agent = LlmAgent(
        name="WebSocketAgent",
        model="gemini-2.0-flash",
        streaming=True
    )
    
    while True:
        data = await websocket.receive_text()
        request = json.loads(data)
        
        async for chunk in agent.stream(request["prompt"]):
            await websocket.send_json({
                "type": "chunk",
                "content": chunk
            })
        
        await websocket.send_json({"type": "complete"})
```

### Handling Partial Responses

```python
class StreamProcessor:
    """Process streaming responses."""
    
    def __init__(self):
        self.buffer = ""
        self.tokens = []
    
    async def process_stream(self, stream):
        """Process stream and handle partial tokens."""
        async for chunk in stream:
            self.buffer += chunk
            
            # Check for complete sentences
            if chunk.endswith(('.', '!', '?', '\n')):
                yield self.buffer
                self.buffer = ""
        
        # Yield remaining buffer
        if self.buffer:
            yield self.buffer
```

---

## Error Handling & Resilience

### Retry Mechanisms with Exponential Backoff

```python
import asyncio
from typing import TypeVar, Callable
import random

T = TypeVar('T')

class RetryPolicy:
    def __init__(
        self,
        max_retries: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True
    ):
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
    
    async def execute(
        self,
        func: Callable[..., T],
        *args,
        **kwargs
    ) -> T:
        """Execute function with retry policy."""
        last_exception = None
        
        for attempt in range(self.max_retries):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                
                if attempt < self.max_retries - 1:
                    delay = min(
                        self.initial_delay * (self.exponential_base ** attempt),
                        self.max_delay
                    )
                    
                    if self.jitter:
                        delay *= (0.5 + random.random())
                    
                    await asyncio.sleep(delay)
        
        raise last_exception

# Use with agent
retry_policy = RetryPolicy(max_retries=5)

agent = LlmAgent(
    name="ResilientAgent",
    model="gemini-2.0-flash"
)

result = await retry_policy.execute(agent.run, "Query")
```

### Circuit Breaker Pattern

```python
from enum import Enum
from datetime import datetime, timedelta

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
    
    async def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker."""
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
            else:
                raise Exception("Circuit breaker is OPEN")
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self) -> bool:
        return (
            self.last_failure_time and
            datetime.now() - self.last_failure_time > 
            timedelta(seconds=self.recovery_timeout)
        )
    
    def _on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED
    
    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
```

### Fallback Strategies

```python
class FallbackAgent:
    """Agent with fallback strategies."""
    
    def __init__(self, primary_model: str, fallback_models: List[str]):
        self.primary_model = primary_model
        self.fallback_models = fallback_models
    
    async def run(self, prompt: str) -> str:
        """Run with fallback models."""
        models = [self.primary_model] + self.fallback_models
        
        for model in models:
            try:
                agent = LlmAgent(
                    name="FallbackAgent",
                    model=model
                )
                return await agent.run(prompt)
            except Exception as e:
                if model == models[-1]:
                    # Last model, no more fallbacks
                    raise e
                # Try next model
                continue
```

---

## Model Configuration

### Temperature and Sampling Parameters

```python
agent = LlmAgent(
    name="ConfiguredAgent",
    model="gemini-2.0-flash",
    model_config={
        "temperature": 0.7,      # Creativity (0.0-2.0)
        "top_p": 0.9,           # Nucleus sampling
        "top_k": 40,            # Top-k sampling
        "max_tokens": 2048,     # Max response length
        "presence_penalty": 0.0, # Penalize repetition
        "frequency_penalty": 0.0, # Penalize frequency
        "stop_sequences": ["\n\n", "END"]  # Stop generation
    }
)
```

### Model Switching Strategies

```python
class AdaptiveModelSelector:
    """Select model based on task complexity."""
    
    def __init__(self):
        self.models = {
            "simple": "gemini-2.0-flash",
            "moderate": "gemini-1.5-pro",
            "complex": "gemini-2.0-pro"
        }
    
    def select_model(self, prompt: str) -> str:
        """Select appropriate model based on prompt."""
        word_count = len(prompt.split())
        
        if word_count < 50:
            return self.models["simple"]
        elif word_count < 200:
            return self.models["moderate"]
        else:
            return self.models["complex"]
    
    async def create_agent(self, prompt: str) -> LlmAgent:
        model = self.select_model(prompt)
        return LlmAgent(
            name="AdaptiveAgent",
            model=model
        )
```

### Cost Optimization

```python
class CostOptimizedAgent:
    """Optimize costs by using cheaper models when possible."""
    
    MODEL_COSTS = {
        "gemini-2.0-flash": 0.00001,  # Per token
        "gemini-1.5-pro": 0.00005,
        "gemini-2.0-pro": 0.0001
    }
    
    def __init__(self, budget: float):
        self.budget = budget
        self.spent = 0.0
    
    async def run(self, prompt: str, quality_required: str = "low"):
        """Run with cost optimization."""
        if quality_required == "low" and self.spent < self.budget * 0.5:
            model = "gemini-2.0-flash"
        elif quality_required == "medium" and self.spent < self.budget * 0.8:
            model = "gemini-1.5-pro"
        else:
            model = "gemini-2.0-pro"
        
        agent = LlmAgent(name="CostOptimized", model=model)
        response = await agent.run(prompt)
        
        # Track costs
        tokens = len(prompt.split()) + len(response.split())
        self.spent += tokens * self.MODEL_COSTS[model]
        
        return response
```

---

## Memory & Context Management

### Context Window Management

```python
class ContextManager:
    """Manage context window for long conversations."""
    
    def __init__(self, max_tokens: int = 4096):
        self.max_tokens = max_tokens
        self.messages = []
    
    def add_message(self, role: str, content: str):
        """Add message to context."""
        self.messages.append({"role": role, "content": content})
        self._trim_context()
    
    def _trim_context(self):
        """Trim context to fit window."""
        total_tokens = sum(len(m["content"].split()) for m in self.messages)
        
        while total_tokens > self.max_tokens and len(self.messages) > 2:
            # Keep system message and most recent
            self.messages.pop(1)
            total_tokens = sum(len(m["content"].split()) for m in self.messages)
    
    def get_context(self) -> List[Dict]:
        """Get trimmed context."""
        return self.messages
```

### Long-term Memory with Vector Database

```python
import chromadb
from chromadb.config import Settings

class VectorMemory:
    """Long-term memory using vector database."""
    
    def __init__(self, collection_name: str = "agent_memory"):
        self.client = chromadb.Client(Settings(
            persist_directory=".chromadb"
        ))
        self.collection = self.client.get_or_create_collection(
            name=collection_name
        )
    
    async def store(self, text: str, metadata: Dict = None):
        """Store memory in vector database."""
        self.collection.add(
            documents=[text],
            metadatas=[metadata or {}],
            ids=[f"mem_{datetime.now().timestamp()}"]
        )
    
    async def recall(self, query: str, n_results: int = 5) -> List[str]:
        """Recall relevant memories."""
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results
        )
        return results["documents"][0] if results["documents"] else []
    
    async def forget(self, older_than_days: int = 30):
        """Remove old memories."""
        cutoff = datetime.now() - timedelta(days=older_than_days)
        # Implementation for removing old memories
```

### RAG Integration

```python
class RAGAgent:
    """Agent with Retrieval-Augmented Generation."""
    
    def __init__(self, vector_store: VectorMemory):
        self.vector_store = vector_store
        self.agent = LlmAgent(
            name="RAGAgent",
            model="gemini-2.0-flash"
        )
    
    async def run(self, query: str) -> str:
        """Run with RAG."""
        # Retrieve relevant context
        memories = await self.vector_store.recall(query)
        
        # Augment prompt with context
        augmented_prompt = f"""
        Context from memory:
        {' '.join(memories)}
        
        Question: {query}
        
        Answer based on the context provided:
        """
        
        return await self.agent.run(augmented_prompt)
```

---

## Rate Limiting & Throttling

### Token Bucket Algorithm

```python
import time
from typing import Optional

class TokenBucket:
    """Token bucket for rate limiting."""
    
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_refill = time.time()
    
    async def acquire(self, tokens: int = 1) -> bool:
        """Acquire tokens from bucket."""
        self._refill()
        
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False
    
    async def acquire_with_wait(self, tokens: int = 1):
        """Acquire tokens, waiting if necessary."""
        while not await self.acquire(tokens):
            await asyncio.sleep(0.1)
    
    def _refill(self):
        """Refill bucket based on time passed."""
        now = time.time()
        elapsed = now - self.last_refill
        
        self.tokens = min(
            self.capacity,
            self.tokens + elapsed * self.refill_rate
        )
        self.last_refill = now

class RateLimitedAgent:
    """Agent with rate limiting."""
    
    def __init__(self, requests_per_minute: int = 60):
        self.bucket = TokenBucket(
            capacity=requests_per_minute,
            refill_rate=requests_per_minute / 60
        )
        self.agent = LlmAgent(
            name="RateLimited",
            model="gemini-2.0-flash"
        )
    
    async def run(self, prompt: str) -> str:
        """Run with rate limiting."""
        await self.bucket.acquire_with_wait()
        return await self.agent.run(prompt)
```

### Request Queuing

```python
import asyncio
from collections import deque

class RequestQueue:
    """Queue for managing agent requests."""
    
    def __init__(self, max_concurrent: int = 5):
        self.queue = deque()
        self.max_concurrent = max_concurrent
        self.active = 0
        self.lock = asyncio.Lock()
    
    async def add_request(self, func, *args, **kwargs):
        """Add request to queue."""
        future = asyncio.Future()
        self.queue.append((func, args, kwargs, future))
        asyncio.create_task(self._process_queue())
        return await future
    
    async def _process_queue(self):
        """Process requests from queue."""
        async with self.lock:
            while self.queue and self.active < self.max_concurrent:
                func, args, kwargs, future = self.queue.popleft()
                self.active += 1
                asyncio.create_task(self._execute(func, args, kwargs, future))
    
    async def _execute(self, func, args, kwargs, future):
        """Execute request."""
        try:
            result = await func(*args, **kwargs)
            future.set_result(result)
        except Exception as e:
            future.set_exception(e)
        finally:
            self.active -= 1
            asyncio.create_task(self._process_queue())
```

---

## Authentication & Security

### OAuth2 Implementation

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from datetime import datetime, timedelta

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class AuthManager:
    """Manage authentication for agents."""
    
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
    
    def create_access_token(
        self,
        data: dict,
        expires_delta: Optional[timedelta] = None
    ):
        """Create JWT token."""
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(hours=24))
        to_encode.update({"exp": expire})
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    async def verify_token(self, token: str = Depends(oauth2_scheme)):
        """Verify JWT token."""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            username: str = payload.get("sub")
            if username is None:
                raise credentials_exception
            return username
        except jwt.PyJWTError:
            raise credentials_exception
```

### API Key Management

```python
import hashlib
import secrets
from typing import Dict

class APIKeyManager:
    """Manage API keys for agent access."""
    
    def __init__(self):
        self.keys: Dict[str, Dict] = {}
    
    def generate_key(self, user_id: str, scopes: List[str] = None) -> str:
        """Generate new API key."""
        key = secrets.token_urlsafe(32)
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        
        self.keys[key_hash] = {
            "user_id": user_id,
            "scopes": scopes or [],
            "created_at": datetime.now(),
            "last_used": None
        }
        
        return key
    
    async def verify_key(self, key: str) -> Dict:
        """Verify API key."""
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        
        if key_hash not in self.keys:
            raise HTTPException(
                status_code=401,
                detail="Invalid API key"
            )
        
        # Update last used
        self.keys[key_hash]["last_used"] = datetime.now()
        
        return self.keys[key_hash]
    
    def revoke_key(self, key: str):
        """Revoke API key."""
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        self.keys.pop(key_hash, None)
```

### Role-Based Access Control (RBAC)

```python
from enum import Enum
from typing import Set

class Role(Enum):
    ADMIN = "admin"
    USER = "user"
    AGENT = "agent"
    VIEWER = "viewer"

class Permission(Enum):
    READ = "read"
    WRITE = "write"
    EXECUTE = "execute"
    DELETE = "delete"

class RBACManager:
    """Manage role-based access control."""
    
    def __init__(self):
        self.role_permissions = {
            Role.ADMIN: {Permission.READ, Permission.WRITE, 
                         Permission.EXECUTE, Permission.DELETE},
            Role.USER: {Permission.READ, Permission.WRITE, Permission.EXECUTE},
            Role.AGENT: {Permission.READ, Permission.EXECUTE},
            Role.VIEWER: {Permission.READ}
        }
    
    def has_permission(
        self,
        role: Role,
        permission: Permission
    ) -> bool:
        """Check if role has permission."""
        return permission in self.role_permissions.get(role, set())
    
    def require_permission(
        self,
        permission: Permission
    ):
        """Decorator to require permission."""
        def decorator(func):
            async def wrapper(*args, user_role: Role, **kwargs):
                if not self.has_permission(user_role, permission):
                    raise HTTPException(
                        status_code=403,
                        detail="Insufficient permissions"
                    )
                return await func(*args, **kwargs)
            return wrapper
        return decorator
```

---

## LiteLLM & Providers

### Multi-Provider Configuration

```python
from litellm import completion

class MultiProviderAgent:
    """Agent supporting multiple LLM providers."""
    
    PROVIDERS = {
        "openai": {
            "models": ["gpt-4", "gpt-3.5-turbo"],
            "api_key_env": "OPENAI_API_KEY"
        },
        "anthropic": {
            "models": ["claude-3-opus", "claude-3-sonnet"],
            "api_key_env": "ANTHROPIC_API_KEY"
        },
        "cohere": {
            "models": ["command", "command-light"],
            "api_key_env": "COHERE_API_KEY"
        },
        "openrouter": {
            "models": ["qwen/qwen-3-coder", "meta-llama/llama-3.1-70b"],
            "api_key_env": "OPENROUTER_API_KEY"
        }
    }
    
    def __init__(self, provider: str = "openai", model: str = None):
        self.provider = provider
        self.model = model or self.PROVIDERS[provider]["models"][0]
    
    async def run(self, prompt: str) -> str:
        """Run with selected provider."""
        response = await completion(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            api_key=os.getenv(self.PROVIDERS[self.provider]["api_key_env"])
        )
        return response.choices[0].message.content
```

### Provider Fallback Chain

```python
class FallbackChain:
    """Chain of LLM providers for fallback."""
    
    def __init__(self):
        self.providers = [
            ("openai", "gpt-4"),
            ("anthropic", "claude-3-opus"),
            ("openrouter", "qwen/qwen-3-coder"),
            ("google", "gemini-2.0-flash")
        ]
    
    async def run(self, prompt: str) -> str:
        """Run through fallback chain."""
        for provider, model in self.providers:
            try:
                agent = MultiProviderAgent(provider, model)
                return await agent.run(prompt)
            except Exception as e:
                if (provider, model) == self.providers[-1]:
                    raise e
                continue
```

### Cost Tracking

```python
class CostTracker:
    """Track costs across providers."""
    
    COSTS_PER_1K_TOKENS = {
        "gpt-4": 0.03,
        "gpt-3.5-turbo": 0.002,
        "claude-3-opus": 0.015,
        "gemini-2.0-flash": 0.001
    }
    
    def __init__(self):
        self.usage = {}
    
    def track(self, model: str, tokens: int):
        """Track token usage."""
        if model not in self.usage:
            self.usage[model] = 0
        self.usage[model] += tokens
    
    def get_cost(self) -> float:
        """Calculate total cost."""
        total = 0
        for model, tokens in self.usage.items():
            cost_per_token = self.COSTS_PER_1K_TOKENS.get(model, 0) / 1000
            total += tokens * cost_per_token
        return total
```

---

## LangChain Integration

### Using LangChain Tools

```python
from langchain.tools import Tool
from langchain.agents import initialize_agent, AgentType
from langchain.llms import GoogleGenerativeAI

class LangChainIntegration:
    """Integrate LangChain with ADK."""
    
    def __init__(self):
        self.llm = GoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )
    
    def create_langchain_tool(self, adk_tool: FunctionTool) -> Tool:
        """Convert ADK tool to LangChain tool."""
        return Tool(
            name=adk_tool.name,
            description=adk_tool.description,
            func=adk_tool.function
        )
    
    def create_agent_with_tools(self, tools: List[FunctionTool]):
        """Create LangChain agent with ADK tools."""
        langchain_tools = [
            self.create_langchain_tool(tool) for tool in tools
        ]
        
        return initialize_agent(
            langchain_tools,
            self.llm,
            agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
            verbose=True
        )
```

### Document Loaders

```python
from langchain.document_loaders import TextLoader, PDFLoader, JSONLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

class DocumentProcessor:
    """Process documents for ADK agents."""
    
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
    
    async def load_document(self, file_path: str) -> List[str]:
        """Load and split document."""
        if file_path.endswith('.txt'):
            loader = TextLoader(file_path)
        elif file_path.endswith('.pdf'):
            loader = PDFLoader(file_path)
        elif file_path.endswith('.json'):
            loader = JSONLoader(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_path}")
        
        documents = loader.load()
        chunks = self.text_splitter.split_documents(documents)
        return [chunk.page_content for chunk in chunks]
```

---

## Async Patterns

### Proper Async Implementation

```python
import asyncio
from typing import List, Coroutine

class AsyncOrchestrator:
    """Orchestrate async agent operations."""
    
    async def gather_with_timeout(
        self,
        *coroutines: Coroutine,
        timeout: float = 30.0
    ) -> List:
        """Gather coroutines with timeout."""
        try:
            return await asyncio.wait_for(
                asyncio.gather(*coroutines),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            return [None] * len(coroutines)
    
    async def run_sequential(self, *coroutines: Coroutine) -> List:
        """Run coroutines sequentially."""
        results = []
        for coro in coroutines:
            result = await coro
            results.append(result)
        return results
    
    async def run_with_semaphore(
        self,
        coroutines: List[Coroutine],
        max_concurrent: int = 5
    ) -> List:
        """Run with concurrency limit."""
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def bounded_coro(coro):
            async with semaphore:
                return await coro
        
        return await asyncio.gather(
            *[bounded_coro(coro) for coro in coroutines]
        )
```

### Async Context Managers

```python
class AsyncAgentSession:
    """Async context manager for agent sessions."""
    
    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.agent = None
        self.session_id = None
    
    async def __aenter__(self):
        """Enter async context."""
        self.agent = LlmAgent(
            name=self.agent_name,
            model="gemini-2.0-flash"
        )
        self.session_id = str(uuid.uuid4())
        
        # Initialize session
        await self.agent.initialize()
        
        return self.agent
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Exit async context."""
        # Cleanup
        if self.agent:
            await self.agent.cleanup()
        
        # Log session
        if exc_type:
            logger.error(f"Session {self.session_id} failed: {exc_val}")
        else:
            logger.info(f"Session {self.session_id} completed")

# Usage
async def main():
    async with AsyncAgentSession("MyAgent") as agent:
        result = await agent.run("Hello")
```

---

## Production Monitoring

### Logging Strategies

```python
import logging
import json
from pythonjsonlogger import jsonlogger

class AgentLogger:
    """Structured logging for agents."""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        
        # JSON formatter
        formatter = jsonlogger.JsonFormatter()
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        
        # File handler
        file_handler = logging.FileHandler(f"logs/{name}.json")
        file_handler.setFormatter(formatter)
        
        self.logger.addHandler(console_handler)
        self.logger.addHandler(file_handler)
        self.logger.setLevel(logging.INFO)
    
    def log_request(self, prompt: str, context: Dict = None):
        """Log agent request."""
        self.logger.info(
            "agent_request",
            extra={
                "prompt": prompt,
                "context": context or {},
                "timestamp": datetime.now().isoformat()
            }
        )
    
    def log_response(self, response: str, metadata: Dict = None):
        """Log agent response."""
        self.logger.info(
            "agent_response",
            extra={
                "response": response[:500],  # Truncate long responses
                "metadata": metadata or {},
                "timestamp": datetime.now().isoformat()
            }
        )
```

### Metrics Collection with Prometheus

```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server

# Define metrics
agent_requests = Counter('agent_requests_total', 'Total agent requests')
agent_errors = Counter('agent_errors_total', 'Total agent errors')
agent_latency = Histogram('agent_latency_seconds', 'Agent response latency')
active_agents = Gauge('active_agents', 'Number of active agents')

class MetricsCollector:
    """Collect metrics for monitoring."""
    
    def __init__(self, port: int = 8000):
        # Start Prometheus metrics server
        start_http_server(port)
    
    def track_request(self):
        """Track agent request."""
        agent_requests.inc()
        active_agents.inc()
    
    def track_response(self, duration: float):
        """Track agent response."""
        agent_latency.observe(duration)
        active_agents.dec()
    
    def track_error(self):
        """Track agent error."""
        agent_errors.inc()
        active_agents.dec()

# Usage with decorator
def with_metrics(func):
    """Decorator for tracking metrics."""
    async def wrapper(*args, **kwargs):
        metrics = MetricsCollector()
        metrics.track_request()
        
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            duration = time.time() - start_time
            metrics.track_response(duration)
            return result
        except Exception as e:
            metrics.track_error()
            raise e
    
    return wrapper
```

### Distributed Tracing with OpenTelemetry

```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

class TracingManager:
    """Manage distributed tracing."""
    
    def __init__(self, service_name: str):
        # Setup tracer
        trace.set_tracer_provider(TracerProvider())
        tracer_provider = trace.get_tracer_provider()
        
        # Setup exporter
        otlp_exporter = OTLPSpanExporter(
            endpoint="localhost:4317",
            insecure=True
        )
        
        # Add span processor
        span_processor = BatchSpanProcessor(otlp_exporter)
        tracer_provider.add_span_processor(span_processor)
        
        self.tracer = trace.get_tracer(service_name)
    
    def trace_agent(self, agent_name: str):
        """Decorator for tracing agent calls."""
        def decorator(func):
            async def wrapper(*args, **kwargs):
                with self.tracer.start_as_current_span(
                    f"agent.{agent_name}",
                    attributes={
                        "agent.name": agent_name,
                        "agent.timestamp": datetime.now().isoformat()
                    }
                ) as span:
                    try:
                        result = await func(*args, **kwargs)
                        span.set_attribute("agent.success", True)
                        return result
                    except Exception as e:
                        span.set_attribute("agent.success", False)
                        span.record_exception(e)
                        raise e
            return wrapper
        return decorator
```

---

## Evaluation & Testing

### Mocking LLM Responses

```python
from unittest.mock import AsyncMock, MagicMock

class MockAgent:
    """Mock agent for testing."""
    
    def __init__(self, responses: List[str]):
        self.responses = responses
        self.call_count = 0
    
    async def run(self, prompt: str) -> str:
        """Return mocked response."""
        response = self.responses[self.call_count % len(self.responses)]
        self.call_count += 1
        return response

# Test example
async def test_agent_workflow():
    """Test agent workflow with mocks."""
    mock_agent = MockAgent([
        "First response",
        "Second response"
    ])
    
    # Test workflow
    result1 = await mock_agent.run("Test prompt 1")
    assert result1 == "First response"
    
    result2 = await mock_agent.run("Test prompt 2")
    assert result2 == "Second response"
```

### Load Testing

```python
import asyncio
from typing import List
import statistics

class LoadTester:
    """Load test agents."""
    
    def __init__(self, agent: LlmAgent):
        self.agent = agent
        self.results = []
    
    async def run_load_test(
        self,
        num_requests: int = 100,
        concurrent_requests: int = 10
    ):
        """Run load test."""
        semaphore = asyncio.Semaphore(concurrent_requests)
        
        async def make_request(prompt: str):
            async with semaphore:
                start = time.time()
                try:
                    await self.agent.run(prompt)
                    duration = time.time() - start
                    return {"success": True, "duration": duration}
                except Exception as e:
                    duration = time.time() - start
                    return {"success": False, "duration": duration, "error": str(e)}
        
        # Generate test prompts
        prompts = [f"Test prompt {i}" for i in range(num_requests)]
        
        # Run requests
        self.results = await asyncio.gather(
            *[make_request(prompt) for prompt in prompts]
        )
        
        return self.analyze_results()
    
    def analyze_results(self) -> Dict:
        """Analyze load test results."""
        successful = [r for r in self.results if r["success"]]
        failed = [r for r in self.results if not r["success"]]
        
        durations = [r["duration"] for r in successful]
        
        return {
            "total_requests": len(self.results),
            "successful": len(successful),
            "failed": len(failed),
            "success_rate": len(successful) / len(self.results),
            "avg_duration": statistics.mean(durations) if durations else 0,
            "median_duration": statistics.median(durations) if durations else 0,
            "p95_duration": statistics.quantiles(durations, n=20)[18] if durations else 0,
            "p99_duration": statistics.quantiles(durations, n=100)[98] if durations else 0
        }
```

---

## Deployment Strategies

### Kubernetes Deployment

```yaml
# agent-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: adk-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: adk-agent
  template:
    metadata:
      labels:
        app: adk-agent
    spec:
      containers:
      - name: agent
        image: gcr.io/project/adk-agent:latest
        ports:
        - containerPort: 8080
        env:
        - name: GOOGLE_GENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: agent-secrets
              key: api-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: adk-agent-service
spec:
  selector:
    app: adk-agent
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: LoadBalancer
```

### Auto-scaling Configuration

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: adk-agent-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: adk-agent
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: agent_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
```

### Blue-Green Deployment

```python
class BlueGreenDeployment:
    """Manage blue-green deployments."""
    
    def __init__(self, project_id: str, region: str):
        self.project_id = project_id
        self.region = region
    
    async def deploy(self, version: str):
        """Deploy new version with blue-green strategy."""
        # Deploy to green environment
        green_service = f"agent-green-{version}"
        
        # Deploy new version
        await self.deploy_service(green_service, version)
        
        # Run smoke tests
        if await self.run_smoke_tests(green_service):
            # Switch traffic
            await self.switch_traffic(green_service)
            
            # Clean up blue environment
            await self.cleanup_old_version()
        else:
            # Rollback
            await self.rollback(green_service)
    
    async def run_smoke_tests(self, service: str) -> bool:
        """Run smoke tests on new deployment."""
        # Implementation
        pass
    
    async def switch_traffic(self, new_service: str):
        """Switch traffic to new version."""
        # Update load balancer
        pass
```

---

## State Management

### Persistent State Store

```python
import redis
import pickle
from typing import Any

class StateStore:
    """Persistent state management for agents."""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_client = redis.from_url(redis_url)
    
    async def save_state(self, agent_id: str, state: Dict):
        """Save agent state."""
        key = f"agent:state:{agent_id}"
        value = pickle.dumps(state)
        self.redis_client.set(key, value)
        
        # Set expiration (24 hours)
        self.redis_client.expire(key, 86400)
    
    async def load_state(self, agent_id: str) -> Dict:
        """Load agent state."""
        key = f"agent:state:{agent_id}"
        value = self.redis_client.get(key)
        
        if value:
            return pickle.loads(value)
        return {}
    
    async def checkpoint(self, agent_id: str, checkpoint_id: str, data: Any):
        """Create state checkpoint."""
        key = f"agent:checkpoint:{agent_id}:{checkpoint_id}"
        value = pickle.dumps(data)
        self.redis_client.set(key, value)
    
    async def restore_checkpoint(self, agent_id: str, checkpoint_id: str) -> Any:
        """Restore from checkpoint."""
        key = f"agent:checkpoint:{agent_id}:{checkpoint_id}"
        value = self.redis_client.get(key)
        
        if value:
            return pickle.loads(value)
        return None
```

### Distributed State Management

```python
import etcd3

class DistributedStateManager:
    """Manage state across distributed agents."""
    
    def __init__(self, etcd_host: str = "localhost", etcd_port: int = 2379):
        self.etcd = etcd3.client(host=etcd_host, port=etcd_port)
    
    async def acquire_lock(self, resource: str, ttl: int = 60):
        """Acquire distributed lock."""
        lock = self.etcd.lock(f"/locks/{resource}", ttl=ttl)
        lock.acquire()
        return lock
    
    async def update_shared_state(self, key: str, value: Dict):
        """Update shared state with consistency."""
        # Use transaction for atomic update
        self.etcd.transaction(
            compare=[],
            success=[self.etcd.transactions.put(key, json.dumps(value))],
            failure=[]
        )
    
    async def watch_state(self, key: str, callback):
        """Watch for state changes."""
        events_iterator, cancel = self.etcd.watch_prefix(key)
        
        for event in events_iterator:
            await callback(event)
```

---

## Agent Communication Protocols

### Message Queue Integration

```python
import aio_pika
from typing import Callable

class MessageQueueManager:
    """Manage agent communication via message queues."""
    
    def __init__(self, amqp_url: str = "amqp://guest:guest@localhost/"):
        self.amqp_url = amqp_url
        self.connection = None
        self.channel = None
    
    async def connect(self):
        """Connect to message queue."""
        self.connection = await aio_pika.connect_robust(self.amqp_url)
        self.channel = await self.connection.channel()
    
    async def publish(self, queue: str, message: Dict):
        """Publish message to queue."""
        await self.channel.default_exchange.publish(
            aio_pika.Message(
                body=json.dumps(message).encode()
            ),
            routing_key=queue
        )
    
    async def consume(self, queue: str, callback: Callable):
        """Consume messages from queue."""
        queue_obj = await self.channel.declare_queue(queue)
        
        async with queue_obj.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    data = json.loads(message.body.decode())
                    await callback(data)
```

### Event-Driven Architecture

```python
from typing import Dict, List, Callable

class EventBus:
    """Event bus for agent communication."""
    
    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}
    
    def subscribe(self, event_type: str, handler: Callable):
        """Subscribe to event."""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(handler)
    
    async def publish(self, event_type: str, data: Any):
        """Publish event."""
        if event_type in self.subscribers:
            for handler in self.subscribers[event_type]:
                await handler(data)

class AgentOrchestrator:
    """Orchestrate agents with event-driven patterns."""
    
    def __init__(self):
        self.event_bus = EventBus()
        self.agents = {}
    
    def register_agent(self, agent_id: str, agent: LlmAgent):
        """Register agent with orchestrator."""
        self.agents[agent_id] = agent
        
        # Subscribe to agent events
        self.event_bus.subscribe(
            f"task_for_{agent_id}",
            lambda data: self.handle_task(agent_id, data)
        )
    
    async def handle_task(self, agent_id: str, task: Dict):
        """Handle task for agent."""
        agent = self.agents[agent_id]
        result = await agent.run(task["prompt"])
        
        # Publish completion event
        await self.event_bus.publish(
            "task_completed",
            {"agent_id": agent_id, "result": result}
        )
```

---

## Data Processing

### Batch Processing Patterns

```python
from typing import List, Callable
import asyncio

class BatchProcessor:
    """Process data in batches with agents."""
    
    def __init__(
        self,
        batch_size: int = 100,
        max_concurrent: int = 5
    ):
        self.batch_size = batch_size
        self.max_concurrent = max_concurrent
    
    async def process_batch(
        self,
        data: List[Any],
        processor: Callable
    ) -> List[Any]:
        """Process single batch."""
        semaphore = asyncio.Semaphore(self.max_concurrent)
        
        async def process_item(item):
            async with semaphore:
                return await processor(item)
        
        return await asyncio.gather(
            *[process_item(item) for item in data]
        )
    
    async def process_all(
        self,
        data: List[Any],
        processor: Callable
    ) -> List[Any]:
        """Process all data in batches."""
        results = []
        
        for i in range(0, len(data), self.batch_size):
            batch = data[i:i + self.batch_size]
            batch_results = await self.process_batch(batch, processor)
            results.extend(batch_results)
        
        return results
```

### Stream Processing

```python
class StreamProcessor:
    """Process streaming data with agents."""
    
    def __init__(self, agent: LlmAgent):
        self.agent = agent
        self.buffer = []
        self.buffer_size = 10
    
    async def process_stream(self, stream):
        """Process data stream."""
        async for item in stream:
            self.buffer.append(item)
            
            if len(self.buffer) >= self.buffer_size:
                await self.flush_buffer()
        
        # Process remaining items
        if self.buffer:
            await self.flush_buffer()
    
    async def flush_buffer(self):
        """Process buffered items."""
        if not self.buffer:
            return
        
        # Process batch with agent
        batch_prompt = f"Process these items: {self.buffer}"
        result = await self.agent.run(batch_prompt)
        
        # Clear buffer
        self.buffer = []
        
        return result
```

---

## Performance Tuning

### Profiling Agent Performance

```python
import cProfile
import pstats
from memory_profiler import profile
import tracemalloc

class PerformanceProfiler:
    """Profile agent performance."""
    
    def __init__(self):
        self.profiler = cProfile.Profile()
    
    def profile_execution(self, func):
        """Decorator for profiling execution."""
        async def wrapper(*args, **kwargs):
            self.profiler.enable()
            result = await func(*args, **kwargs)
            self.profiler.disable()
            
            # Print stats
            stats = pstats.Stats(self.profiler)
            stats.sort_stats('cumulative')
            stats.print_stats(10)
            
            return result
        return wrapper
    
    @profile
    async def profile_memory(self, func, *args, **kwargs):
        """Profile memory usage."""
        tracemalloc.start()
        
        result = await func(*args, **kwargs)
        
        current, peak = tracemalloc.get_traced_memory()
        print(f"Current memory: {current / 10**6:.2f} MB")
        print(f"Peak memory: {peak / 10**6:.2f} MB")
        
        tracemalloc.stop()
        
        return result
```

### Connection Pooling

```python
import asyncpg
import aiohttp
from typing import Optional

class ConnectionPool:
    """Manage connection pools for agents."""
    
    def __init__(self):
        self.db_pool: Optional[asyncpg.Pool] = None
        self.http_session: Optional[aiohttp.ClientSession] = None
    
    async def initialize(self):
        """Initialize connection pools."""
        # Database pool
        self.db_pool = await asyncpg.create_pool(
            'postgresql://user:password@localhost/db',
            min_size=10,
            max_size=20,
            max_queries=50000,
            max_inactive_connection_lifetime=300.0
        )
        
        # HTTP session pool
        connector = aiohttp.TCPConnector(
            limit=100,
            limit_per_host=30,
            ttl_dns_cache=300
        )
        self.http_session = aiohttp.ClientSession(
            connector=connector
        )
    
    async def get_db_connection(self):
        """Get database connection from pool."""
        async with self.db_pool.acquire() as connection:
            yield connection
    
    async def cleanup(self):
        """Cleanup pools."""
        if self.db_pool:
            await self.db_pool.close()
        if self.http_session:
            await self.http_session.close()
```

---

## Multi-tenancy

### Tenant Isolation

```python
from typing import Dict

class TenantManager:
    """Manage multi-tenant agent system."""
    
    def __init__(self):
        self.tenants: Dict[str, Dict] = {}
    
    def register_tenant(
        self,
        tenant_id: str,
        config: Dict
    ):
        """Register new tenant."""
        self.tenants[tenant_id] = {
            "config": config,
            "agents": {},
            "quota": config.get("quota", {}),
            "usage": {"requests": 0, "tokens": 0}
        }
    
    async def create_tenant_agent(
        self,
        tenant_id: str,
        agent_name: str
    ) -> LlmAgent:
        """Create agent for tenant."""
        if tenant_id not in self.tenants:
            raise ValueError(f"Tenant {tenant_id} not found")
        
        tenant = self.tenants[tenant_id]
        
        # Check quota
        if not self._check_quota(tenant):
            raise Exception("Quota exceeded")
        
        # Create isolated agent
        agent = LlmAgent(
            name=f"{tenant_id}_{agent_name}",
            model=tenant["config"].get("model", "gemini-2.0-flash"),
            # Tenant-specific configuration
            **tenant["config"].get("agent_config", {})
        )
        
        tenant["agents"][agent_name] = agent
        
        return agent
    
    def _check_quota(self, tenant: Dict) -> bool:
        """Check if tenant has quota available."""
        quota = tenant["quota"]
        usage = tenant["usage"]
        
        if "max_requests" in quota:
            if usage["requests"] >= quota["max_requests"]:
                return False
        
        if "max_tokens" in quota:
            if usage["tokens"] >= quota["max_tokens"]:
                return False
        
        return True
```

### Resource Quotas

```python
class QuotaManager:
    """Manage resource quotas for tenants."""
    
    def __init__(self):
        self.quotas = {}
    
    def set_quota(
        self,
        tenant_id: str,
        daily_requests: int = 1000,
        monthly_tokens: int = 1000000
    ):
        """Set tenant quota."""
        self.quotas[tenant_id] = {
            "daily_requests": daily_requests,
            "monthly_tokens": monthly_tokens,
            "used_requests_today": 0,
            "used_tokens_month": 0,
            "reset_daily": datetime.now().date(),
            "reset_monthly": datetime.now().replace(day=1).date()
        }
    
    async def check_and_update_quota(
        self,
        tenant_id: str,
        tokens: int
    ) -> bool:
        """Check and update quota."""
        if tenant_id not in self.quotas:
            return True  # No quota set
        
        quota = self.quotas[tenant_id]
        
        # Reset counters if needed
        self._reset_counters(quota)
        
        # Check limits
        if quota["used_requests_today"] >= quota["daily_requests"]:
            return False
        
        if quota["used_tokens_month"] + tokens > quota["monthly_tokens"]:
            return False
        
        # Update usage
        quota["used_requests_today"] += 1
        quota["used_tokens_month"] += tokens
        
        return True
    
    def _reset_counters(self, quota: Dict):
        """Reset quota counters."""
        today = datetime.now().date()
        month_start = datetime.now().replace(day=1).date()
        
        if quota["reset_daily"] < today:
            quota["used_requests_today"] = 0
            quota["reset_daily"] = today
        
        if quota["reset_monthly"] < month_start:
            quota["used_tokens_month"] = 0
            quota["reset_monthly"] = month_start
```

---

## Disaster Recovery

### Backup Strategies

```python
import shutil
import tarfile
from pathlib import Path

class BackupManager:
    """Manage agent system backups."""
    
    def __init__(self, backup_dir: str = "/backups"):
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(exist_ok=True)
    
    async def create_backup(self, name: str = None) -> str:
        """Create system backup."""
        if not name:
            name = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        backup_path = self.backup_dir / f"{name}.tar.gz"
        
        with tarfile.open(backup_path, "w:gz") as tar:
            # Backup agent configurations
            tar.add("configs/", arcname="configs")
            
            # Backup state
            tar.add("state/", arcname="state")
            
            # Backup models
            tar.add("models/", arcname="models")
        
        # Upload to cloud storage
        await self._upload_to_cloud(backup_path)
        
        return str(backup_path)
    
    async def restore_backup(self, backup_name: str):
        """Restore from backup."""
        backup_path = self.backup_dir / backup_name
        
        if not backup_path.exists():
            # Download from cloud storage
            await self._download_from_cloud(backup_name)
        
        # Extract backup
        with tarfile.open(backup_path, "r:gz") as tar:
            tar.extractall(".")
    
    async def _upload_to_cloud(self, backup_path: Path):
        """Upload backup to cloud storage."""
        # Implementation for cloud upload
        pass
```

### Failover Mechanisms

```python
class FailoverManager:
    """Manage failover for high availability."""
    
    def __init__(self, primary_url: str, secondary_urls: List[str]):
        self.primary_url = primary_url
        self.secondary_urls = secondary_urls
        self.current_url = primary_url
        self.health_check_interval = 30
    
    async def health_check(self, url: str) -> bool:
        """Check if service is healthy."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{url}/health", timeout=5) as response:
                    return response.status == 200
        except:
            return False
    
    async def get_active_url(self) -> str:
        """Get active service URL."""
        # Check primary
        if await self.health_check(self.primary_url):
            self.current_url = self.primary_url
            return self.primary_url
        
        # Check secondaries
        for url in self.secondary_urls:
            if await self.health_check(url):
                self.current_url = url
                return url
        
        raise Exception("No healthy services available")
    
    async def monitor_and_failover(self):
        """Monitor services and handle failover."""
        while True:
            await asyncio.sleep(self.health_check_interval)
            
            try:
                await self.get_active_url()
            except Exception as e:
                logger.error(f"All services down: {e}")
```

---

## Compliance & Governance

### GDPR Compliance

```python
import hashlib
from typing import Dict, List

class GDPRManager:
    """Manage GDPR compliance for agent data."""
    
    def __init__(self):
        self.pii_fields = ["name", "email", "phone", "address", "ssn"]
        self.consent_records = {}
    
    def anonymize_data(self, data: Dict) -> Dict:
        """Anonymize PII in data."""
        anonymized = data.copy()
        
        for field in self.pii_fields:
            if field in anonymized:
                # Hash PII data
                anonymized[field] = hashlib.sha256(
                    str(anonymized[field]).encode()
                ).hexdigest()[:8]
        
        return anonymized
    
    def record_consent(
        self,
        user_id: str,
        purpose: str,
        granted: bool
    ):
        """Record user consent."""
        if user_id not in self.consent_records:
            self.consent_records[user_id] = []
        
        self.consent_records[user_id].append({
            "purpose": purpose,
            "granted": granted,
            "timestamp": datetime.now(),
            "ip_address": self._get_ip_address()
        })
    
    def check_consent(self, user_id: str, purpose: str) -> bool:
        """Check if user gave consent."""
        if user_id not in self.consent_records:
            return False
        
        # Get latest consent for purpose
        for record in reversed(self.consent_records[user_id]):
            if record["purpose"] == purpose:
                return record["granted"]
        
        return False
    
    async def handle_deletion_request(self, user_id: str):
        """Handle right to be forgotten."""
        # Delete from all stores
        await self._delete_from_database(user_id)
        await self._delete_from_cache(user_id)
        await self._delete_from_logs(user_id)
        
        # Record deletion
        self._record_deletion(user_id)
```

### Audit Logging

```python
class AuditLogger:
    """Comprehensive audit logging."""
    
    def __init__(self, log_file: str = "audit.log"):
        self.log_file = log_file
    
    def log_event(
        self,
        event_type: str,
        user_id: str,
        action: str,
        details: Dict = None
    ):
        """Log audit event."""
        event = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "user_id": user_id,
            "action": action,
            "details": details or {},
            "ip_address": self._get_ip_address(),
            "session_id": self._get_session_id()
        }
        
        # Write to audit log
        with open(self.log_file, "a") as f:
            f.write(json.dumps(event) + "\n")
        
        # Send to SIEM if configured
        self._send_to_siem(event)
    
    def get_audit_trail(
        self,
        user_id: str = None,
        start_date: datetime = None,
        end_date: datetime = None
    ) -> List[Dict]:
        """Get audit trail."""
        events = []
        
        with open(self.log_file, "r") as f:
            for line in f:
                event = json.loads(line)
                
                # Filter by criteria
                if user_id and event["user_id"] != user_id:
                    continue
                
                event_time = datetime.fromisoformat(event["timestamp"])
                
                if start_date and event_time < start_date:
                    continue
                
                if end_date and event_time > end_date:
                    continue
                
                events.append(event)
        
        return events
```

---

## Best Practices

### 1. Agent Design
- **Single Responsibility**: Each agent should have one clear purpose
- **Clear Descriptions**: Help parent agents understand capabilities
- **Explicit Instructions**: Provide detailed, unambiguous instructions
- **Appropriate Models**: Use smaller models for simple tasks
- **Version Control**: Version your agent configurations

### 2. Tool Design
- **Type Hints**: Always include type annotations
- **Docstrings**: Describe function purpose and parameters
- **Error Handling**: Return informative error messages
- **Async Support**: Use async functions for I/O operations
- **Idempotency**: Make tools idempotent where possible

### 3. Performance Optimization
- **Parallel Execution**: Use ParallelAgent for independent tasks
- **Model Selection**: Balance capability vs speed/cost
- **Caching**: Cache expensive operations and responses
- **Streaming**: Use streaming for long responses
- **Connection Pooling**: Reuse connections for efficiency

### 4. Error Handling
- **Graceful Degradation**: Provide fallbacks for failures
- **Retry Logic**: Implement exponential backoff
- **Circuit Breakers**: Prevent cascade failures
- **Error Tracking**: Log and monitor all errors
- **User Feedback**: Provide clear error messages

### 5. Security
- **Input Validation**: Always validate and sanitize inputs
- **Secret Management**: Never hardcode secrets
- **Rate Limiting**: Protect against abuse
- **Audit Logging**: Track all sensitive operations
- **Encryption**: Encrypt data at rest and in transit

### 6. Testing Strategy
- **Unit Tests**: Test individual tools and functions
- **Integration Tests**: Test agent interactions
- **Load Tests**: Verify performance under load
- **Chaos Engineering**: Test failure scenarios
- **Security Tests**: Regular security audits

### 7. Monitoring
- **Metrics**: Track key performance indicators
- **Logging**: Structured logging for debugging
- **Tracing**: Distributed tracing for complex flows
- **Alerting**: Set up alerts for anomalies
- **Dashboards**: Visual monitoring dashboards

### 8. Documentation
- **API Documentation**: Keep API docs up-to-date
- **Architecture Diagrams**: Visual system overview
- **Runbooks**: Operational procedures
- **Change Log**: Track all changes
- **Training Materials**: Onboarding resources

---

## Resources & Links

### Official Documentation
- **ADK Docs**: https://google.github.io/adk-docs/
- **API Reference**: https://google.github.io/adk-docs/api/
- **Tutorials**: https://google.github.io/adk-docs/tutorials/
- **Best Practices**: https://google.github.io/adk-docs/best-practices/

### GitHub Repositories
- **ADK Python**: https://github.com/google/adk-python
- **ADK Samples**: https://github.com/google/adk-samples
- **Starter Pack**: https://github.com/GoogleCloudPlatform/agent-starter-pack

### Specific Guides
- **Multi-Agent Systems**: https://google.github.io/adk-docs/agents/multi-agents/
- **Workflow Agents**: https://google.github.io/adk-docs/agents/workflow-agents/
- **Callbacks**: https://google.github.io/adk-docs/callbacks/
- **Evaluation**: https://google.github.io/adk-docs/evaluate/
- **LiteLLM Integration**: https://google.github.io/adk-docs/litellm/
- **Production Deployment**: https://google.github.io/adk-docs/production/

### Templates & Examples
- **ADK Base**: Minimal ReAct agent example
- **ADK Gemini Fullstack**: Production-ready research agent
- **ADK Web Search**: Web search with citation agent
- **ADK RAG**: Document Q&A with retrieval
- **ADK Streaming**: Real-time streaming agent
- **ADK Multi-tenant**: Multi-tenant agent system

### Community & Support
- **Issues**: https://github.com/google/adk-python/issues
- **Discussions**: https://github.com/google/adk-python/discussions
- **Stack Overflow**: Tag with `google-adk`
- **Discord**: https://discord.gg/google-adk
- **Slack**: https://googlecloud.slack.com/adk

### Training & Certification
- **ADK Fundamentals**: https://cloud.google.com/training/adk-fundamentals
- **Advanced ADK**: https://cloud.google.com/training/adk-advanced
- **Certification**: https://cloud.google.com/certification/adk

---

## Quick Reference

### Common Patterns

#### Research Agent with RAG
```python
researcher = LlmAgent(
    name="Researcher",
    model="gemini-2.0-flash",
    tools=[web_search, fetch_url, extract_content, vector_store],
    instruction="Research topics thoroughly with citations and memory"
)
```

#### Streaming Agent
```python
streamer = LlmAgent(
    name="StreamingAgent",
    model="gemini-2.0-flash",
    streaming=True,
    instruction="Generate responses in real-time"
)
```

#### Multi-Provider Agent
```python
multi = MultiProviderAgent(
    providers=["openai", "anthropic", "google"],
    fallback_chain=True,
    cost_optimized=True
)
```

### CLI Commands
```bash
# Development
adk web app/                    # Start web UI
adk evaluate app/               # Run evaluations
adk validate app/               # Validate configuration
adk profile app/                # Profile performance

# Deployment
agent-starter-pack create       # Create new project
agent-starter-pack setup-cicd   # Setup CI/CD
adk deploy --platform=cloud-run # Deploy to Cloud Run
adk scale --replicas=10         # Scale deployment
```

### Environment Variables
```bash
# Core Configuration
GOOGLE_GENAI_API_KEY           # Gemini API key
GOOGLE_GENAI_USE_VERTEXAI      # Use Vertex AI (TRUE/FALSE)
GOOGLE_CLOUD_PROJECT           # GCP project ID

# Logging & Monitoring
LOG_LEVEL                      # Logging level
OTEL_EXPORTER_OTLP_ENDPOINT   # OpenTelemetry endpoint
PROMETHEUS_PORT                # Metrics port

# Security
JWT_SECRET_KEY                 # JWT signing key
CORS_ORIGINS                   # Allowed CORS origins
RATE_LIMIT_PER_MINUTE         # Rate limit

# Performance
MAX_WORKERS                    # Max concurrent workers
CONNECTION_POOL_SIZE           # Database pool size
CACHE_TTL                      # Cache expiration

# Multi-Provider
OPENAI_API_KEY                # OpenAI key
ANTHROPIC_API_KEY             # Anthropic key
OPENROUTER_API_KEY            # OpenRouter key
```

---

## Conclusion

This comprehensive guide provides production-grade knowledge for Google ADK development. Key takeaways:

1. **Start Simple**: Begin with basic LlmAgent, add complexity gradually
2. **Design for Scale**: Use proper patterns for production systems
3. **Monitor Everything**: Implement comprehensive observability
4. **Handle Failures**: Build resilient systems with proper error handling
5. **Secure by Default**: Implement security at every layer
6. **Test Thoroughly**: Use evaluation framework and load testing
7. **Document Well**: Maintain clear documentation
8. **Follow Best Practices**: Design clear, focused agents with proper patterns

For the latest updates and advanced topics, refer to the official documentation and community resources.

---

*Last Updated: 2025-08-11*
*ADK Version: 1.8.0*
*Guide Version: 2.0.0*