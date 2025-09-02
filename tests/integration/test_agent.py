# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# mypy: disable-error-code="union-attr"
import os

import pytest
from google.adk.agents import LlmAgent
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.config import config


def test_agent_stream() -> None:
    """
    Integration test for the agent stream functionality.
    Tests that the agent returns valid streaming responses.
    """
    # Skip test in CI environment if no real credentials are available
    if os.getenv("CI") and not os.getenv("GOOGLE_API_KEY"):
        pytest.skip("Integration test requires Google API credentials")

    # Ensure we use the production project ID for integration tests
    if os.getenv("CI"):
        # Override the CI conftest.py setting for integration tests
        os.environ["GOOGLE_CLOUD_PROJECT"] = "analystai-454200"

    # Use a simple LLM agent instead of the complex interactive planner
    # This tests the basic ADK functionality without the research workflow complexity
    simple_agent = LlmAgent(
        model=config.worker_model,
        name="test_agent",
        description="Simple test agent for integration testing",
        instruction="You are a helpful assistant. Answer the user's question directly and concisely.",
    )

    session_service = InMemorySessionService()
    session = session_service.create_session_sync(user_id="test_user", app_name="test")
    runner = Runner(
        agent=simple_agent, session_service=session_service, app_name="test"
    )

    message = types.Content(
        role="user", parts=[types.Part.from_text(text="What is 2+2?")]
    )

    try:
        events = list(
            runner.run(
                new_message=message,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        )

        # Debug information
        print(f"Debug: Received {len(events)} events")
        for i, event in enumerate(events):
            print(
                f"Event {i}: type={type(event)}, has_content={hasattr(event, 'content')}"
            )
            if hasattr(event, "content") and event.content:
                print(f"  Content: {event.content}")

    except Exception as e:
        print(f"Error during agent run: {e}")
        import traceback

        traceback.print_exc()
        # Re-raise the exception to fail the test
        raise

    assert len(events) > 0, (
        f"Expected at least one message, got {len(events)} events. Check Google API key and project configuration."
    )

    # Check that we got some meaningful content
    has_text_content = False
    for event in events:
        if (
            event.content
            and event.content.parts
            and any(
                part.text and len(part.text.strip()) > 0 for part in event.content.parts
            )
        ):
            has_text_content = True
            break

    assert has_text_content, "Expected at least one message with text content"
