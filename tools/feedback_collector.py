#!/usr/bin/env python3
"""
Feedback Collector for VANA

This module provides a mechanism to collect and analyze user feedback on search results.
It allows users to provide feedback on search results, which can be used to improve
the search algorithms and result quality.

Usage:
    from tools.feedback_collector import FeedbackCollector

    # Initialize feedback collector
    feedback_collector = FeedbackCollector()

    # Record feedback
    feedback_collector.record_feedback(
        query="What is VANA?",
        results=search_results,
        rating=4,
        comments="Good results, but missing some information"
    )

    # Get feedback statistics
    stats = feedback_collector.get_statistics()
    logger.info("%s", stats)
"""

import json
import logging
import os
import sqlite3
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FeedbackCollector:
    """Feedback collector for search results"""

    def __init__(self, db_path: str = "data/feedback.db"):
        """
        Initialize the feedback collector

        Args:
            db_path: Path to the SQLite database file
        """
        self.db_path = db_path

        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(db_path), exist_ok=True)

        # Initialize database
        self._init_db()

    def _init_db(self):
        """Initialize the database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Create feedback table
            cursor.execute(
                """
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                query TEXT,
                implementation TEXT,
                rating INTEGER,
                comments TEXT
            )
            """
            )

            # Create result feedback table
            cursor.execute(
                """
            CREATE TABLE IF NOT EXISTS result_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                feedback_id INTEGER,
                result_id INTEGER,
                relevance_rating INTEGER,
                FOREIGN KEY (feedback_id) REFERENCES feedback (id)
            )
            """
            )

            conn.commit()
            conn.close()

            logger.info(f"Initialized feedback database: {self.db_path}")
        except Exception as e:
            logger.error(f"Error initializing feedback database: {e}")

    def record_feedback(
        self,
        query: str,
        results: Dict[str, Any],
        rating: int,
        comments: str = "",
        implementation: str = "enhanced_hybrid_search_optimized",
    ):
        """
        Record user feedback on search results

        Args:
            query: The search query
            results: The search results
            rating: Overall rating (1-5)
            comments: User comments
            implementation: Search implementation used

        Returns:
            Feedback ID
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Insert feedback
            cursor.execute(
                "INSERT INTO feedback (timestamp, query, implementation, rating, comments) VALUES (?, ?, ?, ?, ?)",
                (datetime.now().isoformat(), query, implementation, rating, comments),
            )

            feedback_id = cursor.lastrowid

            # Insert result feedback
            combined_results = results.get("combined", [])
            for i, result in enumerate(combined_results):
                # Default relevance rating based on position
                relevance_rating = max(5 - i, 1)  # 5 for first result, decreasing to 1

                cursor.execute(
                    "INSERT INTO result_feedback (feedback_id, result_id, relevance_rating) VALUES (?, ?, ?)",
                    (feedback_id, i, relevance_rating),
                )

            conn.commit()
            conn.close()

            logger.info(f"Recorded feedback for query: {query}")
            return feedback_id
        except Exception as e:
            logger.error(f"Error recording feedback: {e}")
            return None

    def record_result_feedback(self, feedback_id: int, result_id: int, relevance_rating: int):
        """
        Record feedback for a specific result

        Args:
            feedback_id: Feedback ID
            result_id: Result ID (position in results)
            relevance_rating: Relevance rating (1-5)

        Returns:
            Success status
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Update result feedback
            cursor.execute(
                "UPDATE result_feedback SET relevance_rating = ? WHERE feedback_id = ? AND result_id = ?",
                (relevance_rating, feedback_id, result_id),
            )

            conn.commit()
            conn.close()

            logger.info(f"Recorded result feedback for feedback_id: {feedback_id}, result_id: {result_id}")
            return True
        except Exception as e:
            logger.error(f"Error recording result feedback: {e}")
            return False

    def get_feedback(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get recent feedback

        Args:
            limit: Maximum number of feedback entries to return

        Returns:
            List of feedback entries
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Get feedback
            cursor.execute("SELECT * FROM feedback ORDER BY timestamp DESC LIMIT ?", (limit,))

            feedback_entries = []
            for row in cursor.fetchall():
                feedback = dict(row)

                # Get result feedback
                cursor.execute(
                    "SELECT * FROM result_feedback WHERE feedback_id = ? ORDER BY result_id", (feedback["id"],)
                )

                feedback["result_feedback"] = [dict(row) for row in cursor.fetchall()]
                feedback_entries.append(feedback)

            conn.close()

            return feedback_entries
        except Exception as e:
            logger.error(f"Error getting feedback: {e}")
            return []

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get feedback statistics

        Returns:
            Feedback statistics
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Get overall statistics
            cursor.execute("SELECT COUNT(*) FROM feedback")
            total_feedback = cursor.fetchone()[0]

            cursor.execute("SELECT AVG(rating) FROM feedback")
            avg_rating = cursor.fetchone()[0] or 0

            # Get statistics by implementation
            cursor.execute(
                "SELECT implementation, COUNT(*) as count, AVG(rating) as avg_rating FROM feedback GROUP BY implementation"
            )

            implementation_stats = {}
            for row in cursor.fetchall():
                implementation, count, avg_rating = row
                implementation_stats[implementation] = {"count": count, "avg_rating": avg_rating or 0}

            # Get statistics by result position
            cursor.execute(
                "SELECT result_id, AVG(relevance_rating) as avg_relevance FROM result_feedback GROUP BY result_id ORDER BY result_id"
            )

            position_stats = {}
            for row in cursor.fetchall():
                result_id, avg_relevance = row
                position_stats[result_id] = avg_relevance or 0

            conn.close()

            return {
                "total_feedback": total_feedback,
                "avg_rating": avg_rating,
                "implementation_stats": implementation_stats,
                "position_stats": position_stats,
            }
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {"total_feedback": 0, "avg_rating": 0, "implementation_stats": {}, "position_stats": {}}

    def analyze_feedback(self, min_count: int = 10) -> Dict[str, Any]:
        """
        Analyze feedback to identify patterns and improvement opportunities

        Args:
            min_count: Minimum number of feedback entries required for analysis

        Returns:
            Analysis results
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Get total feedback count
            cursor.execute("SELECT COUNT(*) FROM feedback")
            total_feedback = cursor.fetchone()[0]

            if total_feedback < min_count:
                conn.close()
                return {
                    "status": "insufficient_data",
                    "message": f"Insufficient data for analysis. Need at least {min_count} feedback entries.",
                }

            # Get queries with low ratings
            cursor.execute(
                "SELECT query, AVG(rating) as avg_rating, COUNT(*) as count FROM feedback GROUP BY query HAVING count >= 3 ORDER BY avg_rating ASC LIMIT 10"
            )

            problematic_queries = []
            for row in cursor.fetchall():
                query, avg_rating, count = row
                problematic_queries.append({"query": query, "avg_rating": avg_rating, "count": count})

            # Get implementation comparison
            cursor.execute(
                "SELECT implementation, AVG(rating) as avg_rating, COUNT(*) as count FROM feedback GROUP BY implementation HAVING count >= 3 ORDER BY avg_rating DESC"
            )

            implementation_comparison = []
            for row in cursor.fetchall():
                implementation, avg_rating, count = row
                implementation_comparison.append(
                    {"implementation": implementation, "avg_rating": avg_rating, "count": count}
                )

            # Get position analysis
            cursor.execute(
                "SELECT rf.result_id, AVG(rf.relevance_rating) as avg_relevance, COUNT(*) as count FROM result_feedback rf JOIN feedback f ON rf.feedback_id = f.id GROUP BY rf.result_id ORDER BY rf.result_id"
            )

            position_analysis = []
            for row in cursor.fetchall():
                result_id, avg_relevance, count = row
                position_analysis.append({"position": result_id + 1, "avg_relevance": avg_relevance, "count": count})

            conn.close()

            return {
                "status": "success",
                "total_feedback": total_feedback,
                "problematic_queries": problematic_queries,
                "implementation_comparison": implementation_comparison,
                "position_analysis": position_analysis,
            }
        except Exception as e:
            logger.error(f"Error analyzing feedback: {e}")
            return {"status": "error", "message": f"Error analyzing feedback: {e}"}

    def export_feedback(self, output_file: str) -> bool:
        """
        Export feedback to a JSON file

        Args:
            output_file: Output file path

        Returns:
            Success status
        """
        try:
            feedback = self.get_feedback(limit=1000)

            with open(output_file, "w") as f:
                json.dump(feedback, f, indent=2)

            logger.info(f"Exported feedback to: {output_file}")
            return True
        except Exception as e:
            logger.error(f"Error exporting feedback: {e}")
            return False

    def clear_feedback(self) -> bool:
        """
        Clear all feedback data

        Returns:
            Success status
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("DELETE FROM result_feedback")
            cursor.execute("DELETE FROM feedback")

            conn.commit()
            conn.close()

            logger.info("Cleared all feedback data")
            return True
        except Exception as e:
            logger.error(f"Error clearing feedback: {e}")
            return False
