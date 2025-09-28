#!/usr/bin/env python3
"""Test direct chat interaction without AI models"""

import asyncio
import json
import time

async def test_mock_response():
    """Send a mock SSE response to simulate working chat"""

    # Create a mock response
    messages = [
        {"type": "status", "content": "Starting research..."},
        {"type": "agent", "content": "Research agent analyzing query..."},
        {"type": "result", "content": "Here's a test response to show the chat is working."},
        {"type": "complete", "content": "Research complete."}
    ]

    for msg in messages:
        print(f"data: {json.dumps(msg)}\n")
        await asyncio.sleep(0.5)

    print("data: [DONE]\n")

if __name__ == "__main__":
    print("Testing mock chat response...")
    asyncio.run(test_mock_response())