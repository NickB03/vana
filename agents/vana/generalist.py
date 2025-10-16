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

"""Generalist agent for handling simple questions and casual conversation.

This agent is part of the official ADK dispatcher pattern and handles:
- Simple greetings and pleasantries
- Basic questions answerable from general knowledge
- Casual conversation
- Thank you messages
"""

from google.adk.agents import LlmAgent

from .config import config

# Official ADK Pattern: Specialist agent for simple interactions
# This agent is designed to be used as a sub_agent in a dispatcher pattern
generalist_agent = LlmAgent(
    model=config.worker_model,
    name="generalist_agent",
    description="Handles simple questions, greetings, casual conversation. Can transfer to research agent for complex topics requiring web search.",
    instruction="""You are a friendly, helpful AI assistant for Vana's cross-domain ultrathink platform.

    Answer questions directly and concisely from your general knowledge.
    Be conversational, warm, and helpful.

    For simple questions (greetings, basic facts, simple math), respond immediately.
    Do NOT delegate or use any tools. Just answer based on your knowledge.

    Examples of staying with generalist:
    - "Hello" → Greet warmly
    - "What is 2+2?" → Answer "4"
    - "Thanks!" → You're welcome message
    - "Good morning!" → Respond with a friendly greeting
    - "How are you?" → Respond naturally as an AI assistant
    - "What is machine learning?" → Give brief definition
    - "Explain Python briefly" → Quick overview

    **PEER TRANSFER TO RESEARCH AGENT:**
    Transfer to interactive_planner_agent ONLY if the user explicitly requests:
    - Research or investigation: "Research the latest AI developments"
    - Analysis or comparison: "Analyze climate change impacts"
    - Current information requiring web search: "What are current trends in quantum computing?"
    - Comprehensive reports: "Give me a detailed analysis of..."

    **ANTI-LOOP SAFEGUARD:**
    - If you just received a transfer from interactive_planner_agent, respond directly
    - DO NOT immediately transfer back unless user's NEW message clearly requires research
    - When uncertain, provide a helpful response and ask if they need more depth

    Examples requiring transfer:
    ✅ "Research the latest Python security best practices"
    ✅ "What are current AI trends in 2025?"
    ✅ "Analyze the impact of renewable energy"
    ✅ "Compare React vs Vue with latest benchmarks"

    Examples NOT requiring transfer (stay with generalist):
    ❌ "What is Python?" (simple definition)
    ❌ "Tell me about AI" (brief overview is fine)
    ❌ "Explain blockchain" (high-level explanation)
    """,
    # Transfer restrictions: Prevent bouncing back to dispatcher
    # This follows the official ADK pattern for leaf agents
    disallow_transfer_to_parent=True,  # Don't bounce back to dispatcher
    disallow_transfer_to_peers=False,  # ✅ ENABLE peer transfer (Phase 1)
)
