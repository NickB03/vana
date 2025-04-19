
"""
Test script: Post UI payload to /run and print output
"""

import requests
import json

with open("scripts/ui_test_payload.json") as f:
    payload = json.load(f)

res = requests.post("http://localhost:8000/run", json=payload)

print("\n--- Response ---")
print(res.status_code)
print(res.json())
