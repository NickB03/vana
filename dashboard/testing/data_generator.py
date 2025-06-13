"""
VANA Dashboard Data Generators

Provides dedicated data generators for agent, memory, system, and task APIs.
Supports scenario-based mock data for edge cases and stress tests.
"""

import datetime
import random
import string
from typing import Any, Dict, List


def random_string(length=8):
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))


def generate_agent_status(num_agents=5) -> List[Dict[str, Any]]:
    agents = []
    for i in range(num_agents):
        agent = {
            "id": f"agent_{i+1}",
            "name": f"Agent {i+1}",
            "status": random.choice(["online", "offline", "degraded"]),
            "response_time_ms": random.randint(50, 500),
            "activity": random.choice(["idle", "processing", "error"]),
            "last_active": (datetime.datetime.now() - datetime.timedelta(seconds=random.randint(0, 3600))).isoformat(),
        }
        agents.append(agent)
    return agents


def generate_memory_usage(num_components=3) -> List[Dict[str, Any]]:
    components = []
    for i in range(num_components):
        component = {
            "name": random.choice(["vector_search", "knowledge_graph", "cache"]),
            "usage_mb": random.randint(100, 2048),
            "capacity_mb": 2048,
            "queries": random.randint(10, 1000),
            "errors": random.randint(0, 5),
            "last_query": (datetime.datetime.now() - datetime.timedelta(seconds=random.randint(0, 600))).isoformat(),
        }
        components.append(component)
    return components


def generate_system_health() -> Dict[str, Any]:
    return {
        "cpu_usage": round(random.uniform(10, 90), 2),
        "memory_usage": round(random.uniform(20, 95), 2),
        "disk_usage": round(random.uniform(30, 99), 2),
        "network_in": random.randint(100, 10000),
        "network_out": random.randint(100, 10000),
        "services": [
            {"name": "api", "status": random.choice(["running", "stopped", "degraded"])},
            {"name": "db", "status": random.choice(["running", "stopped", "degraded"])},
            {"name": "vector_search", "status": random.choice(["running", "stopped", "degraded"])},
        ],
        "timestamp": datetime.datetime.now().isoformat(),
    }


def generate_task_execution(num_tasks=10) -> List[Dict[str, Any]]:
    tasks = []
    for i in range(num_tasks):
        task = {
            "id": f"task_{i+1}",
            "type": random.choice(["ingest", "query", "maintenance", "alert"]),
            "status": random.choice(["pending", "running", "completed", "failed"]),
            "start_time": (datetime.datetime.now() - datetime.timedelta(seconds=random.randint(0, 7200))).isoformat(),
            "duration_sec": random.randint(1, 600),
            "agent_id": f"agent_{random.randint(1, 5)}",
        }
        tasks.append(task)
    return tasks


def generate_scenario(scenario: str) -> Dict[str, Any]:
    """
    Generate a mock data scenario for edge case or stress test.
    """
    if scenario == "high_load":
        return {
            "agents": generate_agent_status(num_agents=20),
            "memory": generate_memory_usage(num_components=5),
            "system": generate_system_health(),
            "tasks": generate_task_execution(num_tasks=50),
        }
    elif scenario == "degraded_services":
        sys = generate_system_health()
        for svc in sys["services"]:
            svc["status"] = "degraded"
        return {
            "agents": generate_agent_status(num_agents=5),
            "memory": generate_memory_usage(num_components=3),
            "system": sys,
            "tasks": generate_task_execution(num_tasks=10),
        }
    elif scenario == "error_spike":
        mem = generate_memory_usage(num_components=3)
        for c in mem:
            c["errors"] = random.randint(5, 20)
        return {
            "agents": generate_agent_status(num_agents=5),
            "memory": mem,
            "system": generate_system_health(),
            "tasks": generate_task_execution(num_tasks=10),
        }
    else:
        # Default scenario
        return {
            "agents": generate_agent_status(),
            "memory": generate_memory_usage(),
            "system": generate_system_health(),
            "tasks": generate_task_execution(),
        }
