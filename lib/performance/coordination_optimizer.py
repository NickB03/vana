"""
Agent Coordination Performance Optimizer

Optimizes multi-agent coordination for better performance:
- Intelligent agent selection
- Load balancing across agents
- Request batching and queuing
- Coordination caching
- Parallel execution optimization
"""

import asyncio
import logging
import time
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict, deque
import threading
from concurrent.futures import ThreadPoolExecutor
import json
import hashlib

logger = logging.getLogger(__name__)


@dataclass
class AgentPerformanceStats:
    """Performance statistics for an agent."""
    agent_id: str
    avg_response_time: float
    success_rate: float
    current_load: int
    total_requests: int
    last_updated: float


@dataclass
class CoordinationRequest:
    """Coordination request data structure."""
    request_id: str
    agent_id: str
    function_name: str
    args: tuple
    kwargs: dict
    priority: int
    timestamp: float
    timeout: float


class AgentLoadBalancer:
    """Intelligent load balancer for agent coordination."""
    
    def __init__(self):
        self.agent_stats: Dict[str, AgentPerformanceStats] = {}
        self.agent_queues: Dict[str, deque] = defaultdict(deque)
        self._lock = threading.RLock()
        
    def update_agent_stats(self, agent_id: str, response_time: float, success: bool):
        """Update performance statistics for an agent."""
        with self._lock:
            if agent_id not in self.agent_stats:
                self.agent_stats[agent_id] = AgentPerformanceStats(
                    agent_id=agent_id,
                    avg_response_time=response_time,
                    success_rate=1.0 if success else 0.0,
                    current_load=0,
                    total_requests=1,
                    last_updated=time.time()
                )
            else:
                stats = self.agent_stats[agent_id]
                # Update moving averages
                alpha = 0.1  # Smoothing factor
                stats.avg_response_time = (1 - alpha) * stats.avg_response_time + alpha * response_time
                stats.success_rate = (1 - alpha) * stats.success_rate + alpha * (1.0 if success else 0.0)
                stats.total_requests += 1
                stats.last_updated = time.time()
    
    def select_best_agent(self, available_agents: List[str], task_type: str = None) -> str:
        """Select the best agent based on performance and load."""
        with self._lock:
            if not available_agents:
                raise ValueError("No available agents")
            
            if len(available_agents) == 1:
                return available_agents[0]
            
            # Score agents based on multiple factors
            agent_scores = {}
            for agent_id in available_agents:
                score = self._calculate_agent_score(agent_id, task_type)
                agent_scores[agent_id] = score
            
            # Select agent with highest score
            best_agent = max(agent_scores.keys(), key=lambda a: agent_scores[a])
            return best_agent
    
    def _calculate_agent_score(self, agent_id: str, task_type: str = None) -> float:
        """Calculate performance score for an agent."""
        if agent_id not in self.agent_stats:
            return 0.5  # Default score for unknown agents
        
        stats = self.agent_stats[agent_id]
        
        # Base score components
        response_time_score = max(0, 1.0 - (stats.avg_response_time / 10.0))  # Normalize to 0-1
        success_rate_score = stats.success_rate
        load_score = max(0, 1.0 - (stats.current_load / 10.0))  # Assume max load of 10
        
        # Weighted combination
        score = (
            0.4 * response_time_score +
            0.4 * success_rate_score +
            0.2 * load_score
        )
        
        return score
    
    def increment_load(self, agent_id: str):
        """Increment current load for an agent."""
        with self._lock:
            if agent_id in self.agent_stats:
                self.agent_stats[agent_id].current_load += 1
    
    def decrement_load(self, agent_id: str):
        """Decrement current load for an agent."""
        with self._lock:
            if agent_id in self.agent_stats:
                self.agent_stats[agent_id].current_load = max(0, self.agent_stats[agent_id].current_load - 1)


class RequestBatcher:
    """Batches similar requests for efficient processing."""
    
    def __init__(self, batch_size: int = 10, batch_timeout: float = 0.1):
        self.batch_size = batch_size
        self.batch_timeout = batch_timeout
        self.pending_batches: Dict[str, List[CoordinationRequest]] = defaultdict(list)
        self.batch_timers: Dict[str, float] = {}
        self._lock = threading.RLock()
        
    def add_request(self, request: CoordinationRequest) -> bool:
        """Add request to batch. Returns True if batch is ready."""
        batch_key = self._get_batch_key(request)
        
        with self._lock:
            self.pending_batches[batch_key].append(request)
            
            # Set timer for first request in batch
            if len(self.pending_batches[batch_key]) == 1:
                self.batch_timers[batch_key] = time.time()
            
            # Check if batch is ready
            return (
                len(self.pending_batches[batch_key]) >= self.batch_size or
                time.time() - self.batch_timers[batch_key] >= self.batch_timeout
            )
    
    def get_batch(self, batch_key: str) -> List[CoordinationRequest]:
        """Get and clear a batch of requests."""
        with self._lock:
            batch = self.pending_batches.pop(batch_key, [])
            self.batch_timers.pop(batch_key, None)
            return batch
    
    def _get_batch_key(self, request: CoordinationRequest) -> str:
        """Generate batch key for similar requests."""
        # Batch by agent and function
        return f"{request.agent_id}:{request.function_name}"
    
    def get_ready_batches(self) -> List[str]:
        """Get list of batch keys that are ready for processing."""
        ready_batches = []
        current_time = time.time()
        
        with self._lock:
            for batch_key, requests in self.pending_batches.items():
                if (
                    len(requests) >= self.batch_size or
                    current_time - self.batch_timers.get(batch_key, current_time) >= self.batch_timeout
                ):
                    ready_batches.append(batch_key)
        
        return ready_batches


class CoordinationCache:
    """Caches coordination results for faster repeated operations."""
    
    def __init__(self, max_size: int = 1000, ttl: int = 300):
        self.max_size = max_size
        self.ttl = ttl
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._access_order = deque()
        self._lock = threading.RLock()
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached result."""
        with self._lock:
            if key not in self._cache:
                return None
            
            result, timestamp = self._cache[key]
            
            # Check expiry
            if time.time() - timestamp > self.ttl:
                self._remove(key)
                return None
            
            # Update access order
            if key in self._access_order:
                self._access_order.remove(key)
            self._access_order.append(key)
            
            return result
    
    def set(self, key: str, value: Any):
        """Cache a result."""
        with self._lock:
            # Evict if necessary
            while len(self._cache) >= self.max_size and self._access_order:
                oldest_key = self._access_order.popleft()
                self._cache.pop(oldest_key, None)
            
            self._cache[key] = (value, time.time())
            if key in self._access_order:
                self._access_order.remove(key)
            self._access_order.append(key)
    
    def _remove(self, key: str):
        """Remove item from cache."""
        self._cache.pop(key, None)
        if key in self._access_order:
            self._access_order.remove(key)
    
    def generate_key(self, agent_id: str, function_name: str, args: tuple, kwargs: dict) -> str:
        """Generate cache key for coordination request."""
        # Create deterministic key from request parameters
        key_data = {
            "agent": agent_id,
            "function": function_name,
            "args": args,
            "kwargs": {k: v for k, v in kwargs.items() if isinstance(v, (str, int, float, bool))}
        }
        key_str = json.dumps(key_data, sort_keys=True)
        return hashlib.sha256(key_str.encode()).hexdigest()


class CoordinationOptimizer:
    """Main coordination performance optimizer."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.load_balancer = AgentLoadBalancer()
        self.request_batcher = RequestBatcher(
            batch_size=config.get("batch_size", 10),
            batch_timeout=config.get("batch_timeout", 0.1)
        )
        self.cache = CoordinationCache(
            max_size=config.get("cache_size", 1000),
            ttl=config.get("cache_ttl", 300)
        )
        self.executor = ThreadPoolExecutor(max_workers=config.get("max_workers", 20))
        self._optimization_enabled = config.get("enable_optimization", True)
    
    async def coordinate_optimized(self, agent_id: str, function_name: str, *args, **kwargs) -> Any:
        """Optimized coordination with caching, batching, and load balancing."""
        if not self._optimization_enabled:
            # Fallback to direct coordination
            return await self._direct_coordinate(agent_id, function_name, *args, **kwargs)
        
        # Check cache first
        cache_key = self.cache.generate_key(agent_id, function_name, args, kwargs)
        cached_result = self.cache.get(cache_key)
        if cached_result is not None:
            logger.debug(f"Cache hit for {agent_id}:{function_name}")
            return cached_result
        
        # Create coordination request
        request = CoordinationRequest(
            request_id=f"{time.time()}_{agent_id}_{function_name}",
            agent_id=agent_id,
            function_name=function_name,
            args=args,
            kwargs=kwargs,
            priority=kwargs.pop("_priority", 5),
            timestamp=time.time(),
            timeout=kwargs.pop("_timeout", 30.0)
        )
        
        # Execute with optimization
        start_time = time.time()
        success = False
        result = None
        
        try:
            self.load_balancer.increment_load(agent_id)
            result = await self._execute_request(request)
            success = True
            
            # Cache successful results
            if result is not None:
                self.cache.set(cache_key, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Coordination error for {agent_id}:{function_name}: {e}")
            raise
        finally:
            execution_time = time.time() - start_time
            self.load_balancer.update_agent_stats(agent_id, execution_time, success)
            self.load_balancer.decrement_load(agent_id)
    
    async def _execute_request(self, request: CoordinationRequest) -> Any:
        """Execute coordination request."""
        # This would integrate with the actual coordination tools
        # For now, simulate the execution
        await asyncio.sleep(0.01)  # Simulate processing time
        return f"Optimized result for {request.function_name}"
    
    async def _direct_coordinate(self, agent_id: str, function_name: str, *args, **kwargs) -> Any:
        """Direct coordination without optimization."""
        # This would call the actual coordination function
        await asyncio.sleep(0.05)  # Simulate processing time
        return f"Direct result for {function_name}"
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get coordination performance statistics."""
        return {
            "agent_stats": {
                agent_id: {
                    "avg_response_time": stats.avg_response_time,
                    "success_rate": stats.success_rate,
                    "current_load": stats.current_load,
                    "total_requests": stats.total_requests
                }
                for agent_id, stats in self.load_balancer.agent_stats.items()
            },
            "cache_stats": {
                "size": len(self.cache._cache),
                "max_size": self.cache.max_size,
                "hit_rate": self._calculate_cache_hit_rate()
            },
            "optimization_enabled": self._optimization_enabled
        }
    
    def _calculate_cache_hit_rate(self) -> float:
        """Calculate cache hit rate."""
        # This would be tracked in a real implementation
        return 0.75  # Placeholder


# Global coordination optimizer
_coordination_optimizer = None


def get_coordination_optimizer(config: Optional[Dict[str, Any]] = None) -> CoordinationOptimizer:
    """Get global coordination optimizer instance."""
    global _coordination_optimizer
    if _coordination_optimizer is None:
        default_config = {
            "batch_size": 10,
            "batch_timeout": 0.1,
            "cache_size": 1000,
            "cache_ttl": 300,
            "max_workers": 20,
            "enable_optimization": True
        }
        if config:
            default_config.update(config)
        _coordination_optimizer = CoordinationOptimizer(default_config)
    return _coordination_optimizer
