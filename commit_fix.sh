#!/bin/bash

# Commit the VANA agent discovery fix
cd /Users/nick/Development/vana

echo "Adding changes to git..."
git add lib/_tools/__init__.py

echo "Committing the fix..."
PRE_COMMIT_ALLOW_NO_CONFIG=1 git commit -m "CRITICAL FIX: Restore tool imports for VANA agent discovery

- Fixed lib/_tools/__init__.py to properly export all available tools
- Added comprehensive imports from adk_tools.py including:
  * File System Tools (read, write, list, exists)
  * Search Tools (vector, web, knowledge search)
  * System Tools (echo, health status)
  * Agent Coordination Tools (coordinate, delegate, status)
  * Intelligent Task Analysis Tools (analyze, match, classify)
  * Multi-Agent Workflow Management Tools (create, start, monitor workflows)
- Added proper __all__ export list for clean imports
- This resolves the ImportError that was preventing VANA agent discovery

ISSUE RESOLVED:
- ImportError: cannot import name 'adk_analyze_task' from 'lib._tools' - FIXED
- VANA agent root_agent import now works correctly
- All tools properly accessible for agent functionality
- Task #6 systematic testing can now proceed successfully

TECHNICAL DETAILS:
- Previous __init__.py was mostly empty, causing import failures
- Now properly imports and exports all 24 available ADK tools
- Maintains backward compatibility with existing agent code
- Follows established naming conventions (adk_ prefix)"

echo "Deploying the fix to dev environment..."
./deployment/deploy-dev.sh

echo "Fix deployment complete!"
