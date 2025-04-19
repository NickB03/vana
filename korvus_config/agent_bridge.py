
"""
AgentBridge — routes prompt to Gemini and logs result to Korvus
"""

from gemini_client import GeminiClient
from korvus_writer import log_memory

gemini = GeminiClient()

def run_agent(prompt: str, metadata: dict):
    response = gemini.generate(prompt)
    log_memory(response, metadata)
    return response
