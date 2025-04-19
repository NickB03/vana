
"""
AgentBridge — routes prompt to Gemini and logs result to Korvus
"""

from gemini_client import GeminiClient
from korvus_writer import log_memory
from searcher import search_memory

gemini = GeminiClient()

def run_agent(prompt: str, metadata: dict):
    context_chunks = search_memory(prompt, **metadata)
    context_text = "\n\n".join(chunk["content"] for chunk in context_chunks)

    full_prompt = f"""
    Context:
    {context_text}

    Task:
    {prompt}
    """
    
    response = gemini.generate(full_prompt)
    log_memory(response, metadata)
    return response
