"""
Parallel Execution Framework for VANA Distributed Architecture

This module provides parallel execution capabilities for routing tasks
to multiple specialists simultaneously, aggregating results, and
handling failures gracefully.

Key Features:
- Parallel task execution across multiple agents
- Result aggregation and conflict resolution
- Timeout handling and fault tolerance
- Performance monitoring and optimization
"""

import asyncio
import time
import logging
from datetime import datetime
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Callable, Union
from enum import Enum
import uuid
import json

logger = logging.getLogger(__name__)


class ExecutionStrategy(Enum):
    """Strategy for parallel execution"""
    ALL_REQUIRED = "all_required"  # All specialists must succeed
    BEST_EFFORT = "best_effort"    # Accept partial results
    FIRST_SUCCESS = "first_success"  # Return first successful result
    MAJORITY_WINS = "majority_wins"  # Use majority consensus


class ResultAggregationMethod(Enum):
    """Method for aggregating results from multiple specialists"""
    CONCATENATE = "concatenate"    # Combine all results
    MERGE = "merge"               # Merge similar results
    PRIORITIZE = "prioritize"     # Use specialist priority ranking
    CONSENSUS = "consensus"       # Find consensus among results


@dataclass
class ParallelTask:
    """Configuration for a parallel execution task"""
    task_id: str
    task_type: str
    data: Dict[str, Any]
    specialists: List[str]
    strategy: ExecutionStrategy = ExecutionStrategy.BEST_EFFORT
    aggregation: ResultAggregationMethod = ResultAggregationMethod.MERGE
    timeout: float = 30.0
    context: Optional[Dict[str, Any]] = None
    priority: int = 1


@dataclass
class SpecialistResult:
    """Result from a single specialist execution"""
    specialist_name: str
    success: bool
    data: Any
    error: Optional[str] = None
    execution_time: float = 0.0
    confidence: float = 1.0
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ParallelExecutionResult:
    """Aggregated result from parallel execution"""
    task_id: str
    success: bool
    data: Any
    specialist_results: List[SpecialistResult]
    execution_time: float
    strategy_used: ExecutionStrategy
    aggregation_used: ResultAggregationMethod
    specialists_succeeded: int
    specialists_failed: int
    error: Optional[str] = None
    confidence: float = 1.0


class ResultAggregator:
    """Handles aggregation of results from multiple specialists"""
    
    @staticmethod
    def aggregate(results: List[SpecialistResult], method: ResultAggregationMethod) -> Dict[str, Any]:
        """Aggregate results using the specified method"""
        successful_results = [r for r in results if r.success]
        
        if not successful_results:
            return {"error": "No successful results to aggregate"}
        
        if method == ResultAggregationMethod.CONCATENATE:
            return ResultAggregator._concatenate_results(successful_results)
        elif method == ResultAggregationMethod.MERGE:
            return ResultAggregator._merge_results(successful_results)
        elif method == ResultAggregationMethod.PRIORITIZE:
            return ResultAggregator._prioritize_results(successful_results)
        elif method == ResultAggregationMethod.CONSENSUS:
            return ResultAggregator._consensus_results(successful_results)
        else:
            return successful_results[0].data if successful_results else {}
    
    @staticmethod
    def _concatenate_results(results: List[SpecialistResult]) -> Dict[str, Any]:
        """Concatenate all results"""
        aggregated = {
            "specialists": {},
            "combined_data": []
        }
        
        for result in results:
            aggregated["specialists"][result.specialist_name] = {
                "data": result.data,
                "confidence": result.confidence,
                "execution_time": result.execution_time
            }
            
            if isinstance(result.data, (list, tuple)):
                aggregated["combined_data"].extend(result.data)
            else:
                aggregated["combined_data"].append(result.data)
        
        return aggregated
    
    @staticmethod
    def _merge_results(results: List[SpecialistResult]) -> Dict[str, Any]:
        """Merge similar results intelligently"""
        if not results:
            return {}
        
        # Start with the first result as base
        merged = {"base_result": results[0].data}
        
        # Merge additional insights from other specialists
        insights = []
        recommendations = []
        
        for result in results:
            specialist_data = result.data
            
            # Extract insights and recommendations if present
            if isinstance(specialist_data, dict):
                if "insights" in specialist_data:
                    insights.extend(specialist_data.get("insights", []))
                if "recommendations" in specialist_data:
                    recommendations.extend(specialist_data.get("recommendations", []))
                
                # Merge other fields
                for key, value in specialist_data.items():
                    if key not in ["insights", "recommendations"]:
                        if key not in merged:
                            merged[key] = value
                        elif isinstance(value, (int, float)) and isinstance(merged[key], (int, float)):
                            # Average numerical values
                            merged[key] = (merged[key] + value) / 2
        
        # Add aggregated insights and recommendations
        if insights:
            merged["insights"] = list(set(insights))  # Remove duplicates
        if recommendations:
            merged["recommendations"] = list(set(recommendations))
        
        return merged
    
    @staticmethod
    def _prioritize_results(results: List[SpecialistResult]) -> Dict[str, Any]:
        """Use the result from the highest priority specialist"""
        # Sort by confidence (higher is better)
        sorted_results = sorted(results, key=lambda x: x.confidence, reverse=True)
        
        primary_result = sorted_results[0]
        
        return {
            "primary_result": primary_result.data,
            "primary_specialist": primary_result.specialist_name,
            "confidence": primary_result.confidence,
            "alternative_results": [
                {
                    "specialist": r.specialist_name,
                    "data": r.data,
                    "confidence": r.confidence
                }
                for r in sorted_results[1:]
            ]
        }
    
    @staticmethod
    def _consensus_results(results: List[SpecialistResult]) -> Dict[str, Any]:
        """Find consensus among results"""
        if len(results) < 2:
            return results[0].data if results else {}
        
        # Simple consensus: look for common elements
        consensus = {
            "consensus_items": [],
            "disagreements": [],
            "specialist_votes": {}
        }
        
        # Collect all unique items/opinions
        all_items = set()
        for result in results:
            if isinstance(result.data, (list, tuple)):
                all_items.update(result.data)
            elif isinstance(result.data, dict):
                all_items.update(result.data.keys())
        
        # Count votes for each item
        votes = {}
        for item in all_items:
            votes[item] = 0
            consensus["specialist_votes"][str(item)] = []
            
            for result in results:
                if isinstance(result.data, (list, tuple)) and item in result.data:
                    votes[item] += 1
                    consensus["specialist_votes"][str(item)].append(result.specialist_name)
                elif isinstance(result.data, dict) and str(item) in result.data:
                    votes[item] += 1
                    consensus["specialist_votes"][str(item)].append(result.specialist_name)
        
        # Determine consensus (majority > 50%)
        majority_threshold = len(results) / 2
        for item, vote_count in votes.items():
            if vote_count > majority_threshold:
                consensus["consensus_items"].append(item)
            else:
                consensus["disagreements"].append({
                    "item": item,
                    "votes": vote_count,
                    "specialists": consensus["specialist_votes"][str(item)]
                })
        
        return consensus


class ParallelExecutor:
    """Handles parallel execution of tasks across multiple specialists"""
    
    def __init__(self, a2a_protocol=None):
        self.a2a_protocol = a2a_protocol
        self.execution_history: List[ParallelExecutionResult] = []
        self.performance_metrics = {
            "total_executions": 0,
            "successful_executions": 0,
            "average_execution_time": 0.0,
            "specialist_performance": {}
        }
    
    async def execute_parallel(self, task: ParallelTask) -> ParallelExecutionResult:
        """Execute a task across multiple specialists in parallel"""
        start_time = time.time()
        
        logger.info(f"Starting parallel execution for task {task.task_id} with {len(task.specialists)} specialists")
        
        try:
            # Create individual specialist tasks
            specialist_tasks = []
            for specialist in task.specialists:
                if self.a2a_protocol:
                    from agents.protocols.a2a_protocol import A2ARequest
                    request = A2ARequest(
                        request_id=f"{task.task_id}_{specialist}",
                        source_agent="parallel_executor",
                        target_agent=specialist,
                        task_type=task.task_type,
                        data=task.data,
                        context=task.context,
                        priority=task.priority,
                        timeout=task.timeout
                    )
                    specialist_tasks.append(self._execute_specialist_a2a(specialist, request))
                else:
                    # Fallback to direct execution
                    specialist_tasks.append(self._execute_specialist_direct(specialist, task))
            
            # Execute all tasks with timeout
            try:
                results = await asyncio.wait_for(
                    asyncio.gather(*specialist_tasks, return_exceptions=True),
                    timeout=task.timeout
                )
            except asyncio.TimeoutError:
                logger.warning(f"Parallel execution timed out for task {task.task_id}")
                results = [SpecialistResult(
                    specialist_name=spec,
                    success=False,
                    data=None,
                    error="Execution timeout"
                ) for spec in task.specialists]
            
            # Convert exceptions to failed results
            specialist_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    specialist_results.append(SpecialistResult(
                        specialist_name=task.specialists[i],
                        success=False,
                        data=None,
                        error=str(result)
                    ))
                else:
                    specialist_results.append(result)
            
            # Evaluate success based on strategy
            execution_success = self._evaluate_success(specialist_results, task.strategy)
            
            # Aggregate results
            aggregated_data = None
            if execution_success:
                aggregated_data = ResultAggregator.aggregate(specialist_results, task.aggregation)
            
            execution_time = time.time() - start_time
            
            # Create final result
            result = ParallelExecutionResult(
                task_id=task.task_id,
                success=execution_success,
                data=aggregated_data,
                specialist_results=specialist_results,
                execution_time=execution_time,
                strategy_used=task.strategy,
                aggregation_used=task.aggregation,
                specialists_succeeded=len([r for r in specialist_results if r.success]),
                specialists_failed=len([r for r in specialist_results if not r.success]),
                confidence=self._calculate_confidence(specialist_results)
            )
            
            # Update metrics
            self._update_metrics(result)
            self.execution_history.append(result)
            
            logger.info(f"Parallel execution completed for task {task.task_id}: "
                       f"success={execution_success}, time={execution_time:.2f}s, "
                       f"succeeded={result.specialists_succeeded}/{len(task.specialists)}")
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Parallel execution failed for task {task.task_id}: {e}")
            
            return ParallelExecutionResult(
                task_id=task.task_id,
                success=False,
                data=None,
                specialist_results=[],
                execution_time=execution_time,
                strategy_used=task.strategy,
                aggregation_used=task.aggregation,
                specialists_succeeded=0,
                specialists_failed=len(task.specialists),
                error=str(e)
            )
    
    async def _execute_specialist_a2a(self, specialist: str, request) -> SpecialistResult:
        """Execute specialist using A2A protocol"""
        start_time = time.time()
        
        try:
            response = await self.a2a_protocol.call_specialist(specialist, request)
            execution_time = time.time() - start_time
            
            return SpecialistResult(
                specialist_name=specialist,
                success=response.success,
                data=response.data,
                error=response.error,
                execution_time=execution_time
            )
            
        except Exception as e:
            execution_time = time.time() - start_time
            return SpecialistResult(
                specialist_name=specialist,
                success=False,
                data=None,
                error=str(e),
                execution_time=execution_time
            )
    
    async def _execute_specialist_direct(self, specialist: str, task: ParallelTask) -> SpecialistResult:
        """Execute specialist directly (fallback method)"""
        start_time = time.time()
        
        # Simulate specialist execution
        await asyncio.sleep(0.1)  # Simulate processing time
        
        execution_time = time.time() - start_time
        
        return SpecialistResult(
            specialist_name=specialist,
            success=True,
            data={
                "specialist": specialist,
                "task_type": task.task_type,
                "result": f"Processed {len(str(task.data))} characters",
                "timestamp": datetime.now().isoformat()
            },
            execution_time=execution_time
        )
    
    def _evaluate_success(self, results: List[SpecialistResult], strategy: ExecutionStrategy) -> bool:
        """Evaluate if execution was successful based on strategy"""
        successful_results = [r for r in results if r.success]
        
        if strategy == ExecutionStrategy.ALL_REQUIRED:
            return len(successful_results) == len(results)
        elif strategy == ExecutionStrategy.BEST_EFFORT:
            return len(successful_results) > 0
        elif strategy == ExecutionStrategy.FIRST_SUCCESS:
            return len(successful_results) > 0
        elif strategy == ExecutionStrategy.MAJORITY_WINS:
            return len(successful_results) > len(results) / 2
        else:
            return len(successful_results) > 0
    
    def _calculate_confidence(self, results: List[SpecialistResult]) -> float:
        """Calculate overall confidence based on specialist results"""
        if not results:
            return 0.0
        
        successful_results = [r for r in results if r.success]
        if not successful_results:
            return 0.0
        
        # Base confidence on success rate
        success_rate = len(successful_results) / len(results)
        
        # Adjust for individual specialist confidence if available
        avg_confidence = sum(r.confidence for r in successful_results) / len(successful_results)
        
        return success_rate * avg_confidence
    
    def _update_metrics(self, result: ParallelExecutionResult):
        """Update performance metrics"""
        self.performance_metrics["total_executions"] += 1
        
        if result.success:
            self.performance_metrics["successful_executions"] += 1
        
        # Update average execution time
        total = self.performance_metrics["total_executions"]
        current_avg = self.performance_metrics["average_execution_time"]
        self.performance_metrics["average_execution_time"] = (
            (current_avg * (total - 1) + result.execution_time) / total
        )
        
        # Update specialist performance
        for specialist_result in result.specialist_results:
            name = specialist_result.specialist_name
            if name not in self.performance_metrics["specialist_performance"]:
                self.performance_metrics["specialist_performance"][name] = {
                    "total_calls": 0,
                    "successful_calls": 0,
                    "average_time": 0.0
                }
            
            perf = self.performance_metrics["specialist_performance"][name]
            perf["total_calls"] += 1
            
            if specialist_result.success:
                perf["successful_calls"] += 1
            
            # Update average time
            total_calls = perf["total_calls"]
            current_avg = perf["average_time"]
            perf["average_time"] = (
                (current_avg * (total_calls - 1) + specialist_result.execution_time) / total_calls
            )
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        return {
            **self.performance_metrics,
            "success_rate": (
                self.performance_metrics["successful_executions"] / 
                max(self.performance_metrics["total_executions"], 1)
            ),
            "recent_executions": [
                {
                    "task_id": result.task_id,
                    "success": result.success,
                    "execution_time": result.execution_time,
                    "specialists_succeeded": result.specialists_succeeded,
                    "specialists_failed": result.specialists_failed
                }
                for result in self.execution_history[-10:]  # Last 10 executions
            ]
        }


# Global parallel executor instance
_parallel_executor_instance: Optional[ParallelExecutor] = None


def get_parallel_executor(a2a_protocol=None) -> ParallelExecutor:
    """Get or create the global parallel executor instance"""
    global _parallel_executor_instance
    
    if _parallel_executor_instance is None:
        _parallel_executor_instance = ParallelExecutor(a2a_protocol)
    
    return _parallel_executor_instance