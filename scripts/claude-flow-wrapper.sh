#!/bin/bash
# Wrapper script for claude-flow to suppress deprecation warnings

# Run claude-flow with NODE_NO_WARNINGS to suppress deprecation warnings
NODE_NO_WARNINGS=1 npx claude-flow "$@"