#!/usr/bin/env python3
"""
Feedback API for VANA

This module provides a simple API for collecting user feedback on search results.
It uses Flask to create a lightweight web server that can receive feedback submissions.

Usage:
    # Start the feedback API server
    python -m tools.feedback_api

    # Submit feedback via HTTP POST
    curl -X POST http://localhost:5000/feedback -H "Content-Type: application/json" -d '{
        "query": "What is VANA?",
        "rating": 4,
        "comments": "Good results, but missing some information",
        "result_ratings": [5, 4, 3, 2, 1]
    }'
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime
from typing import Any, Dict, List

from flask import Flask, jsonify, request

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

# Import feedback collector
from tools.feedback_collector import FeedbackCollector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Initialize feedback collector
feedback_collector = FeedbackCollector()


@app.route("/feedback", methods=["POST"])
def submit_feedback():
    """Handle feedback submission"""
    try:
        # Get request data
        data = request.json

        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400

        # Extract feedback data
        query = data.get("query")
        rating = data.get("rating")
        comments = data.get("comments", "")
        implementation = data.get("implementation", "enhanced_hybrid_search_optimized")
        result_ratings = data.get("result_ratings", [])

        # Validate required fields
        if not query:
            return jsonify({"status": "error", "message": "Query is required"}), 400

        if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
            return jsonify({"status": "error", "message": "Rating must be an integer between 1 and 5"}), 400

        # Create mock results structure if not provided
        results = data.get("results", {})
        if not results:
            results = {"combined": [{"id": i} for i in range(len(result_ratings))]}

        # Record feedback
        feedback_id = feedback_collector.record_feedback(
            query=query, results=results, rating=rating, comments=comments, implementation=implementation
        )

        # Record result ratings if provided
        if result_ratings and feedback_id:
            for i, relevance_rating in enumerate(result_ratings):
                if isinstance(relevance_rating, int) and 1 <= relevance_rating <= 5:
                    feedback_collector.record_result_feedback(
                        feedback_id=feedback_id, result_id=i, relevance_rating=relevance_rating
                    )

        return jsonify({"status": "success", "message": "Feedback recorded successfully", "feedback_id": feedback_id})

    except Exception as e:
        logger.error(f"Error processing feedback: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/feedback", methods=["GET"])
def get_feedback():
    """Get feedback entries"""
    try:
        limit = request.args.get("limit", default=100, type=int)
        feedback = feedback_collector.get_feedback(limit=limit)

        return jsonify({"status": "success", "count": len(feedback), "feedback": feedback})

    except Exception as e:
        logger.error(f"Error getting feedback: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/feedback/statistics", methods=["GET"])
def get_statistics():
    """Get feedback statistics"""
    try:
        statistics = feedback_collector.get_statistics()

        return jsonify({"status": "success", "statistics": statistics})

    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/feedback/analysis", methods=["GET"])
def analyze_feedback():
    """Analyze feedback"""
    try:
        min_count = request.args.get("min_count", default=10, type=int)
        analysis = feedback_collector.analyze_feedback(min_count=min_count)

        return jsonify({"status": "success", "analysis": analysis})

    except Exception as e:
        logger.error(f"Error analyzing feedback: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="VANA Feedback API Server")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind the server to")
    parser.add_argument("--port", type=int, default=5000, help="Port to bind the server to")
    parser.add_argument("--debug", action="store_true", help="Run in debug mode")
    return parser.parse_args()


def main():
    """Main function"""
    args = parse_arguments()

    logger.info(f"Starting Feedback API server on {args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
