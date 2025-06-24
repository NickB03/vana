"""
Memory API for VANA Dashboard

This module provides functions to retrieve memory usage data from the VANA system.
"""

import datetime
import logging
import os
import random
import sys

# Add the parent directory to the path so we can import our modules
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

logger = logging.getLogger(__name__)


def get_memory_usage():
    """
    Retrieve memory usage data for the VANA system.
    Returns mock data for development purposes.
    """
    try:
        # In real implementation, this would call an actual API endpoint
        return generate_mock_memory_data()
    except Exception as e:
        logging.error(f"Error fetching memory usage data: {e}")
        return generate_mock_memory_data()


def generate_mock_memory_data():
    """Generate realistic mock memory usage data."""
    # Generate vector search data
    vector_search = {
        "total_entries": random.randint(1000, 10000),
        "size_mb": round(random.uniform(50, 500), 1),
        "query_count_24h": random.randint(100, 2000),
        "average_latency_ms": round(random.uniform(50, 200), 1),
        "index_type": "HNSW",
        "dimensions": 1536,
        "cache_hit_rate": round(random.uniform(0.6, 0.9), 2),
    }

    # Generate knowledge graph data
    knowledge_graph = {
        "entity_count": random.randint(5000, 20000),
        "relationship_count": random.randint(10000, 50000),
        "size_mb": round(random.uniform(20, 300), 1),
        "query_count_24h": random.randint(50, 1000),
        "average_latency_ms": round(random.uniform(30, 150), 1),
        "entity_types": ["Person", "Organization", "Concept", "Document", "Event"],
        "relationship_types": [
            "KNOWS",
            "PART_OF",
            "RELATES_TO",
            "CREATED_BY",
            "MENTIONS",
        ],
    }

    # Generate cache data
    cache = {
        "entries": random.randint(100, 2000),
        "hit_rate": round(random.uniform(0.5, 0.95), 2),
        "size_mb": round(random.uniform(10, 100), 1),
        "evictions_24h": random.randint(10, 200),
        "max_size_mb": 200,
        "average_access_time_ms": round(random.uniform(1, 10), 1),
    }

    # Generate hybrid search data
    hybrid_search = {
        "query_count_24h": random.randint(50, 500),
        "average_latency_ms": round(random.uniform(100, 300), 1),
        "vector_contribution": round(random.uniform(0.3, 0.7), 2),
        "graph_contribution": round(random.uniform(0.3, 0.7), 2),
    }

    return {
        "vector_search": vector_search,
        "knowledge_graph": knowledge_graph,
        "cache": cache,
        "hybrid_search": hybrid_search,
    }


def get_memory_metrics_history(hours=24):
    """
    Get historical memory metrics for the VANA system.
    Returns mock data for development purposes.
    """
    try:
        return generate_mock_memory_history(hours)
    except Exception as e:
        logging.error(f"Error fetching memory history data: {e}")
        return generate_mock_memory_history(hours)


def generate_mock_memory_history(hours=24):
    """Generate realistic mock historical memory data."""
    current_time = datetime.datetime.now()
    history = []

    # Starting values
    vector_size = 200
    graph_size = 100
    cache_size = 30
    vector_entries = 5000
    graph_entities = 10000
    graph_relationships = 25000

    # Generate data points for each hour
    for hour in range(hours, 0, -1):
        timestamp = current_time - datetime.timedelta(hours=hour)

        # Add some random growth to the metrics
        vector_size += random.uniform(-5, 15)
        graph_size += random.uniform(-3, 10)
        cache_size += random.uniform(-2, 5)
        vector_entries += random.randint(-50, 200)
        graph_entities += random.randint(-30, 150)
        graph_relationships += random.randint(-100, 400)

        # Ensure values stay reasonable
        vector_size = max(50, min(1000, vector_size))
        graph_size = max(20, min(500, graph_size))
        cache_size = max(10, min(200, cache_size))
        vector_entries = max(1000, vector_entries)
        graph_entities = max(5000, graph_entities)
        graph_relationships = max(10000, graph_relationships)

        # Create data point
        data_point = {
            "timestamp": timestamp.isoformat(),
            "vector_search": {
                "size_mb": round(vector_size, 1),
                "total_entries": int(vector_entries),
                "query_count": random.randint(5, 100),
                "latency_ms": round(random.uniform(50, 200), 1),
            },
            "knowledge_graph": {
                "size_mb": round(graph_size, 1),
                "entity_count": int(graph_entities),
                "relationship_count": int(graph_relationships),
                "query_count": random.randint(3, 50),
                "latency_ms": round(random.uniform(30, 150), 1),
            },
            "cache": {
                "size_mb": round(cache_size, 1),
                "entries": random.randint(100, 1000),
                "hit_rate": round(random.uniform(0.5, 0.95), 2),
            },
        }

        history.append(data_point)

    return history


def get_recent_queries(limit=10):
    """
    Get recent memory queries for the VANA system.
    Returns mock data for development purposes.
    """
    try:
        return generate_mock_recent_queries(limit)
    except Exception as e:
        logging.error(f"Error fetching recent queries data: {e}")
        return generate_mock_recent_queries(limit)


def generate_mock_recent_queries(limit=10):
    """Generate realistic mock recent query data."""
    current_time = datetime.datetime.now()

    # Query templates
    query_templates = [
        "Find information about {topic}",
        "What do we know about {topic}?",
        "Retrieve context related to {topic}",
        "Get details on {topic}",
        "Find entities related to {topic}",
    ]

    # Possible topics
    topics = [
        "machine learning",
        "natural language processing",
        "vector databases",
        "knowledge graphs",
        "agent architectures",
        "memory systems",
        "context management",
        "ADK integration",
        "specialist agents",
        "team coordination",
        "workflow automation",
    ]

    # Generate queries
    queries = []
    for i in range(limit):
        minutes_ago = random.randint(1, 60 * 24)  # Within last 24 hours
        timestamp = current_time - datetime.timedelta(minutes=minutes_ago)

        # Generate query
        template = random.choice(query_templates)
        topic = random.choice(topics)
        query_text = template.format(topic=topic)

        # Generate result data
        result_count = random.randint(0, 20)
        duration_ms = random.randint(50, 500)

        # Determine search type
        search_type = random.choice(["vector", "graph", "hybrid"])

        # Create query object
        query = {
            "id": f"q-{i + 1}",
            "timestamp": timestamp.isoformat(),
            "query": query_text,
            "search_type": search_type,
            "result_count": result_count,
            "duration_ms": duration_ms,
            "successful": random.random() > 0.1,  # 90% success rate
        }

        queries.append(query)

    # Sort by timestamp (most recent first)
    queries.sort(key=lambda q: q["timestamp"], reverse=True)

    return queries


# Create a simple API object for compatibility
class MemoryAPI:
    """Memory API class for dashboard integration."""

    def get_usage(self):
        return get_memory_usage()

    def get_history(self, hours=24):
        return get_memory_metrics_history(hours)

    def get_recent_queries(self, limit=10):
        return get_recent_queries(limit)


# Create the API instance
memory_api = MemoryAPI()
