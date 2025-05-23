"""
Result Validator for VANA

This module provides result validation functionality for the VANA project,
including result verification, confidence scoring, and result combination.
"""

import logging
import json
from typing import Dict, Any, List, Optional, Union, Tuple

# Set up logging
logger = logging.getLogger(__name__)

class ResultValidator:
    """Validator for verifying and combining results from specialists."""
    
    def __init__(self, validation_rules: Optional[Dict[str, Any]] = None):
        """
        Initialize a result validator.
        
        Args:
            validation_rules: Dictionary of validation rules (optional)
        """
        self.validation_rules = validation_rules or {}
        
    def validate_result(self, result: Dict[str, Any], task_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Validate a single result.
        
        Args:
            result: Result dictionary
            task_type: Type of task (optional)
            
        Returns:
            Validated result with additional metadata
        """
        # Check if result is already marked as failed
        if not result.get("success", True):
            return result
            
        # Get validation rules for this task type
        rules = self.validation_rules.get(task_type, {}) if task_type else {}
        
        # Create a copy of the result for validation
        validated = result.copy()
        
        # Check required fields
        required_fields = rules.get("required_fields", ["result"])
        missing_fields = [field for field in required_fields if field not in result]
        
        if missing_fields:
            validated["success"] = False
            validated["validation_error"] = f"Missing required fields: {', '.join(missing_fields)}"
            validated["confidence"] = 0.0
            return validated
            
        # Check result format
        if "format" in rules:
            format_valid = self._validate_format(result.get("result"), rules["format"])
            
            if not format_valid:
                validated["success"] = False
                validated["validation_error"] = f"Invalid format for result"
                validated["confidence"] = 0.0
                return validated
                
        # Calculate confidence score
        confidence = self._calculate_confidence(result, rules)
        validated["confidence"] = confidence
        
        # Check minimum confidence threshold
        min_confidence = rules.get("min_confidence", 0.5)
        
        if confidence < min_confidence:
            validated["success"] = False
            validated["validation_error"] = f"Confidence score {confidence} below threshold {min_confidence}"
            return validated
            
        # Result is valid
        validated["success"] = True
        validated["validated"] = True
        
        return validated
    
    def validate_results(self, results: Union[List[Dict[str, Any]], Dict[str, Dict[str, Any]]],
                        task_types: Optional[Dict[str, str]] = None) -> Union[List[Dict[str, Any]], Dict[str, Dict[str, Any]]]:
        """
        Validate multiple results.
        
        Args:
            results: List of result dictionaries or dictionary mapping task IDs to results
            task_types: Dictionary mapping task IDs to task types (optional)
            
        Returns:
            Validated results in the same format as input
        """
        if isinstance(results, list):
            # List of results
            validated_results = []
            
            for result in results:
                task_id = result.get("task_id")
                task_type = task_types.get(task_id) if task_types else None
                validated = self.validate_result(result, task_type)
                validated_results.append(validated)
                
            return validated_results
        else:
            # Dictionary mapping task IDs to results
            validated_results = {}
            
            for task_id, result in results.items():
                task_type = task_types.get(task_id) if task_types else None
                validated = self.validate_result(result, task_type)
                validated_results[task_id] = validated
                
            return validated_results
    
    def combine_results(self, results: Union[List[Dict[str, Any]], Dict[str, Dict[str, Any]]],
                       combination_method: str = "weighted") -> Dict[str, Any]:
        """
        Combine multiple results into a single result.
        
        Args:
            results: List of result dictionaries or dictionary mapping task IDs to results
            combination_method: Method for combining results (default: "weighted")
            
        Returns:
            Combined result dictionary
        """
        # Convert dictionary to list if needed
        if isinstance(results, dict):
            results_list = list(results.values())
        else:
            results_list = results
            
        # Filter out failed results
        successful_results = [r for r in results_list if r.get("success", True)]
        
        if not successful_results:
            return {
                "success": False,
                "error": "No successful results to combine",
                "confidence": 0.0
            }
            
        # Combine results based on method
        if combination_method == "weighted":
            return self._combine_weighted(successful_results)
        elif combination_method == "voting":
            return self._combine_voting(successful_results)
        elif combination_method == "best":
            return self._combine_best(successful_results)
        else:
            logger.warning(f"Unknown combination method: {combination_method}, using weighted")
            return self._combine_weighted(successful_results)
    
    def has_failures(self, results: Union[List[Dict[str, Any]], Dict[str, Dict[str, Any]]]) -> bool:
        """
        Check if there are any failed results.
        
        Args:
            results: List of result dictionaries or dictionary mapping task IDs to results
            
        Returns:
            True if there are any failed results, False otherwise
        """
        # Convert dictionary to list if needed
        if isinstance(results, dict):
            results_list = list(results.values())
        else:
            results_list = results
            
        # Check for failed results
        return any(not r.get("success", True) for r in results_list)
    
    def get_failures(self, results: Union[List[Dict[str, Any]], Dict[str, Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """
        Get all failed results.
        
        Args:
            results: List of result dictionaries or dictionary mapping task IDs to results
            
        Returns:
            List of failed result dictionaries
        """
        # Convert dictionary to list if needed
        if isinstance(results, dict):
            results_list = list(results.values())
        else:
            results_list = results
            
        # Filter failed results
        return [r for r in results_list if not r.get("success", True)]
    
    def _validate_format(self, result: Any, format_rule: str) -> bool:
        """
        Validate the format of a result.
        
        Args:
            result: Result to validate
            format_rule: Format rule to apply
            
        Returns:
            True if the format is valid, False otherwise
        """
        if format_rule == "json":
            # Check if result is valid JSON
            if isinstance(result, str):
                try:
                    json.loads(result)
                    return True
                except json.JSONDecodeError:
                    return False
            elif isinstance(result, (dict, list)):
                return True
            else:
                return False
        elif format_rule == "text":
            # Check if result is a string
            return isinstance(result, str)
        elif format_rule == "number":
            # Check if result is a number
            return isinstance(result, (int, float))
        elif format_rule == "boolean":
            # Check if result is a boolean
            return isinstance(result, bool)
        elif format_rule == "list":
            # Check if result is a list
            return isinstance(result, list)
        elif format_rule == "dict":
            # Check if result is a dictionary
            return isinstance(result, dict)
        else:
            # Unknown format rule
            logger.warning(f"Unknown format rule: {format_rule}")
            return True
    
    def _calculate_confidence(self, result: Dict[str, Any], rules: Dict[str, Any]) -> float:
        """
        Calculate a confidence score for a result.
        
        Args:
            result: Result dictionary
            rules: Validation rules
            
        Returns:
            Confidence score between 0 and 1
        """
        # Start with base confidence
        base_confidence = result.get("confidence", 0.8)
        
        # Apply adjustments based on rules
        adjustments = []
        
        # Adjust based on execution time
        if "execution_time" in result and "max_execution_time" in rules:
            max_time = rules["max_execution_time"]
            actual_time = result["execution_time"]
            
            if actual_time > max_time:
                time_factor = max_time / actual_time
                adjustments.append(time_factor - 1.0)  # Negative adjustment
                
        # Adjust based on result length (for text results)
        if isinstance(result.get("result"), str) and "min_length" in rules:
            min_length = rules["min_length"]
            actual_length = len(result["result"])
            
            if actual_length < min_length:
                length_factor = actual_length / min_length
                adjustments.append(length_factor - 1.0)  # Negative adjustment
                
        # Apply all adjustments
        adjusted_confidence = base_confidence
        
        for adjustment in adjustments:
            adjusted_confidence += adjustment * 0.1  # Scale adjustments
            
        # Ensure confidence is between 0 and 1
        return max(0.0, min(1.0, adjusted_confidence))
    
    def _combine_weighted(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Combine results using weighted averaging.
        
        Args:
            results: List of result dictionaries
            
        Returns:
            Combined result dictionary
        """
        # Calculate weights based on confidence
        total_weight = sum(r.get("confidence", 0.8) for r in results)
        
        if total_weight == 0:
            # Equal weights if no confidence scores
            weights = [1.0 / len(results)] * len(results)
        else:
            # Normalize weights
            weights = [r.get("confidence", 0.8) / total_weight for r in results]
            
        # Combine text results
        if all(isinstance(r.get("result"), str) for r in results):
            # For text results, use the highest confidence result
            best_idx = weights.index(max(weights))
            combined_result = results[best_idx]["result"]
        elif all(isinstance(r.get("result"), (int, float)) for r in results):
            # For numeric results, use weighted average
            combined_result = sum(r["result"] * w for r, w in zip(results, weights))
        elif all(isinstance(r.get("result"), dict) for r in results):
            # For dictionary results, combine keys with highest confidence
            combined_result = {}
            
            # Get all keys
            all_keys = set()
            for r in results:
                all_keys.update(r["result"].keys())
                
            # Combine values for each key
            for key in all_keys:
                key_results = []
                key_weights = []
                
                for r, w in zip(results, weights):
                    if key in r["result"]:
                        key_results.append(r["result"][key])
                        key_weights.append(w)
                        
                if key_results:
                    # Normalize key weights
                    total_key_weight = sum(key_weights)
                    norm_key_weights = [w / total_key_weight for w in key_weights]
                    
                    # Combine based on type
                    if all(isinstance(v, (int, float)) for v in key_results):
                        combined_result[key] = sum(v * w for v, w in zip(key_results, norm_key_weights))
                    else:
                        # Use highest confidence value
                        best_key_idx = norm_key_weights.index(max(norm_key_weights))
                        combined_result[key] = key_results[best_key_idx]
        else:
            # For mixed results, use the highest confidence result
            best_idx = weights.index(max(weights))
            combined_result = results[best_idx]["result"]
            
        # Calculate combined confidence
        combined_confidence = sum(r.get("confidence", 0.8) * w for r, w in zip(results, weights))
        
        # Create combined result dictionary
        return {
            "result": combined_result,
            "confidence": combined_confidence,
            "success": True,
            "combined": True,
            "combination_method": "weighted",
            "source_count": len(results)
        }
    
    def _combine_voting(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Combine results using majority voting.
        
        Args:
            results: List of result dictionaries
            
        Returns:
            Combined result dictionary
        """
        # Count votes for each unique result
        votes = {}
        
        for r in results:
            result_key = self._get_result_key(r.get("result"))
            
            if result_key not in votes:
                votes[result_key] = {
                    "count": 0,
                    "confidence": 0.0,
                    "result": r.get("result")
                }
                
            votes[result_key]["count"] += 1
            votes[result_key]["confidence"] += r.get("confidence", 0.8)
            
        # Find result with most votes
        best_result = max(votes.values(), key=lambda v: v["count"])
        
        # Calculate average confidence for the winning result
        avg_confidence = best_result["confidence"] / best_result["count"]
        
        # Create combined result dictionary
        return {
            "result": best_result["result"],
            "confidence": avg_confidence,
            "success": True,
            "combined": True,
            "combination_method": "voting",
            "vote_count": best_result["count"],
            "total_votes": len(results)
        }
    
    def _combine_best(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Use the result with highest confidence.
        
        Args:
            results: List of result dictionaries
            
        Returns:
            Best result dictionary
        """
        # Find result with highest confidence
        best_result = max(results, key=lambda r: r.get("confidence", 0.0))
        
        # Create combined result dictionary
        return {
            "result": best_result.get("result"),
            "confidence": best_result.get("confidence", 0.8),
            "success": True,
            "combined": True,
            "combination_method": "best",
            "source_count": len(results)
        }
    
    def _get_result_key(self, result: Any) -> str:
        """
        Get a string key for a result for voting.
        
        Args:
            result: Result to get key for
            
        Returns:
            String key
        """
        if isinstance(result, (str, int, float, bool)):
            return str(result)
        elif isinstance(result, (dict, list)):
            try:
                return json.dumps(result, sort_keys=True)
            except (TypeError, ValueError):
                return str(result)
        else:
            return str(result)
