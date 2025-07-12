#!/usr/bin/env python3
"""
Feedback Manager for VANA

This module provides a feedback collection and analysis system for VANA.
It allows users to provide feedback on search results, entity extraction,
and other system components, which can be used to improve the system over time.
"""

import datetime
import json
import logging
import os
from typing import Any, Dict, List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FeedbackManager:
    """Feedback manager for VANA"""

    def __init__(self, feedback_dir: str = "feedback"):
        """
        Initialize the feedback manager

        Args:
            feedback_dir: Directory to store feedback files
        """
        self.feedback_dir = feedback_dir

        # Create feedback directory if it doesn't exist
        os.makedirs(feedback_dir, exist_ok=True)

        # Create subdirectories for different feedback types
        os.makedirs(os.path.join(feedback_dir, "search"), exist_ok=True)
        os.makedirs(os.path.join(feedback_dir, "entity"), exist_ok=True)
        os.makedirs(os.path.join(feedback_dir, "document"), exist_ok=True)
        os.makedirs(os.path.join(feedback_dir, "general"), exist_ok=True)

    def store_search_feedback(
        self,
        query: str,
        results: List[Dict[str, Any]],
        rating: int,
        comment: str = "",
        user_id: str = "anonymous",
    ) -> Dict[str, Any]:
        """
        Store feedback for search results

        Args:
            query: Search query
            results: Search results
            rating: Rating (1-5)
            comment: User comment
            user_id: User identifier

        Returns:
            Feedback record
        """
        # Validate rating
        if rating < 1 or rating > 5:
            logger.warning(f"Invalid rating: {rating}. Must be between 1 and 5.")
            return {"success": False, "reason": "Invalid rating"}

        # Create feedback record
        feedback = {
            "timestamp": datetime.datetime.now().isoformat(),
            "user_id": user_id,
            "query": query,
            "results": results,
            "rating": rating,
            "comment": comment,
        }

        # Generate filename
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"search_{timestamp}_{user_id}.json"
        filepath = os.path.join(self.feedback_dir, "search", filename)

        # Save feedback
        try:
            with open(filepath, "w") as f:
                json.dump(feedback, f, indent=2)

            logger.info(f"Stored search feedback in {filepath}")
            return {"success": True, "feedback_id": filename}

        except Exception as e:
            logger.error(f"Error storing search feedback: {str(e)}")
            return {"success": False, "reason": str(e)}

    def store_entity_feedback(
        self,
        entity_name: str,
        entity_type: str,
        extracted_data: Dict[str, Any],
        is_correct: bool,
        comment: str = "",
        user_id: str = "anonymous",
    ) -> Dict[str, Any]:
        """
        Store feedback for entity extraction

        Args:
            entity_name: Name of the entity
            entity_type: Type of the entity
            extracted_data: Extracted entity data
            is_correct: Whether the extraction is correct
            comment: User comment
            user_id: User identifier

        Returns:
            Feedback record
        """
        # Create feedback record
        feedback = {
            "timestamp": datetime.datetime.now().isoformat(),
            "user_id": user_id,
            "entity_name": entity_name,
            "entity_type": entity_type,
            "extracted_data": extracted_data,
            "is_correct": is_correct,
            "comment": comment,
        }

        # Generate filename
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"entity_{timestamp}_{user_id}.json"
        filepath = os.path.join(self.feedback_dir, "entity", filename)

        # Save feedback
        try:
            with open(filepath, "w") as f:
                json.dump(feedback, f, indent=2)

            logger.info(f"Stored entity feedback in {filepath}")
            return {"success": True, "feedback_id": filename}

        except Exception as e:
            logger.error(f"Error storing entity feedback: {str(e)}")
            return {"success": False, "reason": str(e)}

    def store_document_feedback(
        self,
        document_id: str,
        processing_result: Dict[str, Any],
        rating: int,
        comment: str = "",
        user_id: str = "anonymous",
    ) -> Dict[str, Any]:
        """
        Store feedback for document processing

        Args:
            document_id: Document identifier
            processing_result: Document processing result
            rating: Rating (1-5)
            comment: User comment
            user_id: User identifier

        Returns:
            Feedback record
        """
        # Validate rating
        if rating < 1 or rating > 5:
            logger.warning(f"Invalid rating: {rating}. Must be between 1 and 5.")
            return {"success": False, "reason": "Invalid rating"}

        # Create feedback record
        feedback = {
            "timestamp": datetime.datetime.now().isoformat(),
            "user_id": user_id,
            "document_id": document_id,
            "processing_result": processing_result,
            "rating": rating,
            "comment": comment,
        }

        # Generate filename
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"document_{timestamp}_{user_id}.json"
        filepath = os.path.join(self.feedback_dir, "document", filename)

        # Save feedback
        try:
            with open(filepath, "w") as f:
                json.dump(feedback, f, indent=2)

            logger.info(f"Stored document feedback in {filepath}")
            return {"success": True, "feedback_id": filename}

        except Exception as e:
            logger.error(f"Error storing document feedback: {str(e)}")
            return {"success": False, "reason": str(e)}

    def store_general_feedback(
        self, category: str, content: str, rating: int = 0, user_id: str = "anonymous"
    ) -> Dict[str, Any]:
        """
        Store general feedback

        Args:
            category: Feedback category
            content: Feedback content
            rating: Optional rating (0-5)
            user_id: User identifier

        Returns:
            Feedback record
        """
        # Validate rating
        if rating < 0 or rating > 5:
            logger.warning(f"Invalid rating: {rating}. Must be between 0 and 5.")
            return {"success": False, "reason": "Invalid rating"}

        # Create feedback record
        feedback = {
            "timestamp": datetime.datetime.now().isoformat(),
            "user_id": user_id,
            "category": category,
            "content": content,
            "rating": rating,
        }

        # Generate filename
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"general_{timestamp}_{user_id}.json"
        filepath = os.path.join(self.feedback_dir, "general", filename)

        # Save feedback
        try:
            with open(filepath, "w") as f:
                json.dump(feedback, f, indent=2)

            logger.info(f"Stored general feedback in {filepath}")
            return {"success": True, "feedback_id": filename}

        except Exception as e:
            logger.error(f"Error storing general feedback: {str(e)}")
            return {"success": False, "reason": str(e)}

    def get_feedback(self, feedback_type: str = "all", limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get feedback records

        Args:
            feedback_type: Type of feedback to retrieve ("search", "entity", "document", "general", or "all")
            limit: Maximum number of records to retrieve

        Returns:
            List of feedback records
        """
        feedback = []

        try:
            # Determine directories to search
            if feedback_type == "all":
                dirs = ["search", "entity", "document", "general"]
            else:
                dirs = [feedback_type]

            # Get feedback from each directory
            for dir_name in dirs:
                dir_path = os.path.join(self.feedback_dir, dir_name)

                if not os.path.exists(dir_path):
                    logger.warning(f"Feedback directory not found: {dir_path}")
                    continue

                # Get all JSON files in the directory
                files = [f for f in os.listdir(dir_path) if f.endswith(".json")]

                # Sort by timestamp (newest first)
                files.sort(reverse=True)

                # Load feedback records
                for file in files[:limit]:
                    try:
                        with open(os.path.join(dir_path, file), "r") as f:
                            record = json.load(f)
                            record["feedback_id"] = file
                            record["feedback_type"] = dir_name
                            feedback.append(record)
                    except Exception as e:
                        logger.error(f"Error loading feedback file {file}: {str(e)}")

            # Sort by timestamp (newest first)
            feedback.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

            # Limit the number of records
            return feedback[:limit]

        except Exception as e:
            logger.error(f"Error retrieving feedback: {str(e)}")
            return []

    def analyze_feedback(self, feedback_type: str = "all") -> Dict[str, Any]:
        """
        Analyze feedback

        Args:
            feedback_type: Type of feedback to analyze ("search", "entity", "document", "general", or "all")

        Returns:
            Feedback analysis
        """
        try:
            # Get feedback records
            feedback = self.get_feedback(feedback_type, limit=1000)

            if not feedback:
                return {"success": False, "reason": "No feedback records found"}

            # Initialize analysis
            analysis = {
                "total_records": len(feedback),
                "average_rating": 0,
                "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
                "feedback_by_type": {},
            }

            # Analyze feedback
            total_rating = 0
            rated_records = 0

            for record in feedback:
                # Count by type
                record_type = record.get("feedback_type", "unknown")
                if record_type not in analysis["feedback_by_type"]:
                    analysis["feedback_by_type"][record_type] = 0
                analysis["feedback_by_type"][record_type] += 1

                # Count ratings
                rating = record.get("rating")
                if rating is not None and rating > 0:
                    analysis["rating_distribution"][rating] = analysis["rating_distribution"].get(rating, 0) + 1
                    total_rating += rating
                    rated_records += 1

            # Calculate average rating
            if rated_records > 0:
                analysis["average_rating"] = total_rating / rated_records

            return {"success": True, "analysis": analysis}

        except Exception as e:
            logger.error(f"Error analyzing feedback: {str(e)}")
            return {"success": False, "reason": str(e)}

    def get_feedback_summary(self) -> str:
        """
        Get a human-readable summary of feedback

        Returns:
            Formatted feedback summary
        """
        try:
            # Analyze feedback
            result = self.analyze_feedback()

            if not result.get("success", False):
                return f"Error generating feedback summary: {result.get('reason', 'Unknown error')}"

            analysis = result.get("analysis", {})

            # Format summary
            summary = "Feedback Summary\n"
            summary += "===============\n\n"

            summary += f"Total Feedback Records: {analysis.get('total_records', 0)}\n"
            summary += f"Average Rating: {analysis.get('average_rating', 0):.1f}/5\n\n"

            # Rating distribution
            summary += "Rating Distribution:\n"
            for rating, count in analysis.get("rating_distribution", {}).items():
                percentage = 0
                if analysis.get("total_records", 0) > 0:
                    percentage = (count / analysis.get("total_records", 0)) * 100
                summary += f"  {rating} stars: {count} ({percentage:.1f}%)\n"

            # Feedback by type
            summary += "\nFeedback by Type:\n"
            for feedback_type, count in analysis.get("feedback_by_type", {}).items():
                percentage = 0
                if analysis.get("total_records", 0) > 0:
                    percentage = (count / analysis.get("total_records", 0)) * 100
                summary += f"  {feedback_type}: {count} ({percentage:.1f}%)\n"

            # Recent feedback
            recent_feedback = self.get_feedback(limit=5)
            if recent_feedback:
                summary += "\nRecent Feedback:\n"
                for i, feedback in enumerate(recent_feedback, 1):
                    timestamp = feedback.get("timestamp", "")
                    if timestamp:
                        try:
                            dt = datetime.datetime.fromisoformat(timestamp)
                            timestamp = dt.strftime("%Y-%m-%d %H:%M:%S")
                        except:
                            pass

                    feedback_type = feedback.get("feedback_type", "unknown")
                    rating = feedback.get("rating", 0)
                    comment = feedback.get("comment", "")

                    summary += f"  {i}. [{timestamp}] {feedback_type.capitalize()}"
                    if rating > 0:
                        summary += f" (Rating: {rating}/5)"
                    summary += "\n"

                    if comment:
                        summary += f"     Comment: {comment}\n"

            return summary

        except Exception as e:
            logger.error(f"Error generating feedback summary: {str(e)}")
            return f"Error generating feedback summary: {str(e)}"
