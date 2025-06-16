"""
Database Query Performance Optimizer

Optimizes database operations for better performance:
- Query caching and optimization
- Connection pooling
- Batch operations
- Index optimization suggestions
- Query analysis and profiling
"""

import asyncio
import logging
import time
import sqlite3
import threading
from typing import Dict, Any, List, Optional, Tuple, Union
from dataclasses import dataclass
from collections import defaultdict
import hashlib
import json
from contextlib import contextmanager

logger = logging.getLogger(__name__)


@dataclass
class QueryStats:
    """Statistics for database queries."""
    query_hash: str
    execution_count: int
    total_time: float
    avg_time: float
    min_time: float
    max_time: float
    last_executed: float
    cache_hits: int


class DatabaseConnectionPool:
    """Optimized database connection pool."""
    
    def __init__(self, database_path: str, max_connections: int = 10):
        self.database_path = database_path
        self.max_connections = max_connections
        self._pool = []
        self._in_use = set()
        self._lock = threading.Lock()
        
        # Initialize pool
        for _ in range(min(3, max_connections)):
            conn = self._create_connection()
            self._pool.append(conn)
    
    @contextmanager
    def get_connection(self):
        """Get a database connection from the pool."""
        conn = None
        try:
            with self._lock:
                if self._pool:
                    conn = self._pool.pop()
                elif len(self._in_use) < self.max_connections:
                    conn = self._create_connection()
                else:
                    # Wait for a connection to become available
                    # In a real implementation, this would use a proper queue
                    raise Exception("Connection pool exhausted")
                
                self._in_use.add(conn)
            
            yield conn
            
        finally:
            if conn:
                with self._lock:
                    self._in_use.discard(conn)
                    if self._is_connection_healthy(conn):
                        self._pool.append(conn)
                    else:
                        conn.close()
    
    def _create_connection(self) -> sqlite3.Connection:
        """Create a new database connection."""
        conn = sqlite3.connect(self.database_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row  # Enable dict-like access
        
        # Optimize connection settings
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA cache_size=10000")
        conn.execute("PRAGMA temp_store=MEMORY")
        
        return conn
    
    def _is_connection_healthy(self, conn: sqlite3.Connection) -> bool:
        """Check if connection is healthy."""
        try:
            conn.execute("SELECT 1")
            return True
        except Exception:
            return False
    
    def close_all(self):
        """Close all connections in the pool."""
        with self._lock:
            for conn in self._pool:
                conn.close()
            for conn in self._in_use:
                conn.close()
            self._pool.clear()
            self._in_use.clear()


class QueryCache:
    """High-performance query result cache."""
    
    def __init__(self, max_size: int = 1000, ttl: int = 300):
        self.max_size = max_size
        self.ttl = ttl
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._access_times: Dict[str, float] = {}
        self._lock = threading.RLock()
        
    def get(self, query_hash: str) -> Optional[Any]:
        """Get cached query result."""
        with self._lock:
            if query_hash not in self._cache:
                return None
            
            result, timestamp = self._cache[query_hash]
            
            # Check expiry
            if time.time() - timestamp > self.ttl:
                self._remove(query_hash)
                return None
            
            # Update access time
            self._access_times[query_hash] = time.time()
            return result
    
    def set(self, query_hash: str, result: Any):
        """Cache query result."""
        with self._lock:
            # Evict if necessary
            if len(self._cache) >= self.max_size:
                self._evict_lru()
            
            self._cache[query_hash] = (result, time.time())
            self._access_times[query_hash] = time.time()
    
    def _evict_lru(self):
        """Evict least recently used item."""
        if not self._access_times:
            return
        
        lru_key = min(self._access_times.keys(), key=lambda k: self._access_times[k])
        self._remove(lru_key)
    
    def _remove(self, query_hash: str):
        """Remove item from cache."""
        self._cache.pop(query_hash, None)
        self._access_times.pop(query_hash, None)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            return {
                "size": len(self._cache),
                "max_size": self.max_size,
                "memory_usage_estimate": len(self._cache) * 0.001  # Rough estimate in MB
            }


class QueryOptimizer:
    """Analyzes and optimizes database queries."""
    
    def __init__(self):
        self.query_stats: Dict[str, QueryStats] = {}
        self._lock = threading.RLock()
    
    def analyze_query(self, query: str) -> Dict[str, Any]:
        """Analyze query for optimization opportunities."""
        analysis = {
            "query_hash": self._hash_query(query),
            "estimated_complexity": self._estimate_complexity(query),
            "suggestions": [],
            "indexes_needed": []
        }
        
        query_lower = query.lower().strip()
        
        # Check for common optimization opportunities
        if "select *" in query_lower:
            analysis["suggestions"].append("Consider selecting only needed columns instead of SELECT *")
        
        if "order by" in query_lower and "limit" not in query_lower:
            analysis["suggestions"].append("Consider adding LIMIT clause with ORDER BY")
        
        if query_lower.count("join") > 2:
            analysis["suggestions"].append("Complex joins detected - consider query restructuring")
        
        # Suggest indexes based on WHERE clauses
        if "where" in query_lower:
            where_clause = query_lower.split("where", 1)[1].split("order by")[0].split("group by")[0]
            # Simple heuristic for index suggestions
            if "=" in where_clause:
                analysis["indexes_needed"].append("Consider index on equality columns")
        
        return analysis
    
    def record_query_execution(self, query: str, execution_time: float, cached: bool = False):
        """Record query execution statistics."""
        query_hash = self._hash_query(query)
        
        with self._lock:
            if query_hash not in self.query_stats:
                self.query_stats[query_hash] = QueryStats(
                    query_hash=query_hash,
                    execution_count=0,
                    total_time=0.0,
                    avg_time=0.0,
                    min_time=float('inf'),
                    max_time=0.0,
                    last_executed=time.time(),
                    cache_hits=0
                )
            
            stats = self.query_stats[query_hash]
            
            if cached:
                stats.cache_hits += 1
            else:
                stats.execution_count += 1
                stats.total_time += execution_time
                stats.avg_time = stats.total_time / stats.execution_count
                stats.min_time = min(stats.min_time, execution_time)
                stats.max_time = max(stats.max_time, execution_time)
            
            stats.last_executed = time.time()
    
    def get_slow_queries(self, threshold: float = 1.0) -> List[Tuple[str, QueryStats]]:
        """Get queries that are slower than threshold."""
        with self._lock:
            slow_queries = [
                (query_hash, stats) for query_hash, stats in self.query_stats.items()
                if stats.avg_time > threshold
            ]
            return sorted(slow_queries, key=lambda x: x[1].avg_time, reverse=True)
    
    def _hash_query(self, query: str) -> str:
        """Generate hash for query (normalized)."""
        # Normalize query for consistent hashing
        normalized = " ".join(query.lower().split())
        return hashlib.sha256(normalized.encode()).hexdigest()
    
    def _estimate_complexity(self, query: str) -> str:
        """Estimate query complexity."""
        query_lower = query.lower()
        
        complexity_score = 0
        
        # Count complexity indicators
        complexity_score += query_lower.count("join") * 2
        complexity_score += query_lower.count("subquery") * 3
        complexity_score += query_lower.count("union") * 2
        complexity_score += query_lower.count("order by") * 1
        complexity_score += query_lower.count("group by") * 1
        
        if complexity_score == 0:
            return "simple"
        elif complexity_score <= 3:
            return "moderate"
        else:
            return "complex"


class DatabaseOptimizer:
    """Main database performance optimizer."""
    
    def __init__(self, database_path: str, config: Dict[str, Any]):
        self.database_path = database_path
        self.config = config
        
        self.connection_pool = DatabaseConnectionPool(
            database_path=database_path,
            max_connections=config.get("max_connections", 10)
        )
        
        self.query_cache = QueryCache(
            max_size=config.get("cache_size", 1000),
            ttl=config.get("cache_ttl", 300)
        )
        
        self.query_optimizer = QueryOptimizer()
        self._optimization_enabled = config.get("enable_optimization", True)
    
    def execute_optimized(self, query: str, params: Optional[Tuple] = None) -> List[Dict[str, Any]]:
        """Execute query with optimization."""
        if not self._optimization_enabled:
            return self._execute_direct(query, params)
        
        # Generate cache key
        cache_key = self._generate_cache_key(query, params)
        
        # Check cache first
        cached_result = self.query_cache.get(cache_key)
        if cached_result is not None:
            self.query_optimizer.record_query_execution(query, 0.0, cached=True)
            logger.debug(f"Cache hit for query: {query[:50]}...")
            return cached_result
        
        # Analyze query
        analysis = self.query_optimizer.analyze_query(query)
        if analysis["suggestions"]:
            logger.debug(f"Query optimization suggestions: {analysis['suggestions']}")
        
        # Execute query
        start_time = time.time()
        try:
            result = self._execute_direct(query, params)
            execution_time = time.time() - start_time
            
            # Cache result if it's cacheable
            if self._is_cacheable_query(query):
                self.query_cache.set(cache_key, result)
            
            # Record statistics
            self.query_optimizer.record_query_execution(query, execution_time)
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            self.query_optimizer.record_query_execution(query, execution_time)
            logger.error(f"Query execution error: {e}")
            raise
    
    def _execute_direct(self, query: str, params: Optional[Tuple] = None) -> List[Dict[str, Any]]:
        """Execute query directly without optimization."""
        with self.connection_pool.get_connection() as conn:
            cursor = conn.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            # Convert rows to dictionaries
            columns = [description[0] for description in cursor.description] if cursor.description else []
            rows = cursor.fetchall()
            
            return [dict(zip(columns, row)) for row in rows]
    
    def _generate_cache_key(self, query: str, params: Optional[Tuple] = None) -> str:
        """Generate cache key for query and parameters."""
        key_data = {"query": query.strip(), "params": params or ()}
        key_str = json.dumps(key_data, sort_keys=True)
        return hashlib.sha256(key_str.encode()).hexdigest()
    
    def _is_cacheable_query(self, query: str) -> bool:
        """Determine if query results should be cached."""
        query_lower = query.lower().strip()
        
        # Don't cache write operations
        if any(op in query_lower for op in ["insert", "update", "delete", "create", "drop", "alter"]):
            return False
        
        # Don't cache queries with time-sensitive functions
        if any(func in query_lower for func in ["now()", "current_timestamp", "random()"]):
            return False
        
        return True
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get database performance statistics."""
        return {
            "connection_pool": {
                "max_connections": self.connection_pool.max_connections,
                "active_connections": len(self.connection_pool._in_use),
                "available_connections": len(self.connection_pool._pool)
            },
            "query_cache": self.query_cache.get_stats(),
            "slow_queries": [
                {
                    "query_hash": stats.query_hash,
                    "avg_time": stats.avg_time,
                    "execution_count": stats.execution_count,
                    "cache_hits": stats.cache_hits
                }
                for _, stats in self.query_optimizer.get_slow_queries(0.5)[:10]
            ],
            "optimization_enabled": self._optimization_enabled
        }
    
    def optimize_database(self):
        """Perform database optimization tasks."""
        with self.connection_pool.get_connection() as conn:
            # Analyze database
            conn.execute("ANALYZE")
            
            # Vacuum if needed (for SQLite)
            conn.execute("VACUUM")
            
            logger.info("Database optimization completed")
    
    def close(self):
        """Close database optimizer and cleanup resources."""
        self.connection_pool.close_all()


# Global database optimizer instances
_database_optimizers: Dict[str, DatabaseOptimizer] = {}


def get_database_optimizer(database_path: str, config: Optional[Dict[str, Any]] = None) -> DatabaseOptimizer:
    """Get database optimizer instance for a specific database."""
    if database_path not in _database_optimizers:
        default_config = {
            "max_connections": 10,
            "cache_size": 1000,
            "cache_ttl": 300,
            "enable_optimization": True
        }
        if config:
            default_config.update(config)
        
        _database_optimizers[database_path] = DatabaseOptimizer(database_path, default_config)
    
    return _database_optimizers[database_path]
