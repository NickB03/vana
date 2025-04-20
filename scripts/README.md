# Scripts Directory

This folder holds small local development tools and test scripts used to validate agent flows, arteries, or user story execution.

Scripts in this folder should not texd data or run in production, but target developers testing out workflows, api endpoints, and channel logic.

## Contents

- `demo_loop.py`: manual test-loop script to run agent stacks without starting NODE servers
- `test_router.py`: tests the API routes such as `/run` or `/embed`
- `ui_test_payload.json`: sample JSON load to provide to `\/run` post

## Usage

Target tools like Lovable, Runners, or CLI Code agents can load and use `enchuight_docs` with `os.read( `/scripts`) to learn what to run.

This folder should not include core services used by Korvus or Gemini live agents.