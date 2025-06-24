#!/usr/bin/env python3
"""
Vector Search Health Checker for VANA

This module provides a comprehensive health checker for the Vector Search integration.
It monitors health, collects metrics, and provides actionable recommendations.
"""

import json
import logging
import os
import time
from datetime import datetime
from typing import Any, Dict, List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VectorSearchHealthChecker:
    """Health checker for Vector Search integration"""

    def __init__(self, vector_search_client=None, history_size: int = 10):
        """
        Initialize the Vector Search Health Checker

        Args:
            vector_search_client: Vector Search client instance (optional)
            history_size: Number of health check results to keep in history
        """
        self.vector_search_client = vector_search_client
        self.history_size = history_size
        self.health_history = []
        self.last_check_time = None

    def check_health(self) -> Dict[str, Any]:
        """Perform comprehensive health check on Vector Search"""
        start_time = time.time()

        # Initialize result structure
        result = {
            "timestamp": datetime.now().isoformat(),
            "status": "unknown",
            "checks": {},
            "metrics": {},
            "issues": [],
        }

        # Get or create Vector Search client
        client = self._get_vector_search_client()
        if not client:
            result["status"] = "critical"
            result["issues"].append(
                {
                    "severity": "critical",
                    "message": "Failed to initialize Vector Search client",
                }
            )
            self._add_to_history(result)
            return result

        # Implement specific checks
        result["checks"] = {
            "environment": self._check_environment(),
            "authentication": self._check_authentication(client),
            "embedding": self._check_embedding(client),
            "search": self._check_search(client),
        }

        # Calculate overall status
        result["status"] = self._calculate_overall_status(result["checks"])

        # Calculate metrics
        duration = time.time() - start_time
        result["metrics"] = {
            "response_time": duration,
            "success_rate": self._calculate_success_rate(result["checks"]),
        }

        # Add to history
        self._add_to_history(result)
        self.last_check_time = datetime.now()

        return result

    def get_recommendations(
        self, health_result: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate recommendations based on health check results"""
        recommendations = []
        checks = health_result.get("checks", {})

        # Check environment variables
        env_check = checks.get("environment", {})
        if env_check.get("status") != "ok":
            missing_vars = env_check.get("details", {}).get("missing_vars", [])
            if missing_vars:
                recommendations.append(
                    {
                        "priority": "high",
                        "category": "configuration",
                        "title": "Missing environment variables",
                        "action": f"Set the following missing environment variables: {', '.join(missing_vars)}",
                    }
                )

        # Check authentication
        auth_check = checks.get("authentication", {})
        if auth_check.get("status") != "ok":
            recommendations.append(
                {
                    "priority": "high",
                    "category": "authentication",
                    "title": "Authentication issues with Vector Search",
                    "action": "Verify that GOOGLE_APPLICATION_CREDENTIALS points to a valid service account key file with appropriate permissions.",
                }
            )

        # Check embedding
        embed_check = checks.get("embedding", {})
        if embed_check.get("status") != "ok":
            recommendations.append(
                {
                    "priority": "high",
                    "category": "functionality",
                    "title": "Embedding generation not working",
                    "action": "Check that the service account has access to Vertex AI Embeddings API and that the model 'text-embedding-004' is available in your region.",
                }
            )
        elif embed_check.get("details", {}).get("is_mock", False):
            recommendations.append(
                {
                    "priority": "medium",
                    "category": "functionality",
                    "title": "Using mock embeddings",
                    "action": "Check authentication and permissions for Vertex AI Embeddings API.",
                }
            )

        # Check search
        search_check = checks.get("search", {})
        if search_check.get("status") == "error":
            recommendations.append(
                {
                    "priority": "high",
                    "category": "functionality",
                    "title": "Vector Search not working",
                    "action": "Verify that the Vector Search endpoint and deployed index exist and are accessible.",
                }
            )
        elif search_check.get("details", {}).get("result_count", 0) == 0:
            recommendations.append(
                {
                    "priority": "medium",
                    "category": "data",
                    "title": "No search results",
                    "action": "Verify that your Vector Search index contains data. You may need to upload content first.",
                }
            )

        return recommendations

    def generate_report(self) -> Dict[str, Any]:
        """Generate a comprehensive health report"""
        # Perform health check if not done yet
        if not self.health_history:
            self.check_health()

        # Get latest health check
        latest = self.health_history[-1] if self.health_history else {}

        # Generate recommendations
        recommendations = self.get_recommendations(latest)

        # Calculate trends if we have history
        trends = self._calculate_trends() if len(self.health_history) > 1 else {}

        # Compile report
        report = {
            "timestamp": datetime.now().isoformat(),
            "current_status": latest.get("status", "unknown"),
            "last_check_time": latest.get("timestamp"),
            "checks": latest.get("checks", {}),
            "metrics": latest.get("metrics", {}),
            "trends": trends,
            "recommendations": recommendations,
            "history_summary": self._get_history_summary(),
        }

        return report

    def _calculate_trends(self) -> Dict[str, Any]:
        """Calculate trends from history"""
        if len(self.health_history) < 2:
            return {}

        # Extract metrics over time
        response_times = [
            check.get("metrics", {}).get("response_time", 0)
            for check in self.health_history
        ]
        success_rates = [
            check.get("metrics", {}).get("success_rate", 0)
            for check in self.health_history
        ]

        # Calculate trends
        trends = {
            "response_time": {
                "current": response_times[-1] if response_times else 0,
                "previous": response_times[-2] if len(response_times) > 1 else 0,
                "trend": (
                    "improving"
                    if response_times[-1] < response_times[-2]
                    else (
                        "degrading"
                        if response_times[-1] > response_times[-2]
                        else "stable"
                        if len(response_times) > 1
                        else "unknown"
                    )
                ),
            },
            "success_rate": {
                "current": success_rates[-1] if success_rates else 0,
                "previous": success_rates[-2] if len(success_rates) > 1 else 0,
                "trend": (
                    "improving"
                    if success_rates[-1] > success_rates[-2]
                    else (
                        "degrading"
                        if success_rates[-1] < success_rates[-2]
                        else "stable"
                        if len(success_rates) > 1
                        else "unknown"
                    )
                ),
            },
        }

        return trends

    def _get_history_summary(self) -> Dict[str, Any]:
        """Generate summary of health check history"""
        if not self.health_history:
            return {}

        statuses = [check.get("status", "unknown") for check in self.health_history]
        status_counts = {
            "ok": statuses.count("ok"),
            "warn": statuses.count("warn"),
            "error": statuses.count("error"),
            "critical": statuses.count("critical"),
            "unknown": statuses.count("unknown"),
        }

        return {
            "check_count": len(statuses),
            "status_counts": status_counts,
            "first_check_time": self.health_history[0].get("timestamp")
            if self.health_history
            else None,
            "last_check_time": self.health_history[-1].get("timestamp")
            if self.health_history
            else None,
        }

    def _get_vector_search_client(self) -> Any:
        """
        Get or create Vector Search client

        Returns:
            Vector Search client instance or None if initialization fails
        """
        if self.vector_search_client:
            return self.vector_search_client

        try:
            # Try enhanced client first, fall back to standard client
            try:
                from tools.vector_search.enhanced_vector_search_client import (
                    EnhancedVectorSearchClient,
                )

                return EnhancedVectorSearchClient()
            except (ImportError, Exception):
                from tools.vector_search.vector_search_client import VectorSearchClient

                return VectorSearchClient()
        except Exception as e:
            logger.error(f"Failed to create Vector Search client: {e}")
            return None

    def _check_environment(self) -> Dict[str, Any]:
        """Check environment variables"""
        required_vars = [
            "GOOGLE_CLOUD_PROJECT",
            "GOOGLE_CLOUD_LOCATION",
            "VECTOR_SEARCH_ENDPOINT_ID",
            "GOOGLE_APPLICATION_CREDENTIALS",
        ]
        missing = [var for var in required_vars if not os.environ.get(var)]

        return {
            "status": "ok" if not missing else "error",
            "details": {"missing_vars": missing},
        }

    def _check_authentication(self, client) -> Dict[str, Any]:
        """Check authentication status"""
        try:
            # Check if client has auth token method or is_available
            if hasattr(client, "_get_auth_token"):
                token = client._get_auth_token()
                return {
                    "status": "ok" if token else "error",
                    "details": {"has_token": bool(token)},
                }
            else:
                available = client.is_available()
                return {
                    "status": "ok" if available else "error",
                    "details": {"is_available": available},
                }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _check_embedding(self, client) -> Dict[str, Any]:
        """
        Check embedding generation functionality

        Args:
            client: Vector Search client instance

        Returns:
            Dictionary with check results
        """
        try:
            test_text = "Test embedding generation for VANA health check"
            start_time = time.time()
            embedding = client.generate_embedding(test_text)
            duration = time.time() - start_time

            # Check if embedding was generated successfully
            if not embedding or len(embedding) == 0:
                return {
                    "status": "error",
                    "details": {
                        "dimensions": 0,
                        "response_time": duration,
                        "error": "Empty embedding returned",
                    },
                }

            # Check if this is likely a mock implementation
            is_mock = False
            if len(embedding) > 0:
                # Check if all values are identical (common in mock implementations)
                if all(e == embedding[0] for e in embedding):
                    is_mock = True
                # Check if embedding has exactly 768 dimensions with mostly zeros or identical values
                elif len(embedding) == 768 and (
                    sum(embedding) < 0.1 or embedding.count(0.0) > 700
                ):
                    is_mock = True

            return {
                "status": "ok",
                "details": {
                    "dimensions": len(embedding),
                    "response_time": duration,
                    "is_mock": is_mock,
                },
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _check_search(self, client) -> Dict[str, Any]:
        """
        Check search functionality

        Args:
            client: Vector Search client instance

        Returns:
            Dictionary with check results
        """
        try:
            test_query = "VANA test query"
            start_time = time.time()
            results = client.search(test_query, top_k=3)
            duration = time.time() - start_time

            # Check if results were returned
            if not results:
                return {
                    "status": "warn",
                    "details": {
                        "result_count": 0,
                        "response_time": duration,
                        "message": "No search results returned - this may be expected if the index is empty",
                    },
                }

            # Check result quality
            result_count = len(results)

            # Check if results have expected fields
            has_expected_fields = all(
                isinstance(r, dict) and "content" in r and "score" in r
                for r in results[: min(3, result_count)]
            )

            return {
                "status": "ok",
                "details": {
                    "result_count": result_count,
                    "response_time": duration,
                    "has_expected_fields": has_expected_fields,
                },
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _calculate_overall_status(self, checks: Dict[str, Dict[str, Any]]) -> str:
        """
        Calculate overall status from individual checks

        Args:
            checks: Dictionary of check results

        Returns:
            Overall status string: "ok", "warn", "error", or "critical"
        """
        # Check for critical failures in authentication or environment
        if (
            checks.get("authentication", {}).get("status") == "error"
            and checks.get("environment", {}).get("status") == "error"
        ):
            return "critical"

        # Check for any errors
        if any(check.get("status") == "error" for check in checks.values()):
            return "error"

        # Check for any warnings
        elif any(check.get("status") == "warn" for check in checks.values()):
            return "warn"

        # All checks passed
        else:
            return "ok"

    def _calculate_success_rate(self, checks: Dict[str, Dict[str, Any]]) -> float:
        """
        Calculate success rate from checks

        Args:
            checks: Dictionary of check results

        Returns:
            Success rate as a percentage (0-100)
        """
        total = len(checks)
        if total == 0:
            return 0.0

        # Count successful checks (status is "ok")
        success = sum(1 for check in checks.values() if check.get("status") == "ok")

        # Calculate percentage
        return (success / total) * 100.0

    def _add_to_history(self, result):
        """Add result to history, maintaining history size"""
        self.health_history.append(result)

        # Trim history if needed
        if len(self.health_history) > self.history_size:
            self.health_history = self.health_history[-self.history_size :]

    def get_health_status(self) -> str:
        """Get current health status"""
        if not self.health_history:
            self.check_health()

        latest = self.health_history[-1] if self.health_history else {}
        return latest.get("status", "unknown")

    def save_report_to_file(self, filename: str) -> bool:
        """Save health report to file"""
        try:
            report = self.generate_report()

            with open(filename, "w") as f:
                json.dump(report, f, indent=2)

            logger.info(f"Saved health report to {filename}")
            return True
        except Exception as e:
            logger.error(f"Failed to save health report: {e}")
            return False

    @classmethod
    def from_client(cls, client, history_size: int = 10):
        """Create health checker from existing client"""
        return cls(vector_search_client=client, history_size=history_size)


# Test function
def main():
    """Test Vector Search Health Checker"""
    checker = VectorSearchHealthChecker()
    result = checker.check_health()
    logger.info("%s", f"Health status: {result['status']}")

    recommendations = checker.get_recommendations(result)
    for i, rec in enumerate(recommendations):
        logger.info(
            "%s", f"{i + 1}. [{rec['priority']}] {rec['title']}: {rec['action']}"
        )

    report = checker.generate_report()
    logger.info("%s", f"Generated report with status: {report['current_status']}")

    checker.save_report_to_file("vector_search_health_report.json")


if __name__ == "__main__":
    main()
