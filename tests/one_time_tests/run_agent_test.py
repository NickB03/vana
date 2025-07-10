import os
import sys
import site

# --- Environment Diagnostics ---
print("--- Python Environment Diagnostics ---")
print(f"Python Executable: {sys.executable}")
print(f"Python Version: {sys.version}")
print("\n--- sys.path ---")
for i, path in enumerate(sys.path):
    print(f"{i}: {path}")

print("\n--- site packages ---")
try:
    print(f"Site packages location: {site.getsitepackages()}")
except Exception as e:
    print(f"Could not get site packages: {e}")

print("\n--- Attempting to import google.generativeai ---")
try:
    import google.generativeai as genai
    print("\n✅ SUCCESS: 'google.generativeai' imported successfully.")
    print(f"   Location: {genai.__file__}")
except ImportError as e:
    print(f"\n❌ FAILED: Could not import 'google.generativeai'.")
    print(f"   Error: {e}")
except Exception as e:
    print(f"\n❌ FAILED: An unexpected error occurred during import.")
    print(f"   Error: {e}")

print("\n--- Diagnostics Complete ---")
