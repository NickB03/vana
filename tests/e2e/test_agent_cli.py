#!/usr/bin/env python3
"""
End-to-end tests for the VANA agent CLI.
"""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock
import subprocess
import tempfile

# Add the project root to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
sys.path.append(project_root)

from agent.cli import VanaCLI

class TestAgentCLI(unittest.TestCase):
    """End-to-end tests for the VANA agent CLI."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create a CLI instance with a mock agent
        self.cli = VanaCLI()
        self.cli.agent = MagicMock()
        self.cli.agent.create_session.return_value = "test_session_id"
        self.cli.agent.process_message.return_value = "Mock agent response"
        
        # Create a temporary directory for test files
        self.temp_dir = tempfile.TemporaryDirectory()
    
    def tearDown(self):
        """Tear down test fixtures."""
        self.temp_dir.cleanup()
    
    def test_start_session(self):
        """Test starting a session."""
        session_id = self.cli.start_session()
        
        # Check that the agent's create_session method was called
        self.cli.agent.create_session.assert_called_once_with("cli_user")
        
        # Check that the session ID was set
        self.assertEqual(session_id, "test_session_id")
        self.assertEqual(self.cli.session_id, "test_session_id")
    
    def test_process_message(self):
        """Test processing a message."""
        # Process a message
        response = self.cli.process_message("Test message")
        
        # Check that the agent's process_message method was called
        self.cli.agent.process_message.assert_called_once_with(
            "Test message", session_id="test_session_id"
        )
        
        # Check that the response is correct
        self.assertEqual(response, "Mock agent response")
    
    def test_process_message_no_session(self):
        """Test processing a message without a session."""
        # Reset the session ID
        self.cli.session_id = None
        
        # Process a message
        response = self.cli.process_message("Test message")
        
        # Check that a session was created
        self.cli.agent.create_session.assert_called_once_with("cli_user")
        
        # Check that the agent's process_message method was called
        self.cli.agent.process_message.assert_called_once_with(
            "Test message", session_id="test_session_id"
        )
        
        # Check that the response is correct
        self.assertEqual(response, "Mock agent response")
    
    @patch("builtins.input", side_effect=["Test message", "exit"])
    @patch("builtins.print")
    def test_interactive_mode(self, mock_print, mock_input):
        """Test interactive mode."""
        # Run interactive mode
        self.cli.interactive_mode()
        
        # Check that a session was created
        self.cli.agent.create_session.assert_called_once_with("cli_user")
        
        # Check that the agent's process_message method was called
        self.cli.agent.process_message.assert_called_once_with(
            "Test message", session_id="test_session_id"
        )
    
    @patch("builtins.input", side_effect=["help", "exit"])
    @patch("builtins.print")
    def test_interactive_mode_help(self, mock_print, mock_input):
        """Test interactive mode with help command."""
        # Set up mock tools
        self.cli.agent.tools = {"echo": None, "read_file": None}
        
        # Run interactive mode
        self.cli.interactive_mode()
        
        # Check that a session was created
        self.cli.agent.create_session.assert_called_once_with("cli_user")
        
        # Check that the agent's process_message method was not called
        self.cli.agent.process_message.assert_not_called()
    
    @patch("subprocess.run")
    def test_launch_web_ui(self, mock_run):
        """Test launching the web UI."""
        # Launch the web UI
        self.cli.launch_web_ui(port=8080)
        
        # Check that subprocess.run was called with the correct arguments
        mock_run.assert_called_once()
        args, kwargs = mock_run.call_args
        self.assertEqual(args[0], ["adk", "web", "--port", "8080"])
        self.assertTrue(kwargs["cwd"].endswith("vana"))
    
    @patch("subprocess.run", side_effect=FileNotFoundError)
    @patch("builtins.print")
    def test_launch_web_ui_error(self, mock_print, mock_run):
        """Test launching the web UI with an error."""
        # Launch the web UI
        self.cli.launch_web_ui(port=8080)
        
        # Check that subprocess.run was called with the correct arguments
        mock_run.assert_called_once()
        args, kwargs = mock_run.call_args
        self.assertEqual(args[0], ["adk", "web", "--port", "8080"])
        
        # Check that an error message was printed
        mock_print.assert_any_call("Error: ADK command not found. Please make sure the Google ADK is installed.")

class TestAgentCLICommandLine(unittest.TestCase):
    """Tests for the VANA agent CLI command-line interface."""
    
    @patch("agent.cli.VanaCLI")
    @patch("agent.cli.parse_args")
    def test_main_interactive(self, mock_parse_args, mock_cli_class):
        """Test main function with interactive mode."""
        # Set up mock args
        mock_args = MagicMock()
        mock_args.mode = "interactive"
        mock_parse_args.return_value = mock_args
        
        # Set up mock CLI
        mock_cli = MagicMock()
        mock_cli_class.return_value = mock_cli
        
        # Run main
        from agent.cli import main
        main()
        
        # Check that interactive_mode was called
        mock_cli.interactive_mode.assert_called_once()
    
    @patch("agent.cli.VanaCLI")
    @patch("agent.cli.parse_args")
    def test_main_web(self, mock_parse_args, mock_cli_class):
        """Test main function with web mode."""
        # Set up mock args
        mock_args = MagicMock()
        mock_args.mode = "web"
        mock_args.port = 8080
        mock_parse_args.return_value = mock_args
        
        # Set up mock CLI
        mock_cli = MagicMock()
        mock_cli_class.return_value = mock_cli
        
        # Run main
        from agent.cli import main
        main()
        
        # Check that launch_web_ui was called
        mock_cli.launch_web_ui.assert_called_once_with(port=8080)
    
    @patch("agent.cli.VanaCLI")
    @patch("agent.cli.parse_args")
    def test_main_message(self, mock_parse_args, mock_cli_class):
        """Test main function with message mode."""
        # Set up mock args
        mock_args = MagicMock()
        mock_args.mode = "message"
        mock_args.message = "Test message"
        mock_parse_args.return_value = mock_args
        
        # Set up mock CLI
        mock_cli = MagicMock()
        mock_cli.process_message.return_value = "Mock response"
        mock_cli_class.return_value = mock_cli
        
        # Run main
        from agent.cli import main
        main()
        
        # Check that process_message was called
        mock_cli.process_message.assert_called_once_with("Test message")
    
    @patch("agent.cli.VanaCLI")
    @patch("agent.cli.parse_args")
    def test_main_default(self, mock_parse_args, mock_cli_class):
        """Test main function with default mode."""
        # Set up mock args
        mock_args = MagicMock()
        mock_args.mode = None
        mock_parse_args.return_value = mock_args
        
        # Set up mock CLI
        mock_cli = MagicMock()
        mock_cli_class.return_value = mock_cli
        
        # Run main
        from agent.cli import main
        main()
        
        # Check that interactive_mode was called
        mock_cli.interactive_mode.assert_called_once()

if __name__ == "__main__":
    unittest.main()
