#!/usr/bin/env python3
"""
VANA Agent Demo Script

This script provides a guided demo of the VANA agent's capabilities,
including memory, knowledge graph, vector search, and web search.
"""

import argparse
import os
import sys

# Add the project root to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, ".."))
sys.path.append(project_root)

from agent.core import VanaAgent
from agent.logging import VanaLogger
from agent.memory.memory_bank import MemoryBankManager
from agent.memory.short_term import ShortTermMemory
from agent.tools import (
    echo,
    file_exists,
    get_health_status,
    kg_extract_entities,
    kg_query,
    kg_relationship,
    kg_store,
    list_directory,
    read_file,
    search_knowledge,
    vector_search,
    web_search,
    write_file,
)

# Configure logger
logger = VanaLogger(name="demo", level="info", structured=False)


class VanaAgentDemo:
    """
    Demo for the VANA agent.

    This class provides methods for demonstrating the VANA agent's capabilities,
    including memory, knowledge graph, vector search, and web search.
    """

    def __init__(self, interactive: bool = True):
        """
        Initialize the demo.

        Args:
            interactive: Whether to run in interactive mode
        """
        self.interactive = interactive
        self.agent = self._create_agent()
        self.session_id = None
        self.user_id = "demo_user"

    def _create_agent(self) -> VanaAgent:
        """
        Create and configure the VANA agent.

        Returns:
            Configured VanaAgent instance
        """
        # Create agent
        agent = VanaAgent(name="vana", model="gemini-1.5-pro")

        # Add memory components
        agent.short_term_memory = ShortTermMemory()
        agent.memory_bank = MemoryBankManager()

        # Register tools
        agent.register_tool("echo", echo)
        agent.register_tool("read_file", read_file)
        agent.register_tool("write_file", write_file)
        agent.register_tool("list_directory", list_directory)
        agent.register_tool("file_exists", file_exists)
        agent.register_tool("vector_search", vector_search)
        agent.register_tool("search_knowledge", search_knowledge)
        agent.register_tool("get_health_status", get_health_status)
        agent.register_tool("web_search", web_search)
        agent.register_tool("kg_query", kg_query)
        agent.register_tool("kg_store", kg_store)
        agent.register_tool("kg_relationship", kg_relationship)
        agent.register_tool("kg_extract_entities", kg_extract_entities)

        return agent

    def start_session(self) -> str:
        """
        Start a new session.

        Returns:
            Session ID
        """
        self.session_id = self.agent.create_session(self.user_id)
        logger.info(f"Started session {self.session_id}")
        return self.session_id

    def process_message(self, message: str) -> str:
        """
        Process a message with the agent.

        Args:
            message: User message

        Returns:
            Agent response
        """
        if not self.session_id:
            self.start_session()

        # Log the user message
        logger.log_message(self.session_id, self.user_id, "user", message)

        # Process the message
        response = self.agent.process_message(message, session_id=self.session_id)

        # Log the agent response
        logger.log_message(self.session_id, self.user_id, "assistant", response)

        return response

    def _wait_for_user(self, message: str = "Press Enter to continue..."):
        """
        Wait for user input if in interactive mode.

        Args:
            message: Message to display
        """
        if self.interactive:
            input(message)

    def run_demo(self):
        """Run the complete demo."""
        self._print_header()
        self.start_session()

        # Introduction
        self._run_introduction()

        # Memory demo
        self._run_memory_demo()

        # Knowledge graph demo
        self._run_knowledge_graph_demo()

        # Vector search demo
        self._run_vector_search_demo()

        # Web search demo
        self._run_web_search_demo()

        # File system demo
        self._run_file_system_demo()

        # Conclusion
        self._run_conclusion()

    def _print_header(self):
        """Print the demo header."""
        print("\n" + "=" * 80)
        print(" " * 30 + "VANA AGENT DEMO")
        print("=" * 80)
        print(
            "\nThis demo will showcase the capabilities of the VANA agent, including:"
        )
        print("  - Short-term memory and context preservation")
        print("  - Knowledge graph integration")
        print("  - Vector search for semantic retrieval")
        print("  - Web search for real-time information")
        print("  - File system operations")
        print("\nThe demo will guide you through each capability with examples.")
        print("You can interact with the agent at each step or just observe.")
        print("=" * 80 + "\n")

        self._wait_for_user()

    def _run_introduction(self):
        """Run the introduction section of the demo."""
        print("\n" + "-" * 80)
        print(" " * 30 + "INTRODUCTION")
        print("-" * 80)

        message = "Hello! Can you introduce yourself and explain what you can do?"
        print(f"\nUser: {message}")

        response = self.process_message(message)
        print(f"\nVANA: {response}")

        self._wait_for_user()

    def _run_memory_demo(self):
        """Run the memory demo section."""
        print("\n" + "-" * 80)
        print(" " * 30 + "MEMORY DEMO")
        print("-" * 80)
        print(
            "\nThis section demonstrates the agent's ability to maintain context across interactions."
        )

        # First interaction
        message1 = "My name is Demo User and I'm interested in artificial intelligence."
        print(f"\nUser: {message1}")

        response1 = self.process_message(message1)
        print(f"\nVANA: {response1}")

        self._wait_for_user()

        # Second interaction to test memory
        message2 = "What's my name and what am I interested in?"
        print(f"\nUser: {message2}")

        response2 = self.process_message(message2)
        print(f"\nVANA: {response2}")

        self._wait_for_user()

    def _run_knowledge_graph_demo(self):
        """Run the knowledge graph demo section."""
        print("\n" + "-" * 80)
        print(" " * 30 + "KNOWLEDGE GRAPH DEMO")
        print("-" * 80)
        print(
            "\nThis section demonstrates the agent's ability to store and retrieve structured knowledge."
        )

        # Store information
        message1 = "Please remember that VANA is an AI project with memory and knowledge graph capabilities."
        print(f"\nUser: {message1}")

        response1 = self.process_message(message1)
        print(f"\nVANA: {response1}")

        self._wait_for_user()

        # Store relationship
        message2 = "Also remember that VANA uses Vector Search for semantic retrieval."
        print(f"\nUser: {message2}")

        response2 = self.process_message(message2)
        print(f"\nVANA: {response2}")

        self._wait_for_user()

        # Query knowledge
        message3 = "What do you know about VANA and what technologies does it use?"
        print(f"\nUser: {message3}")

        response3 = self.process_message(message3)
        print(f"\nVANA: {response3}")

        self._wait_for_user()

    def _run_vector_search_demo(self):
        """Run the vector search demo section."""
        print("\n" + "-" * 80)
        print(" " * 30 + "VECTOR SEARCH DEMO")
        print("-" * 80)
        print(
            "\nThis section demonstrates the agent's ability to perform semantic search using Vector Search."
        )

        message = "Can you search for information about 'memory systems in AI agents'?"
        print(f"\nUser: {message}")

        response = self.process_message(message)
        print(f"\nVANA: {response}")

        self._wait_for_user()

    def _run_web_search_demo(self):
        """Run the web search demo section."""
        print("\n" + "-" * 80)
        print(" " * 30 + "WEB SEARCH DEMO")
        print("-" * 80)
        print(
            "\nThis section demonstrates the agent's ability to search the web for real-time information."
        )

        message = "What are the latest developments in AI agent technology? Please search the web."
        print(f"\nUser: {message}")

        response = self.process_message(message)
        print(f"\nVANA: {response}")

        self._wait_for_user()

    def _run_file_system_demo(self):
        """Run the file system demo section."""
        print("\n" + "-" * 80)
        print(" " * 30 + "FILE SYSTEM DEMO")
        print("-" * 80)
        print(
            "\nThis section demonstrates the agent's ability to interact with the file system."
        )

        message = "Can you list the files in the memory-bank directory and tell me what they contain?"
        print(f"\nUser: {message}")

        response = self.process_message(message)
        print(f"\nVANA: {response}")

        self._wait_for_user()

    def _run_conclusion(self):
        """Run the conclusion section of the demo."""
        print("\n" + "-" * 80)
        print(" " * 30 + "CONCLUSION")
        print("-" * 80)

        message = "Thank you for the demo. Can you summarize what capabilities you've demonstrated?"
        print(f"\nUser: {message}")

        response = self.process_message(message)
        print(f"\nVANA: {response}")

        print("\n" + "=" * 80)
        print(" " * 30 + "DEMO COMPLETE")
        print("=" * 80 + "\n")


def parse_args():
    """
    Parse command-line arguments.

    Returns:
        Parsed arguments
    """
    parser = argparse.ArgumentParser(description="VANA Agent Demo")
    parser.add_argument(
        "--non-interactive", action="store_true", help="Run in non-interactive mode"
    )

    return parser.parse_args()


def main():
    """Main entry point for the demo."""
    args = parse_args()
    demo = VanaAgentDemo(interactive=not args.non_interactive)
    demo.run_demo()


if __name__ == "__main__":
    main()
