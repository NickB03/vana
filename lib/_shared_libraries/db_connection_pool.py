"""
Database Connection Pool Service for VANA
Provides efficient connection pooling for PostgreSQL and other databases
"""

import os
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass
from queue import Empty, Full, Queue
from typing import Any, Dict, Optional, Union

import psycopg2
from psycopg2 import pool

from lib.logging_config import get_logger

logger = get_logger("vana.db_connection_pool")


@dataclass
class PoolConfig:
    """Configuration for database connection pool"""

    min_connections: int = 2
    max_connections: int = 20
    host: str = "localhost"
    port: int = 5432
    database: str = "vana"
    user: str = "vana"
    password: str = ""
    connect_timeout: int = 5
    max_overflow: int = 10
    pool_recycle: int = 3600  # Recycle connections after 1 hour
    pool_pre_ping: bool = True  # Test connections before use


class ConnectionPool:
    """Thread-safe database connection pool"""

    def __init__(self, config: PoolConfig):
        self.config = config
        self._pool = None
        self._overflow_connections = Queue(maxsize=config.max_overflow)
        self._active_connections = 0
        self._lock = threading.Lock()
        self._stats = {
            "connections_created": 0,
            "connections_recycled": 0,
            "connections_failed": 0,
            "pool_exhausted_count": 0,
            "total_requests": 0,
            "successful_requests": 0,
        }
        self._connection_timestamps = {}

        # Initialize the pool
        self._initialize_pool()

    def _initialize_pool(self):
        """Initialize the connection pool"""
        try:
            # Create PostgreSQL connection pool
            self._pool = psycopg2.pool.ThreadedConnectionPool(
                self.config.min_connections,
                self.config.max_connections,
                host=self.config.host,
                port=self.config.port,
                database=self.config.database,
                user=self.config.user,
                password=self.config.password,
                connect_timeout=self.config.connect_timeout,
            )
            logger.info(
                f"✅ Database connection pool initialized ({self.config.min_connections}-{self.config.max_connections} connections)"
            )
            self._stats["connections_created"] = self.config.min_connections
        except Exception as e:
            logger.error(f"❌ Failed to initialize connection pool: {e}")
            self._pool = None

    @contextmanager
    def get_connection(self):
        """
        Get a connection from the pool

        Yields:
            Database connection
        """
        self._stats["total_requests"] += 1
        connection = None
        from_overflow = False

        try:
            # Try to get from main pool
            if self._pool:
                connection = self._pool.getconn()

                # Check if connection needs recycling
                if self.config.pool_recycle > 0:
                    conn_id = id(connection)
                    if conn_id in self._connection_timestamps:
                        age = time.time() - self._connection_timestamps[conn_id]
                        if age > self.config.pool_recycle:
                            logger.debug(f"Recycling connection (age: {age:.0f}s)")
                            self._pool.putconn(connection, close=True)
                            connection = self._pool.getconn()
                            self._stats["connections_recycled"] += 1
                    self._connection_timestamps[conn_id] = time.time()

                # Test connection if configured
                if self.config.pool_pre_ping:
                    try:
                        with connection.cursor() as cursor:
                            cursor.execute("SELECT 1")
                    except:
                        # Connection is bad, get a new one
                        self._pool.putconn(connection, close=True)
                        connection = self._pool.getconn()

            # If main pool exhausted, try overflow
            if connection is None and self.config.max_overflow > 0:
                try:
                    # Try to get from overflow queue
                    connection = self._overflow_connections.get_nowait()
                    from_overflow = True
                except Empty:
                    # Create new overflow connection if under limit
                    with self._lock:
                        if self._active_connections < (self.config.max_connections + self.config.max_overflow):
                            connection = self._create_connection()
                            from_overflow = True
                            self._active_connections += 1
                        else:
                            self._stats["pool_exhausted_count"] += 1
                            raise Exception("Connection pool exhausted")

            if connection:
                self._stats["successful_requests"] += 1
                yield connection
            else:
                raise Exception("No connection available")

        except Exception as e:
            logger.error(f"Connection pool error: {e}")
            self._stats["connections_failed"] += 1
            raise

        finally:
            # Return connection to pool
            if connection:
                if from_overflow:
                    # Return to overflow queue or close if full
                    try:
                        self._overflow_connections.put_nowait(connection)
                    except Full:
                        connection.close()
                        with self._lock:
                            self._active_connections -= 1
                else:
                    # Return to main pool
                    if self._pool:
                        self._pool.putconn(connection)

    def _create_connection(self):
        """Create a new database connection"""
        connection = psycopg2.connect(
            host=self.config.host,
            port=self.config.port,
            database=self.config.database,
            user=self.config.user,
            password=self.config.password,
            connect_timeout=self.config.connect_timeout,
        )
        self._stats["connections_created"] += 1
        return connection

    def close_all(self):
        """Close all connections in the pool"""
        if self._pool:
            self._pool.closeall()
            logger.info("All database connections closed")

        # Close overflow connections
        while not self._overflow_connections.empty():
            try:
                conn = self._overflow_connections.get_nowait()
                conn.close()
            except Empty:
                break

    def get_stats(self) -> Dict[str, Any]:
        """Get pool statistics"""
        stats = self._stats.copy()

        if self._pool:
            # Get pool status from psycopg2
            stats.update(
                {
                    "pool_size": self.config.max_connections,
                    "overflow_size": self._overflow_connections.qsize(),
                    "max_overflow": self.config.max_overflow,
                    "active_connections": self._active_connections,
                }
            )

        # Calculate success rate
        if stats["total_requests"] > 0:
            stats["success_rate"] = (stats["successful_requests"] / stats["total_requests"]) * 100
        else:
            stats["success_rate"] = 0.0

        return stats


class DatabaseConnectionManager:
    """Manager for multiple database connection pools"""

    def __init__(self):
        self.pools: Dict[str, ConnectionPool] = {}
        self._lock = threading.Lock()

    def create_pool(self, name: str, config: Union[PoolConfig, Dict[str, Any]]) -> ConnectionPool:
        """
        Create a named connection pool

        Args:
            name: Pool name
            config: Pool configuration

        Returns:
            Created connection pool
        """
        if isinstance(config, dict):
            config = PoolConfig(**config)

        with self._lock:
            if name in self.pools:
                logger.warning(f"Pool '{name}' already exists, replacing")
                self.pools[name].close_all()

            pool = ConnectionPool(config)
            self.pools[name] = pool
            return pool

    def get_pool(self, name: str = "default") -> Optional[ConnectionPool]:
        """Get a connection pool by name"""
        return self.pools.get(name)

    @contextmanager
    def get_connection(self, pool_name: str = "default"):
        """Get a connection from a named pool"""
        pool = self.get_pool(pool_name)
        if not pool:
            raise ValueError(f"Pool '{pool_name}' not found")

        with pool.get_connection() as conn:
            yield conn

    def close_all_pools(self):
        """Close all connection pools"""
        with self._lock:
            for name, pool in self.pools.items():
                logger.info(f"Closing pool '{name}'")
                pool.close_all()
            self.pools.clear()

    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all pools"""
        stats = {}
        for name, pool in self.pools.items():
            stats[name] = pool.get_stats()
        return stats


# Global connection manager
_connection_manager = None


def get_connection_manager() -> DatabaseConnectionManager:
    """Get or create global connection manager"""
    global _connection_manager
    if _connection_manager is None:
        _connection_manager = DatabaseConnectionManager()

        # Create default pool from environment variables
        config = PoolConfig(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "5432")),
            database=os.getenv("DB_NAME", "vana"),
            user=os.getenv("DB_USER", "vana"),
            password=os.getenv("DB_PASSWORD", ""),
            min_connections=int(os.getenv("DB_POOL_MIN", "2")),
            max_connections=int(os.getenv("DB_POOL_MAX", "20")),
        )

        try:
            _connection_manager.create_pool("default", config)
        except Exception as e:
            logger.warning(f"Failed to create default pool: {e}")

    return _connection_manager


# Convenience function for getting connections
@contextmanager
def get_db_connection(pool_name: str = "default"):
    """
    Get a database connection from the pool

    Args:
        pool_name: Name of the connection pool

    Yields:
        Database connection
    """
    manager = get_connection_manager()
    with manager.get_connection(pool_name) as conn:
        yield conn


# Export public API
__all__ = ["PoolConfig", "ConnectionPool", "DatabaseConnectionManager", "get_connection_manager", "get_db_connection"]
