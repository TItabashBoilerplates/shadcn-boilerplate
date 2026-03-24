#!/bin/bash

# Load direnv environment and persist it for Claude Code's Bash tool
if [ -n "$CLAUDE_ENV_FILE" ] && command -v direnv &> /dev/null; then
  direnv export bash 2>/dev/null >> "$CLAUDE_ENV_FILE"
fi

exit 0
