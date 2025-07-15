#!/usr/bin/env python3
"""Run ADK with Google's default web UI for debugging"""

from google.adk.runners import WebRunner
from agents.vana.team import root_agent

# This will start the ADK with Google's default web interface
runner = WebRunner(agent=root_agent, app_name="vana-debug")

if __name__ == "__main__":
    print("Starting ADK with Google's web UI...")
    print("Access at: http://localhost:8080")
    runner.run(port=8080)