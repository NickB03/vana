
"""
AgentBridge — routes prompt to Gemini and logs result to Korvus with personalized metadata

- REF: gemini_client.py
- REF: korvus_writer.py
- REF: searcher.py
"""

from gemini_client import GeminiClient
from korvus_writer import log_memory
from searcher import search_memory
import os

gemini = GeminiClient()

def run_agent(prompt: str,metadata: dict):
    agent_id = metadata.get("agent_id", "")
    primary_instruction = ""
    # Load system prompt based on agent
    if agent_id:
        path = f"gemini_prompts/{agent_id}.system.md"
        if os.path.exists(path):
            with open(path) as f:
                  primary_instruction = f.read() + "\n\n"

    context_chunks = search_memory(prompt, **metadata)
    context_text = "\n\n".join(chunk["content"] for chunk in context_chunks)

    full_prompt = f"""{primary_instruction}\nContext:\n{context_text}\n\nTask: {prompt}"""
    response = gemini.generate(full_prompt)
    log_memory(response, metadata)
    return response
