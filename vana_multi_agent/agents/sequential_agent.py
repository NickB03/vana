"""
Sequential Agent Implementation for Google ADK Best Practices

This module implements the SequentialAgent pattern where agents execute
in sequence, with each agent building on the results of the previous one
through session state sharing.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SequentialExecutionResult:
    """Result of sequential agent execution."""
    success: bool
    execution_order: List[str]
    agent_results: Dict[str, Any]
    total_execution_time: float
    error_message: Optional[str] = None
    session_state: Optional[Dict[str, Any]] = None

class SequentialAgent:
    """
    Google ADK Sequential Agent Pattern Implementation.
    
    Executes a list of agents in sequence, where each agent can access
    the results of previous agents through session state sharing.
    """
    
    def __init__(self, 
                 name: str,
                 sub_agents: List[Any],
                 description: str = "Sequential workflow agent",
                 stop_on_error: bool = True,
                 max_execution_time: float = 300.0):
        """
        Initialize Sequential Agent.
        
        Args:
            name: Name of the sequential agent
            sub_agents: List of agents to execute in sequence
            description: Description of the sequential workflow
            stop_on_error: Whether to stop execution if an agent fails
            max_execution_time: Maximum total execution time in seconds
        """
        self.name = name
        self.sub_agents = sub_agents
        self.description = description
        self.stop_on_error = stop_on_error
        self.max_execution_time = max_execution_time
        
        # Validate sub_agents
        if not sub_agents:
            raise ValueError("SequentialAgent requires at least one sub_agent")
        
        logger.info(f"SequentialAgent '{name}' initialized with {len(sub_agents)} sub-agents")
    
    def execute(self, 
                initial_context: str,
                session_state: Optional[Dict[str, Any]] = None) -> SequentialExecutionResult:
        """
        Execute agents in sequence with state sharing.
        
        Args:
            initial_context: Initial context/prompt for the first agent
            session_state: Optional initial session state
            
        Returns:
            SequentialExecutionResult with execution details
        """
        start_time = time.time()
        execution_order = []
        agent_results = {}
        
        # Initialize session state if not provided
        if session_state is None:
            session_state = {}
        
        logger.info(f"Starting sequential execution of {len(self.sub_agents)} agents")
        
        try:
            current_context = initial_context
            
            for i, agent in enumerate(self.sub_agents):
                # Check execution time limit
                elapsed_time = time.time() - start_time
                if elapsed_time > self.max_execution_time:
                    error_msg = f"Sequential execution exceeded time limit ({self.max_execution_time}s)"
                    logger.error(error_msg)
                    return SequentialExecutionResult(
                        success=False,
                        execution_order=execution_order,
                        agent_results=agent_results,
                        total_execution_time=elapsed_time,
                        error_message=error_msg,
                        session_state=session_state
                    )
                
                agent_name = getattr(agent, 'name', f'agent_{i}')
                execution_order.append(agent_name)
                
                logger.info(f"Executing agent {i+1}/{len(self.sub_agents)}: {agent_name}")
                
                try:
                    # Execute the agent
                    # Note: This is a conceptual implementation
                    # In practice, this would integrate with the actual agent execution framework
                    agent_result = self._execute_agent(agent, current_context, session_state)
                    
                    # Store agent result
                    agent_results[agent_name] = agent_result
                    
                    # Update session state if agent has output_key
                    if hasattr(agent, 'output_key') and agent.output_key:
                        session_state[agent.output_key] = agent_result
                        logger.info(f"Saved result to session_state['{agent.output_key}']")
                    
                    # Prepare context for next agent (include session state summary)
                    current_context = self._prepare_next_context(agent_result, session_state)
                    
                except Exception as agent_error:
                    error_msg = f"Agent '{agent_name}' failed: {str(agent_error)}"
                    logger.error(error_msg)
                    
                    agent_results[agent_name] = {"error": str(agent_error)}
                    
                    if self.stop_on_error:
                        return SequentialExecutionResult(
                            success=False,
                            execution_order=execution_order,
                            agent_results=agent_results,
                            total_execution_time=time.time() - start_time,
                            error_message=error_msg,
                            session_state=session_state
                        )
                    else:
                        # Continue with error context
                        current_context = f"Previous agent failed: {str(agent_error)}. Continue with: {current_context}"
            
            total_time = time.time() - start_time
            logger.info(f"Sequential execution completed successfully in {total_time:.2f}s")
            
            return SequentialExecutionResult(
                success=True,
                execution_order=execution_order,
                agent_results=agent_results,
                total_execution_time=total_time,
                session_state=session_state
            )
            
        except Exception as e:
            error_msg = f"Sequential execution failed: {str(e)}"
            logger.error(error_msg)
            
            return SequentialExecutionResult(
                success=False,
                execution_order=execution_order,
                agent_results=agent_results,
                total_execution_time=time.time() - start_time,
                error_message=error_msg,
                session_state=session_state
            )
    
    def _execute_agent(self, agent: Any, context: str, session_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a single agent with context and session state.
        
        This is a conceptual implementation that would integrate with
        the actual agent execution framework.
        """
        # Simulate agent execution
        # In practice, this would call the actual agent's run/execute method
        
        agent_name = getattr(agent, 'name', 'unknown_agent')
        
        # Create a mock result based on agent type
        if 'architecture' in agent_name.lower():
            return {
                "analysis_type": "system_architecture",
                "recommendations": ["microservices", "api_gateway", "database_optimization"],
                "context_processed": context,
                "session_state_used": list(session_state.keys())
            }
        elif 'ui' in agent_name.lower():
            return {
                "design_type": "user_interface",
                "components": ["responsive_layout", "component_library", "accessibility_features"],
                "context_processed": context,
                "session_state_used": list(session_state.keys())
            }
        elif 'devops' in agent_name.lower():
            return {
                "infrastructure_type": "cloud_deployment",
                "services": ["kubernetes", "monitoring", "ci_cd_pipeline"],
                "context_processed": context,
                "session_state_used": list(session_state.keys())
            }
        elif 'qa' in agent_name.lower():
            return {
                "testing_type": "comprehensive_qa",
                "test_suites": ["unit_tests", "integration_tests", "e2e_tests"],
                "context_processed": context,
                "session_state_used": list(session_state.keys())
            }
        else:
            return {
                "result_type": "generic_processing",
                "output": f"Processed: {context}",
                "context_processed": context,
                "session_state_used": list(session_state.keys())
            }
    
    def _prepare_next_context(self, previous_result: Dict[str, Any], session_state: Dict[str, Any]) -> str:
        """
        Prepare context for the next agent based on previous results and session state.
        """
        # Create a summary of available session state
        state_summary = []
        for key, value in session_state.items():
            if isinstance(value, dict) and 'analysis_type' in value:
                state_summary.append(f"{key}: {value['analysis_type']}")
            elif isinstance(value, dict) and 'design_type' in value:
                state_summary.append(f"{key}: {value['design_type']}")
            elif isinstance(value, dict) and 'infrastructure_type' in value:
                state_summary.append(f"{key}: {value['infrastructure_type']}")
            elif isinstance(value, dict) and 'testing_type' in value:
                state_summary.append(f"{key}: {value['testing_type']}")
            else:
                state_summary.append(f"{key}: available")
        
        context = f"Previous work completed. Available session state: {', '.join(state_summary)}. "
        context += "Build upon previous results and continue with the workflow."
        
        return context
    
    def get_execution_summary(self) -> Dict[str, Any]:
        """Get a summary of the sequential agent configuration."""
        return {
            "name": self.name,
            "description": self.description,
            "sub_agent_count": len(self.sub_agents),
            "sub_agent_names": [getattr(agent, 'name', f'agent_{i}') for i, agent in enumerate(self.sub_agents)],
            "stop_on_error": self.stop_on_error,
            "max_execution_time": self.max_execution_time,
            "pattern_type": "google_adk_sequential"
        }
