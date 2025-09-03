"""
Server availability check for integration tests
"""
import asyncio
import socket
from typing import Any

import pytest
import httpx


def is_server_running(host: str = "localhost", port: int = 8000) -> bool:
    """Check if a server is running on the given host and port."""
    try:
        with socket.create_connection((host, port), timeout=2):
            return True
    except (socket.error, socket.timeout):
        return False


@pytest.hookimpl(trylast=True)
def pytest_collection_modifyitems(config: Any, items: list[Any]) -> None:
    """Skip tests marked as requires_server if no server is running."""
    if not is_server_running():
        skip_marker = pytest.mark.skip(reason="Server not running on localhost:8000")
        for item in items:
            if "requires_server" in item.keywords:
                item.add_marker(skip_marker)


@pytest.fixture(scope="session")
async def check_server_health() -> bool:
    """Check server health for integration tests."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:8000/health")
            return response.status_code == 200
    except Exception:
        return False