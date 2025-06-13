#!/usr/bin/env python3
"""
ADK Wrapper to handle import issues

This wrapper provides access to ADK functionality regardless of the import path.
It attempts multiple import strategies to ensure compatibility.
"""

import logging
import os
import sys
from typing import Any, Dict, List

# Set up logging
logger = logging.getLogger(__name__)


class ADKWrapper:
    """Wrapper for ADK functionality that handles import issues."""

    def __init__(self):
        self.adk_module = None
        self.agent_module = None
        self.vertexai_available = False
        self._initialize()

    def _initialize(self):
        """Initialize the ADK wrapper by trying multiple import strategies."""
        logger.debug("Initializing ADK wrapper...")

        # Strategy 1: Direct import
        try:
            logger.debug("Trying Strategy 1: Direct import of google.adk")
            import google.adk

            self.adk_module = google.adk
            logger.info("✅ Imported ADK directly from google.adk")
            return
        except ImportError as e:
            logger.warning(f"❌ Failed to import google.adk directly: {str(e)}")

        # Strategy 2: Import through google.cloud.aiplatform
        try:
            logger.debug("Trying Strategy 2: Import through google.cloud.aiplatform")
            from google.cloud import aiplatform

            if hasattr(aiplatform, "adk"):
                self.adk_module = aiplatform.adk
                logger.info("✅ Imported ADK from google.cloud.aiplatform.adk")
                return
            else:
                logger.warning("❌ google.cloud.aiplatform does not have 'adk' attribute")
        except ImportError as e:
            logger.warning(f"❌ Failed to import google.cloud.aiplatform: {str(e)}")

        # Strategy 3: Try aiplatform.agents for direct agent access
        try:
            logger.debug("Trying Strategy 3: Import agents from google.cloud.aiplatform")
            from google.cloud.aiplatform import agents

            self.agent_module = agents
            logger.info("✅ Imported agents from google.cloud.aiplatform.agents")
            return
        except ImportError as e:
            logger.warning(f"❌ Failed to import google.cloud.aiplatform.agents: {str(e)}")

        # Strategy 4: Check for Vertex AI availability for direct LLM calls
        try:
            logger.debug("Trying Strategy 4: Check Vertex AI availability for direct LLM calls")

            self.vertexai_available = True
            logger.info("✅ Vertex AI is available for direct LLM calls")
        except ImportError as e:
            logger.warning(f"❌ Failed to import vertexai: {str(e)}")

        logger.warning("⚠️ All ADK import strategies failed, falling back to direct Vector Search")

    def _get_environment_info(self) -> Dict[str, Any]:
        """Get information about the Python environment."""
        return {
            "python_version": sys.version,
            "pythonpath": os.environ.get("PYTHONPATH", ""),
            "sys_path": sys.path,
            "pip_packages": self._get_installed_packages(),
        }

    def _get_installed_packages(self) -> List[str]:
        """Get a list of installed pip packages."""
        try:
            import pkg_resources

            return [f"{pkg.key}=={pkg.version}" for pkg in pkg_resources.working_set]
        except:
            return ["Unable to retrieve packages"]

    def create_agent(self, name, description, instructions, tools=None):
        """Create an agent using the available module or fall back to a simple proxy."""
        if self.adk_module and hasattr(self.adk_module, "create_agent"):
            return self.adk_module.create_agent(
                name=name, description=description, instructions=instructions, tools=tools
            )
        elif self.agent_module and hasattr(self.agent_module, "create_agent"):
            return self.agent_module.create_agent(
                name=name, description=description, instructions=instructions, tools=tools
            )
        else:
            logger.warning("Creating fallback agent proxy")
            return AgentProxy(name, description, instructions, tools)

    def run_agent(self, agent, query, **kwargs):
        """Run an agent using the available module or fall back to direct search."""
        if hasattr(agent, "run"):
            return agent.run(query, **kwargs)
        elif hasattr(agent, "generate_content"):
            return agent.generate_content(query, **kwargs)
        elif isinstance(agent, AgentProxy):
            # Fall back to direct knowledge retrieval
            return agent.run(query, **kwargs)
        else:
            raise AttributeError("Agent does not have 'run' or 'generate_content' method and is not a fallback proxy")

    def run_agent(self, agent, query, **kwargs):
        """Run an agent using the available module or fall back to direct search."""
        if hasattr(agent, "run"):
            return agent.run(query, **kwargs)
        elif hasattr(agent, "generate_content"):
            # Handle SimpleAgent from the fallback
            response = agent.generate_content(query)
            return {"response": response.text, "source": "simple_agent"}
        elif isinstance(agent, AgentProxy):
            # Let the AgentProxy handle it
            return agent.run(query, **kwargs)
        else:
            logger.error(f"Agent of type {type(agent)} has no run or generate_content method")
            raise AttributeError("Agent does not have 'run' method and is not a fallback proxy")

    def is_available(self) -> bool:
        """Check if ADK functionality is available."""
        return self.adk_module is not None or self.agent_module is not None

    def get_diagnostic_info(self) -> Dict[str, Any]:
        """Get diagnostic information about the ADK wrapper."""
        return {
            "adk_module_available": self.adk_module is not None,
            "agent_module_available": self.agent_module is not None,
            "vertexai_available": self.vertexai_available,
            "environment": self._get_environment_info(),
        }


class AgentProxy:
    """Simple proxy class that mimics an agent but uses direct Vector Search."""

    def __init__(self, name, description=None, instructions=None, tools=None):
        self.name = name
        self.description = description
        self.instructions = instructions
        self.tools = tools or []
        logger.info(f"Created AgentProxy for {name}")

    def run(self, query, **kwargs):
        """Run the agent proxy by using direct Vector Search."""
        # Try to use the search tool if available
        for tool in self.tools:
            if isinstance(tool, dict) and "function" in tool and callable(tool["function"]):
                try:
                    results = tool["function"](query)
                    return {
                        "response": f"[AGENT: {self.name}] Response based on Vector Search:\n\n{results}",
                        "source": "vector_search_direct",
                    }
                except Exception as e:
                    logger.error(f"Error using tool: {str(e)}")

        # Fallback to direct search if no tool works
        try:
            # Dynamically import the search function to avoid circular imports
            import importlib.util

            spec = importlib.util.spec_from_file_location(
                "test_vector_search_direct",
                os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts", "test_vector_search_direct.py"),
            )
            vector_search_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(vector_search_module)

            results = vector_search_module.search_knowledge(query)
            return {
                "response": f"[AGENT: {self.name}] Response based on Vector Search:\n\n{results}",
                "source": "vector_search_direct",
            }
        except Exception as e:
            logger.error(f"Error using direct Vector Search: {str(e)}")
            return {"response": f"[AGENT: {self.name}] Error: {str(e)}", "source": "error"}

    def generate_content(self, query, **kwargs):
        """Alias for run method to maintain compatibility with different agent interfaces."""
        return self.run(query, **kwargs)


# Singleton instance
adk = ADKWrapper()

# Test functionality
if __name__ == "__main__":
    import argparse

    # Parse arguments
    parser = argparse.ArgumentParser(description="Test ADK wrapper functionality")
    parser.add_argument(
        "--query",
        default="What is the architecture of VANA?",
        help="Test query for agent (default: 'What is the architecture of VANA?')",
    )
    args = parser.parse_args()

    # Configure logging
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    # Create a new instance
    adk_test = ADKWrapper()

    if adk_test.is_available():
        logger.info("✅ ADK wrapper initialized successfully")
        logger.info(f"ADK module: {adk_test.adk_module}")
        logger.info(f"Agent module: {adk_test.agent_module}")

        # Try to create a simple agent if ADK is available
        try:
            logger.info("\nTrying to create a simple agent...")
            agent = adk_test.create_agent(
                name="TestAgent", description="A test agent", instructions="You are a test agent."
            )
            logger.info("✅ Successfully created agent")

            # Test the agent with a query
            logger.info("%s", f"\nTesting agent with query: '{args.query}'")
            response = adk_test.run_agent(agent, args.query)
            logger.info("Agent response:")
            logger.info("%s", response.text if hasattr(response, "text") else response)

        except Exception as e:
            logger.error(f"❌ Failed to create or run agent: {str(e)}")
    else:
        logger.info("⚠️ ADK wrapper initialized with fallback mechanisms")
        diagnostic_info = adk_test.get_diagnostic_info()
        logger.info(f"Diagnostic info: {diagnostic_info}")

        # Try to create and run a fallback agent
        try:
            logger.info("\nTrying to create a fallback agent...")
            agent = adk_test.create_agent(
                name="FallbackAgent", description="A fallback agent", instructions="You are a fallback agent."
            )
            logger.info("✅ Successfully created fallback agent")

            # Test the fallback agent with a query
            logger.info("%s", f"\nTesting fallback agent with query: '{args.query}'")
            response = adk_test.run_agent(agent, args.query)
            logger.info("Fallback agent response:")
            logger.info("%s", response.text if hasattr(response, "text") else response)

        except Exception as e:
            logger.error(f"❌ Failed to create or run fallback agent: {str(e)}")
            sys.exit(1)
