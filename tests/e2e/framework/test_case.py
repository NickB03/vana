"""Base test case class for E2E tests."""

class TestCase:
    """Base test case for end-to-end testing."""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
