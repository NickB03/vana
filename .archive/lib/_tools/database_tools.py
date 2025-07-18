"""
Database Tools for VANA
Demonstrates usage of connection pooling for efficient database operations
"""

import json
from contextlib import contextmanager
from typing import Any, Dict, List, Optional

from lib._shared_libraries.db_connection_pool import get_connection_manager, get_db_connection
from lib._shared_libraries.redis_cache_service import redis_cache
from lib.logging_config import get_logger

logger = get_logger("vana.database_tools")


@redis_cache(namespace="db_query", ttl=300)  # Cache for 5 minutes
def execute_query(query: str, params: Optional[List[Any]] = None) -> List[Dict[str, Any]]:
    """
    Execute a database query with connection pooling and caching

    Args:
        query: SQL query to execute
        params: Query parameters for safe parameterized queries

    Returns:
        List of result rows as dictionaries
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params or [])

                # For SELECT queries, fetch results
                if query.strip().upper().startswith("SELECT"):
                    columns = [desc[0] for desc in cursor.description]
                    results = []
                    for row in cursor.fetchall():
                        results.append(dict(zip(columns, row)))
                    return results
                else:
                    # For INSERT/UPDATE/DELETE, return affected rows
                    conn.commit()
                    return [{"affected_rows": cursor.rowcount}]

    except Exception as e:
        logger.error(f"Database query error: {e}")
        return [{"error": str(e)}]


def batch_insert(table: str, data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Efficiently insert multiple rows using connection pooling

    Args:
        table: Table name
        data: List of dictionaries containing row data

    Returns:
        Insert statistics
    """
    if not data:
        return {"inserted": 0, "errors": 0}

    # Get column names from first row
    columns = list(data[0].keys())
    placeholders = ", ".join(["%s"] * len(columns))
    query = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})"

    inserted = 0
    errors = 0

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Use executemany for efficient batch insert
                values = [tuple(row.get(col) for col in columns) for row in data]
                cursor.executemany(query, values)
                conn.commit()
                inserted = cursor.rowcount

    except Exception as e:
        logger.error(f"Batch insert error: {e}")
        errors = len(data)

    return {"table": table, "attempted": len(data), "inserted": inserted, "errors": errors}


def analyze_table_performance(table: str) -> Dict[str, Any]:
    """
    Analyze table performance and suggest optimizations

    Args:
        table: Table name to analyze

    Returns:
        Performance analysis and recommendations
    """
    analysis = {"table": table, "row_count": 0, "indexes": [], "recommendations": []}

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                analysis["row_count"] = cursor.fetchone()[0]

                # Get indexes (PostgreSQL specific)
                cursor.execute(
                    """
                    SELECT indexname, indexdef 
                    FROM pg_indexes 
                    WHERE tablename = %s
                """,
                    [table],
                )

                for row in cursor.fetchall():
                    analysis["indexes"].append({"name": row[0], "definition": row[1]})

                # Get table size
                cursor.execute(
                    """
                    SELECT pg_size_pretty(pg_total_relation_size(%s::regclass))
                """,
                    [table],
                )
                analysis["size"] = cursor.fetchone()[0]

                # Recommendations based on analysis
                if analysis["row_count"] > 10000 and len(analysis["indexes"]) < 2:
                    analysis["recommendations"].append("Consider adding indexes for frequently queried columns")

                if analysis["row_count"] > 100000:
                    analysis["recommendations"].append("Consider partitioning for large tables")

    except Exception as e:
        logger.error(f"Table analysis error: {e}")
        analysis["error"] = str(e)

    return analysis


def get_pool_statistics() -> Dict[str, Any]:
    """
    Get connection pool statistics

    Returns:
        Pool statistics for all configured pools
    """
    manager = get_connection_manager()
    return manager.get_all_stats()


def optimize_query(query: str) -> Dict[str, Any]:
    """
    Analyze and optimize a SQL query

    Args:
        query: SQL query to optimize

    Returns:
        Query analysis and optimization suggestions
    """
    optimization = {"original_query": query, "suggestions": [], "estimated_cost": None}

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Get query execution plan
                cursor.execute(f"EXPLAIN ANALYZE {query}")
                plan = cursor.fetchall()

                # Parse execution plan for insights
                plan_text = "\n".join([row[0] for row in plan])
                optimization["execution_plan"] = plan_text

                # Extract cost estimates
                if "cost=" in plan_text:
                    import re

                    costs = re.findall(r"cost=(\d+\.\d+)\.\.(\d+\.\d+)", plan_text)
                    if costs:
                        optimization["estimated_cost"] = float(costs[0][1])

                # Provide optimization suggestions
                if "Seq Scan" in plan_text and optimization.get("estimated_cost", 0) > 1000:
                    optimization["suggestions"].append(
                        "Sequential scan detected on large table - consider adding an index"
                    )

                if "Nested Loop" in plan_text and "rows=" in plan_text:
                    rows_match = re.search(r"rows=(\d+)", plan_text)
                    if rows_match and int(rows_match.group(1)) > 1000:
                        optimization["suggestions"].append("Nested loop on large result set - consider using hash join")

    except Exception as e:
        logger.error(f"Query optimization error: {e}")
        optimization["error"] = str(e)

    return optimization


def create_connection_pool(
    name: str,
    host: str,
    port: int,
    database: str,
    user: str,
    password: str,
    min_connections: int = 2,
    max_connections: int = 20,
) -> Dict[str, Any]:
    """
    Create a new named connection pool

    Args:
        name: Pool name
        host: Database host
        port: Database port
        database: Database name
        user: Database user
        password: Database password
        min_connections: Minimum pool size
        max_connections: Maximum pool size

    Returns:
        Pool creation status
    """
    try:
        manager = get_connection_manager()
        config = {
            "host": host,
            "port": port,
            "database": database,
            "user": user,
            "password": password,
            "min_connections": min_connections,
            "max_connections": max_connections,
        }

        pool = manager.create_pool(name, config)

        return {
            "status": "success",
            "pool_name": name,
            "configuration": {
                "host": f"{host}:{port}",
                "database": database,
                "pool_size": f"{min_connections}-{max_connections}",
            },
        }

    except Exception as e:
        logger.error(f"Pool creation error: {e}")
        return {"status": "error", "error": str(e)}


# Export public functions
__all__ = [
    "execute_query",
    "batch_insert",
    "analyze_table_performance",
    "get_pool_statistics",
    "optimize_query",
    "create_connection_pool",
]
