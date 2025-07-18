"""
Agent-to-Agent (A2A) Protocol for Distributed VANA Architecture

This module implements the A2A communication protocol that allows agents to
communicate directly with each other through REST endpoints, enabling
distributed processing and parallel execution.

Key Features:
- Async REST-based communication
- Agent service discovery and registration
- Request/response routing with load balancing
- Fault tolerance with circuit breakers
- Performance monitoring and metrics
"""

import asyncio
import aiohttp
import json
import time
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
import uuid
import weakref

logger = logging.getLogger(__name__)


class AgentStatus(Enum):
    """Agent availability status"""
    AVAILABLE = "available"
    BUSY = "busy"
    UNAVAILABLE = "unavailable"
    ERROR = "error"


@dataclass
class AgentEndpoint:
    """Agent endpoint configuration"""
    name: str
    url: str
    status: AgentStatus
    capabilities: List[str]
    last_seen: datetime
    load_factor: float = 0.0
    response_time_avg: float = 0.0
    error_count: int = 0
    success_count: int = 0


@dataclass
class A2ARequest:
    """Agent-to-Agent request structure"""
    request_id: str
    source_agent: str
    target_agent: str
    task_type: str
    data: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None
    priority: int = 1
    timeout: float = 30.0
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


@dataclass
class A2AResponse:
    """Agent-to-Agent response structure"""
    request_id: str
    source_agent: str
    target_agent: str
    success: bool
    data: Any
    error: Optional[str] = None
    execution_time: float = 0.0
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


class CircuitBreaker:
    """Circuit breaker for fault tolerance"""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: float = 60.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half-open
    
    def call(self, func: Callable, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        if self.state == "open":
            if self._should_attempt_reset():
                self.state = "half-open"
            else:
                raise Exception("Circuit breaker is open")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self) -> bool:
        """Check if we should attempt to reset the circuit"""
        return (
            self.last_failure_time and
            datetime.now() - self.last_failure_time > timedelta(seconds=self.recovery_timeout)
        )
    
    def _on_success(self):
        """Handle successful execution"""
        self.failure_count = 0
        self.state = "closed"
    
    def _on_failure(self):
        """Handle failed execution"""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "open"


class AgentRegistry:
    """Registry for managing agent endpoints and discovery"""
    
    def __init__(self):
        self.agents: Dict[str, AgentEndpoint] = {}
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self._lock = asyncio.Lock()
    
    async def register_agent(self, name: str, url: str, capabilities: List[str]):
        """Register an agent endpoint"""
        async with self._lock:
            self.agents[name] = AgentEndpoint(
                name=name,
                url=url,
                status=AgentStatus.AVAILABLE,
                capabilities=capabilities,
                last_seen=datetime.now()
            )
            
            if name not in self.circuit_breakers:
                self.circuit_breakers[name] = CircuitBreaker()
            
            logger.info(f"Registered agent: {name} at {url}")
    
    async def unregister_agent(self, name: str):
        """Unregister an agent endpoint"""
        async with self._lock:
            if name in self.agents:
                del self.agents[name]
                logger.info(f"Unregistered agent: {name}")
    
    async def get_agent(self, name: str) -> Optional[AgentEndpoint]:
        """Get agent endpoint by name"""
        return self.agents.get(name)
    
    async def get_agents_by_capability(self, capability: str) -> List[AgentEndpoint]:
        """Get all agents that have a specific capability"""
        return [
            agent for agent in self.agents.values()
            if capability in agent.capabilities and agent.status == AgentStatus.AVAILABLE
        ]
    
    async def update_agent_status(self, name: str, status: AgentStatus, load_factor: float = None):
        """Update agent status and load"""
        if name in self.agents:
            self.agents[name].status = status
            self.agents[name].last_seen = datetime.now()
            
            if load_factor is not None:
                self.agents[name].load_factor = load_factor
    
    async def record_response_time(self, name: str, response_time: float, success: bool):
        """Record response time and success metrics"""
        if name in self.agents:
            agent = self.agents[name]
            
            # Update running average
            total_requests = agent.success_count + agent.error_count
            if total_requests > 0:
                agent.response_time_avg = (
                    (agent.response_time_avg * total_requests + response_time) / (total_requests + 1)
                )
            else:
                agent.response_time_avg = response_time
            
            if success:
                agent.success_count += 1
            else:
                agent.error_count += 1
    
    async def get_best_agent(self, capability: str) -> Optional[AgentEndpoint]:
        """Get the best available agent for a capability based on load and performance"""
        candidates = await self.get_agents_by_capability(capability)
        
        if not candidates:
            return None
        
        # Score agents based on load factor and response time
        def calculate_score(agent: AgentEndpoint) -> float:
            # Lower is better
            load_penalty = agent.load_factor * 0.5
            time_penalty = agent.response_time_avg * 0.3
            error_penalty = (agent.error_count / max(agent.success_count + agent.error_count, 1)) * 0.2
            
            return load_penalty + time_penalty + error_penalty
        
        return min(candidates, key=calculate_score)


class A2AProtocol:
    """Agent-to-Agent protocol implementation"""
    
    def __init__(self, agent_name: str, port: int = 8000):
        self.agent_name = agent_name
        self.port = port
        self.registry = AgentRegistry()
        self.session: Optional[aiohttp.ClientSession] = None
        self._running = False
        
        # Performance metrics
        self.request_count = 0
        self.total_response_time = 0.0
        self.error_count = 0
    
    async def start(self):
        """Start the A2A protocol service"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        )
        self._running = True
        logger.info(f"A2A Protocol started for agent: {self.agent_name}")
    
    async def stop(self):
        """Stop the A2A protocol service"""
        self._running = False
        if self.session:
            await self.session.close()
        logger.info(f"A2A Protocol stopped for agent: {self.agent_name}")
    
    async def register_specialist(self, name: str, endpoint: str, capabilities: List[str]):
        """Register a specialist agent"""
        await self.registry.register_agent(name, endpoint, capabilities)
    
    async def call_specialist(self, name: str, request: A2ARequest) -> A2AResponse:
        """Call a specialist agent with fault tolerance"""
        start_time = time.time()
        
        try:
            agent = await self.registry.get_agent(name)
            if not agent:
                raise ValueError(f"Agent '{name}' not found in registry")
            
            circuit_breaker = self.registry.circuit_breakers[name]
            
            # Use circuit breaker to make the call
            response_data = circuit_breaker.call(
                self._make_http_request,
                agent.url,
                request
            )
            
            if asyncio.iscoroutine(response_data):
                response_data = await response_data
            
            execution_time = time.time() - start_time
            
            # Update metrics
            await self.registry.record_response_time(name, execution_time, True)
            self.request_count += 1
            self.total_response_time += execution_time
            
            return A2AResponse(
                request_id=request.request_id,
                source_agent=request.source_agent,
                target_agent=request.target_agent,
                success=True,
                data=response_data,
                execution_time=execution_time
            )
            
        except Exception as e:
            execution_time = time.time() - start_time
            
            # Update error metrics
            if name in self.registry.agents:
                await self.registry.record_response_time(name, execution_time, False)
            
            self.error_count += 1
            
            logger.error(f"A2A call to {name} failed: {e}")
            
            return A2AResponse(
                request_id=request.request_id,
                source_agent=request.source_agent,
                target_agent=request.target_agent,
                success=False,
                data=None,
                error=str(e),
                execution_time=execution_time
            )
    
    async def _make_http_request(self, url: str, request: A2ARequest) -> Any:
        """Make HTTP request to agent endpoint"""
        if not self.session:
            raise RuntimeError("A2A Protocol not started")
        
        payload = asdict(request)
        # Convert datetime to ISO string for JSON serialization
        payload['timestamp'] = request.timestamp.isoformat()
        
        async with self.session.post(
            f"{url}/execute",
            json=payload,
            headers={'Content-Type': 'application/json'}
        ) as response:
            response.raise_for_status()
            return await response.json()
    
    async def call_best_specialist(self, capability: str, request: A2ARequest) -> A2AResponse:
        """Call the best available specialist for a capability"""
        agent = await self.registry.get_best_agent(capability)
        
        if not agent:
            return A2AResponse(
                request_id=request.request_id,
                source_agent=request.source_agent,
                target_agent="unknown",
                success=False,
                error=f"No available agent with capability: {capability}"
            )
        
        request.target_agent = agent.name
        return await self.call_specialist(agent.name, request)
    
    async def parallel_route(self, request: A2ARequest, specialists: List[str]) -> List[A2AResponse]:
        """Route request to multiple specialists in parallel"""
        tasks = []
        
        for specialist in specialists:
            # Create individual request for each specialist
            specialist_request = A2ARequest(
                request_id=f"{request.request_id}_{specialist}",
                source_agent=request.source_agent,
                target_agent=specialist,
                task_type=request.task_type,
                data=request.data,
                context=request.context,
                priority=request.priority,
                timeout=request.timeout
            )
            
            task = asyncio.create_task(
                self.call_specialist(specialist, specialist_request)
            )
            tasks.append(task)
        
        # Wait for all tasks to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Convert exceptions to error responses
        responses = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                responses.append(A2AResponse(
                    request_id=f"{request.request_id}_{specialists[i]}",
                    source_agent=request.source_agent,
                    target_agent=specialists[i],
                    success=False,
                    error=str(result)
                ))
            else:
                responses.append(result)
        
        return responses
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics for the A2A protocol"""
        avg_response_time = (
            self.total_response_time / self.request_count
            if self.request_count > 0 else 0.0
        )
        
        error_rate = (
            self.error_count / (self.request_count + self.error_count)
            if (self.request_count + self.error_count) > 0 else 0.0
        )
        
        return {
            "total_requests": self.request_count,
            "total_errors": self.error_count,
            "average_response_time": avg_response_time,
            "error_rate": error_rate,
            "registered_agents": len(self.registry.agents),
            "agents": {
                name: {
                    "status": agent.status.value,
                    "load_factor": agent.load_factor,
                    "avg_response_time": agent.response_time_avg,
                    "success_count": agent.success_count,
                    "error_count": agent.error_count
                }
                for name, agent in self.registry.agents.items()
            }
        }


# Global A2A protocol instance
_a2a_protocol_instance: Optional[A2AProtocol] = None


async def get_a2a_protocol(agent_name: str = "vana") -> A2AProtocol:
    """Get or create the global A2A protocol instance"""
    global _a2a_protocol_instance
    
    if _a2a_protocol_instance is None:
        _a2a_protocol_instance = A2AProtocol(agent_name)
        await _a2a_protocol_instance.start()
    
    return _a2a_protocol_instance


async def shutdown_a2a_protocol():
    """Shutdown the global A2A protocol instance"""
    global _a2a_protocol_instance
    
    if _a2a_protocol_instance:
        await _a2a_protocol_instance.stop()
        _a2a_protocol_instance = None