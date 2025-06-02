#!/usr/bin/env python3
"""
Feedback Client for VANA

This module provides a client for submitting feedback to the feedback API.
It can be used to submit feedback programmatically or from the command line.

Usage:
    from tools.feedback_client import FeedbackClient

    # Initialize feedback client
    client = FeedbackClient()

    # Submit feedback
    response = client.submit_feedback(
        query="What is VANA?",
        rating=4,
        comments="Good results, but missing some information",
        result_ratings=[5, 4, 3, 2, 1]
    )

    print(response)
"""

import argparse
import json
import logging
import sys
from typing import Any, Optional

import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FeedbackClient:
    """Client for submitting feedback to the feedback API"""

    def __init__(self, api_url: str = "http://localhost:5000"):
        """
        Initialize the feedback client

        Args:
            api_url: URL of the feedback API
        """
        self.api_url = api_url

    def submit_feedback(
        self,
        query: str,
        rating: int,
        comments: str = "",
        result_ratings: Optional[list[int]] = None,
        implementation: str = "enhanced_hybrid_search_optimized",
        results: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Submit feedback to the feedback API

        Args:
            query: The search query
            rating: Overall rating (1-5)
            comments: User comments
            result_ratings: Ratings for individual results (1-5)
            implementation: Search implementation used
            results: The search results (optional)

        Returns:
            API response
        """
        try:
            # Prepare request data
            data = {
                "query": query,
                "rating": rating,
                "comments": comments,
                "implementation": implementation,
            }

            if result_ratings:
                data["result_ratings"] = result_ratings

            if results:
                data["results"] = results

            # Send request
            response = requests.post(f"{self.api_url}/feedback", json=data)

            # Check response
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Error submitting feedback: {response.text}")
                return {
                    "status": "error",
                    "message": f"API returned status code {response.status_code}: {response.text}",
                }

        except Exception as e:
            logger.error(f"Error submitting feedback: {e}")
            return {"status": "error", "message": str(e)}

    def get_feedback(self, limit: int = 100) -> dict[str, Any]:
        """
        Get feedback entries from the feedback API

        Args:
            limit: Maximum number of feedback entries to return

        Returns:
            API response
        """
        try:
            # Send request
            response = requests.get(f"{self.api_url}/feedback", params={"limit": limit})

            # Check response
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Error getting feedback: {response.text}")
                return {
                    "status": "error",
                    "message": f"API returned status code {response.status_code}: {response.text}",
                }

        except Exception as e:
            logger.error(f"Error getting feedback: {e}")
            return {"status": "error", "message": str(e)}

    def get_statistics(self) -> dict[str, Any]:
        """
        Get feedback statistics from the feedback API

        Returns:
            API response
        """
        try:
            # Send request
            response = requests.get(f"{self.api_url}/feedback/statistics")

            # Check response
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Error getting statistics: {response.text}")
                return {
                    "status": "error",
                    "message": f"API returned status code {response.status_code}: {response.text}",
                }

        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {"status": "error", "message": str(e)}

    def analyze_feedback(self, min_count: int = 10) -> dict[str, Any]:
        """
        Analyze feedback from the feedback API

        Args:
            min_count: Minimum number of feedback entries required for analysis

        Returns:
            API response
        """
        try:
            # Send request
            response = requests.get(
                f"{self.api_url}/feedback/analysis", params={"min_count": min_count}
            )

            # Check response
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Error analyzing feedback: {response.text}")
                return {
                    "status": "error",
                    "message": f"API returned status code {response.status_code}: {response.text}",
                }

        except Exception as e:
            logger.error(f"Error analyzing feedback: {e}")
            return {"status": "error", "message": str(e)}


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="VANA Feedback Client")
    parser.add_argument(
        "--api-url",
        type=str,
        default="http://localhost:5000",
        help="URL of the feedback API",
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Submit feedback command
    submit_parser = subparsers.add_parser("submit", help="Submit feedback")
    submit_parser.add_argument("--query", type=str, required=True, help="Search query")
    submit_parser.add_argument(
        "--rating",
        type=int,
        required=True,
        choices=range(1, 6),
        help="Overall rating (1-5)",
    )
    submit_parser.add_argument("--comments", type=str, default="", help="User comments")
    submit_parser.add_argument(
        "--result-ratings",
        type=str,
        help='Ratings for individual results (comma-separated, e.g., "5,4,3,2,1")',
    )
    submit_parser.add_argument(
        "--implementation",
        type=str,
        default="enhanced_hybrid_search_optimized",
        help="Search implementation used",
    )

    # Get feedback command
    get_parser = subparsers.add_parser("get", help="Get feedback entries")
    get_parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Maximum number of feedback entries to return",
    )

    # Get statistics command
    subparsers.add_parser("stats", help="Get feedback statistics")

    # Analyze feedback command
    analyze_parser = subparsers.add_parser("analyze", help="Analyze feedback")
    analyze_parser.add_argument(
        "--min-count",
        type=int,
        default=10,
        help="Minimum number of feedback entries required for analysis",
    )

    return parser.parse_args()


def main():
    """Main function"""
    args = parse_arguments()

    # Initialize feedback client
    client = FeedbackClient(api_url=args.api_url)

    # Execute command
    if args.command == "submit":
        # Parse result ratings
        result_ratings = None
        if args.result_ratings:
            try:
                result_ratings = [int(r) for r in args.result_ratings.split(",")]
            except ValueError:
                logger.error(
                    "Invalid result ratings format. Use comma-separated integers (e.g., '5,4,3,2,1')"
                )
                sys.exit(1)

        # Submit feedback
        response = client.submit_feedback(
            query=args.query,
            rating=args.rating,
            comments=args.comments,
            result_ratings=result_ratings,
            implementation=args.implementation,
        )

        print(json.dumps(response, indent=2))

    elif args.command == "get":
        # Get feedback
        response = client.get_feedback(limit=args.limit)
        print(json.dumps(response, indent=2))

    elif args.command == "stats":
        # Get statistics
        response = client.get_statistics()
        print(json.dumps(response, indent=2))

    elif args.command == "analyze":
        # Analyze feedback
        response = client.analyze_feedback(min_count=args.min_count)
        print(json.dumps(response, indent=2))

    else:
        logger.error("No command specified. Use --help for usage information.")
        sys.exit(1)


if __name__ == "__main__":
    main()
