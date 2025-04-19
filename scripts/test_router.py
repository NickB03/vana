
"""
Test script: Post UI payload to /run and print output
"""

import requests
import json

with open("scripts/ui_test_payload.json") as f:
    payload = json.load(f)

res = requests.post("http://localhost:8000/run", json=payload)

if res.status_code == 200:
    print("\n--- Response ---")
    print(res.json())
else:
    print("FAILED::", res.status_code)
    print(res.text)
