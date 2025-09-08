"""Basic health endpoint tests to ensure CI/CD pipeline functionality."""

from fastapi.testclient import TestClient

from app.server import app

client = TestClient(app)


def test_health_endpoint():
    """Test that health endpoint returns 200 status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


def test_health_response_format():
    """Test health endpoint response format."""
    response = client.get("/health")
    data = response.json()
    assert isinstance(data, dict)
    assert "timestamp" in data


def test_health_endpoint_content_type():
    """Test that health endpoint returns JSON."""
    response = client.get("/health")
    assert response.headers["content-type"] == "application/json"


def test_health_endpoint_status_value():
    """Test that health endpoint returns expected status value."""
    response = client.get("/health")
    data = response.json()
    # Should return a meaningful status
    assert data["status"] in ["healthy", "ok", "active", "running"]
