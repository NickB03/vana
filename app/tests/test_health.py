"""Basic health check tests for the backend."""

from fastapi.testclient import TestClient

from app.server import app

client = TestClient(app)


def test_health_endpoint():
    """Test that the health endpoint returns 200."""
    response = client.get("/health")
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["status"] == "healthy"
    # Health endpoint can include additional service information


def test_root_endpoint():
    """Test that the root endpoint returns expected response."""
    response = client.get("/")
    assert response.status_code == 200
    # Root endpoint may return HTML or JSON depending on configuration
    if response.headers.get("content-type", "").startswith("application/json"):
        data = response.json()
        assert "message" in data or "status" in data
    else:
        # HTML response is also acceptable
        assert len(response.text) > 0
