#!/usr/bin/env python3
"""
CLI Interface for VANA Agent

This module provides a command-line interface for interacting with the VANA agent.
It supports both direct CLI interaction and launching the ADK web UI.
"""

import argparse
import logging
import os
import subprocess

from agent.core import VanaAgent
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

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class VanaCLI:
    """
    Command-line interface for the VANA agent.

    This class provides methods for interacting with the VANA agent via the command line,
    including direct CLI interaction and launching the ADK web UI.
    """

    def __init__(self):
        """Initialize the CLI interface."""
        self.agent = self._create_agent()
        self.session_id = None
        self.user_id = "cli_user"

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

        response = self.agent.process_message(message, session_id=self.session_id)

        return response

    def interactive_mode(self):
        """Run the CLI in interactive mode."""
        print("VANA Agent CLI - Interactive Mode")
        print("Type 'exit' or 'quit' to exit, 'help' for help")

        self.start_session()

        while True:
            try:
                user_input = input("\nYou: ")

                if user_input.lower() in ["exit", "quit"]:
                    print("Exiting VANA Agent CLI")
                    break

                if user_input.lower() == "help":
                    self._print_help()
                    continue

                response = self.process_message(user_input)
                print(f"\nVANA: {response}")

            except KeyboardInterrupt:
                print("\nExiting VANA Agent CLI")
                break
            except Exception as e:
                print(f"Error: {str(e)}")

    def _print_help(self):
        """Print help information."""
        print("\nVANA Agent CLI Help:")
        print("  - Type any message to interact with the agent")
        print("  - Use '!command' to execute agent tools directly")
        print("  - Type 'exit' or 'quit' to exit")
        print("\nAvailable tools:")
        for tool_name in self.agent.tools:
            print(f"  - !{tool_name}")

    def launch_web_ui(self, port: int = 8080):
        """
        Launch the ADK web UI.

        Args:
            port: Port to run the web UI on
        """
        try:
            # Get the current directory
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.abspath(os.path.join(current_dir, ".."))

            # Run the ADK web command
            print(f"Launching ADK web UI on port {port}...")
            subprocess.run(["adk", "web", "--port", str(port)], cwd=project_root)
        except FileNotFoundError:
            print(
                "Error: ADK command not found. Please make sure the Google ADK is installed."
            )
            print("You can install it with: pip install google-adk")
        except Exception as e:
            print(f"Error launching ADK web UI: {str(e)}")


def parse_args():
    """
    Parse command-line arguments.

    Returns:
        Parsed arguments
    """
    parser = argparse.ArgumentParser(description="VANA Agent CLI")

    # Add subparsers for different modes
    subparsers = parser.add_subparsers(dest="mode", help="Mode to run the CLI in")

    # Interactive mode
    interactive_parser = subparsers.add_parser(
        "interactive", help="Run in interactive mode"
    )

    # Web UI mode
    web_parser = subparsers.add_parser("web", help="Launch the ADK web UI")
    web_parser.add_argument(
        "--port", type=int, default=8080, help="Port to run the web UI on"
    )

    # Single message mode
    message_parser = subparsers.add_parser("message", help="Process a single message")
    message_parser.add_argument("message", help="Message to process")

    return parser.parse_args()


def main():
    """Main entry point for the CLI."""
    args = parse_args()
    cli = VanaCLI()

    if args.mode == "interactive":
        cli.interactive_mode()
    elif args.mode == "web":
        cli.launch_web_ui(port=args.port)
    elif args.mode == "message":
        response = cli.process_message(args.message)
        print(response)
    else:
        # Default to interactive mode
        cli.interactive_mode()


if __name__ == "__main__":
    main()
