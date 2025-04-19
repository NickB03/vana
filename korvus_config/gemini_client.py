
"""
GeminiClient — routes LLM calls through Vertex AI
"""

import os
import requests

class GeminiClient:
    def __init__(self):
        self.project = os.getenv("GCP_PROJECT_ID")
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.base_url = f"https://us-central1-aiplatform.googleapis.com/v1/projects/{self.project}/locations/us-central1/publishers/google/models/gemini-pro:predict"

    def generate(self, prompt: str):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        body = {
            "instances": [{"prompt": prompt}]
        }
        r = requests.post(self.base_url, headers=headers, json=body)
        r.raise_for_status()
        return r.json()["predictions"][0]["content"]
