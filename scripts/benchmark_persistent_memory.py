#!/usr/bin/env python3
"""
Benchmark Persistent Memory Performance

This script benchmarks the performance of the persistent memory system by:
1. Measuring the time to initialize the memory manager
2. Measuring the time to store entities
3. Measuring the time to retrieve entities
4. Measuring the time to perform delta synchronization
5. Measuring the time to perform hybrid search

Usage:
    python scripts/benchmark_persistent_memory.py
"""

import os
import sys
import time
import logging
import asyncio
import statistics
from datetime import datetime
from dotenv import load_dotenv

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

# Load environment variables
load_dotenv()

# Import the memory components
from tools.mcp_memory_client_mock import MockMCPMemoryClient
from tools.memory_manager import MemoryManager
from tools.hybrid_search_delta import HybridSearchDelta
from tools.memory_cache import MemoryCache
from tools.entity_scorer import EntityScorer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# Define test data
TEST_ENTITIES = [
    {
        "name": "Project VANA",
        "type": "Project",
        "observations": [
            "VANA is a versatile agent network architecture",
            "VANA uses Vector Search, Knowledge Graph, and Web Search for knowledge retrieval",
            "VANA has a primary agent named Vana with specialist sub-agents"
        ]
    },
    {
        "name": "Vector Search",
        "type": "Technology",
        "observations": [
            "Vector Search is a semantic search technology",
            "Vector Search uses embeddings to find similar content",
            "Vector Search is implemented using Vertex AI"
        ]
    },
    {
        "name": "Knowledge Graph",
        "type": "Technology",
        "observations": [
            "Knowledge Graph is a structured knowledge representation",
            "Knowledge Graph stores entities and relationships",
            "Knowledge Graph is implemented using MCP"
        ]
    },
    {
        "name": "Web Search",
        "type": "Technology",
        "observations": [
            "Web Search retrieves up-to-date information from the internet",
            "Web Search is implemented using Google Custom Search API",
            "Web Search complements Vector Search and Knowledge Graph"
        ]
    },
    {
        "name": "Persistent Memory",
        "type": "Technology",
        "observations": [
            "Persistent Memory allows VANA to maintain context across sessions",
            "Persistent Memory uses delta-based updates for efficiency",
            "Persistent Memory combines Vector Search and Knowledge Graph"
        ]
    }
]

TEST_RELATIONSHIPS = [
    {"from": "Project VANA", "relationship": "uses", "to": "Vector Search"},
    {"from": "Project VANA", "relationship": "uses", "to": "Knowledge Graph"},
    {"from": "Project VANA", "relationship": "uses", "to": "Web Search"},
    {"from": "Project VANA", "relationship": "uses", "to": "Persistent Memory"},
    {"from": "Persistent Memory", "relationship": "integrates", "to": "Vector Search"},
    {"from": "Persistent Memory", "relationship": "integrates", "to": "Knowledge Graph"}
]

TEST_QUERIES = [
    "What is VANA?",
    "How does Vector Search work?",
    "What is Knowledge Graph?",
    "How does Web Search work?",
    "What is Persistent Memory?",
    "How does VANA use Vector Search?",
    "How does Persistent Memory integrate with Knowledge Graph?",
    "What technologies does VANA use?",
    "What is the architecture of VANA?",
    "How does VANA maintain context across sessions?"
]

def measure_time(func, *args, **kwargs):
    """Measure the execution time of a function"""
    start_time = time.time()
    result = func(*args, **kwargs)
    end_time = time.time()
    return result, end_time - start_time

async def measure_time_async(func, *args, **kwargs):
    """Measure the execution time of an async function"""
    start_time = time.time()
    result = await func(*args, **kwargs)
    end_time = time.time()
    return result, end_time - start_time

def benchmark_initialization():
    """Benchmark the initialization of the memory manager"""
    logger.info("Benchmarking initialization...")

    # Create mock client
    client = MockMCPMemoryClient(
        endpoint="https://mcp.community.augment.co",
        namespace="vana-project",
        api_key="test_api_key"
    )

    # Measure initialization time
    _, init_time = measure_time(
        lambda: MemoryManager(client).initialize()
    )

    logger.info(f"Initialization time: {init_time:.4f} seconds")
    return init_time

def benchmark_entity_storage(client):
    """Benchmark entity storage"""
    logger.info("Benchmarking entity storage...")

    # Store test entities
    storage_times = []
    for entity in TEST_ENTITIES:
        _, storage_time = measure_time(
            client.store_entity,
            entity["name"],
            entity["type"],
            entity["observations"]
        )
        storage_times.append(storage_time)

    # Calculate statistics
    avg_time = statistics.mean(storage_times)
    min_time = min(storage_times)
    max_time = max(storage_times)

    logger.info(f"Entity storage time (avg): {avg_time:.4f} seconds")
    logger.info(f"Entity storage time (min): {min_time:.4f} seconds")
    logger.info(f"Entity storage time (max): {max_time:.4f} seconds")

    return avg_time, min_time, max_time

def benchmark_relationship_creation(client):
    """Benchmark relationship creation"""
    logger.info("Benchmarking relationship creation...")

    # Create test relationships
    relationship_times = []
    for rel in TEST_RELATIONSHIPS:
        _, rel_time = measure_time(
            client.create_relationship,
            rel["from"],
            rel["relationship"],
            rel["to"]
        )
        relationship_times.append(rel_time)

    # Calculate statistics
    avg_time = statistics.mean(relationship_times)
    min_time = min(relationship_times)
    max_time = max(relationship_times)

    logger.info(f"Relationship creation time (avg): {avg_time:.4f} seconds")
    logger.info(f"Relationship creation time (min): {min_time:.4f} seconds")
    logger.info(f"Relationship creation time (max): {max_time:.4f} seconds")

    return avg_time, min_time, max_time

def benchmark_delta_sync(memory_manager):
    """Benchmark delta synchronization"""
    logger.info("Benchmarking delta synchronization...")

    # Perform delta sync
    _, sync_time = measure_time(memory_manager.sync)

    logger.info(f"Delta sync time: {sync_time:.4f} seconds")
    return sync_time

async def benchmark_hybrid_search(hybrid_search):
    """Benchmark hybrid search"""
    logger.info("Benchmarking hybrid search...")

    # Perform hybrid search for test queries
    search_times = []
    for query in TEST_QUERIES:
        _, search_time = await measure_time_async(
            hybrid_search.search,
            query
        )
        search_times.append(search_time)

    # Calculate statistics
    avg_time = statistics.mean(search_times)
    min_time = min(search_times)
    max_time = max(search_times)

    logger.info(f"Hybrid search time (avg): {avg_time:.4f} seconds")
    logger.info(f"Hybrid search time (min): {min_time:.4f} seconds")
    logger.info(f"Hybrid search time (max): {max_time:.4f} seconds")

    return avg_time, min_time, max_time

def benchmark_memory_cache():
    """Benchmark memory cache operations"""
    logger.info("Benchmarking memory cache operations...")

    # Create memory cache
    cache = MemoryCache(max_size=1000, ttl=3600)

    # Benchmark set operations
    set_times = []
    for i in range(100):
        key = f"key_{i}"
        value = {"id": i, "name": f"Entity {i}", "data": "x" * 1000}
        _, set_time = measure_time(cache.set, key, value)
        set_times.append(set_time)

    # Benchmark get operations
    get_times = []
    for i in range(100):
        key = f"key_{i}"
        _, get_time = measure_time(cache.get, key)
        get_times.append(get_time)

    # Calculate statistics
    avg_set_time = statistics.mean(set_times)
    avg_get_time = statistics.mean(get_times)

    logger.info(f"Cache set time (avg): {avg_set_time:.6f} seconds")
    logger.info(f"Cache get time (avg): {avg_get_time:.6f} seconds")

    return avg_set_time, avg_get_time

def benchmark_entity_scoring():
    """Benchmark entity scoring"""
    logger.info("Benchmarking entity scoring...")

    # Create entity scorer
    scorer = EntityScorer()

    # Create test entities with timestamps
    test_entities = []
    for i in range(100):
        # Create entities with different ages
        days_ago = i % 30
        # Use timedelta to properly handle date arithmetic
        from datetime import timedelta
        timestamp = (datetime.now() - timedelta(days=days_ago)).isoformat()

        entity = {
            "id": f"entity_{i}",
            "name": f"Entity {i}",
            "type": "TestType",
            "createdAt": timestamp,
            "updatedAt": timestamp,
            "accessCount": i % 10
        }
        test_entities.append(entity)

    # Benchmark scoring operations
    score_times = []
    for entity in test_entities:
        _, score_time = measure_time(scorer.score_entity, entity)
        score_times.append(score_time)

    # Calculate statistics
    avg_score_time = statistics.mean(score_times)

    logger.info(f"Entity scoring time (avg): {avg_score_time:.6f} seconds")

    return avg_score_time

async def main():
    """Main function to run benchmarks"""
    logger.info("Starting persistent memory benchmarks")

    # Benchmark initialization
    init_time = benchmark_initialization()

    # Create components for other benchmarks
    client = MockMCPMemoryClient(
        endpoint="https://mcp.community.augment.co",
        namespace="vana-project",
        api_key="test_api_key"
    )

    memory_manager = MemoryManager(client)
    memory_manager.initialize()

    hybrid_search = HybridSearchDelta(memory_manager)

    # Run benchmarks
    entity_times = benchmark_entity_storage(client)
    relationship_times = benchmark_relationship_creation(client)
    sync_time = benchmark_delta_sync(memory_manager)
    search_times = await benchmark_hybrid_search(hybrid_search)
    cache_times = benchmark_memory_cache()
    score_time = benchmark_entity_scoring()

    # Print summary
    logger.info("\nBenchmark Summary:")
    logger.info(f"Initialization time: {init_time:.4f} seconds")
    logger.info(f"Entity storage time (avg): {entity_times[0]:.4f} seconds")
    logger.info(f"Relationship creation time (avg): {relationship_times[0]:.4f} seconds")
    logger.info(f"Delta sync time: {sync_time:.4f} seconds")
    logger.info(f"Hybrid search time (avg): {search_times[0]:.4f} seconds")
    logger.info(f"Cache set time (avg): {cache_times[0]:.6f} seconds")
    logger.info(f"Cache get time (avg): {cache_times[1]:.6f} seconds")
    logger.info(f"Entity scoring time (avg): {score_time:.6f} seconds")

    logger.info("Persistent memory benchmarks completed")
    return True

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
