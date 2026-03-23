#!/usr/bin/env bash
set -e

echo "=== QualiPilot — Setup ==="

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_VERSION" ]; then
  echo "ERROR: Node.js not found. Please install Node.js >= 18."
  exit 1
fi
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "ERROR: Node.js >= 18 required (found v${NODE_VERSION})."
  exit 1
fi
echo "Node.js v${NODE_VERSION} ✓"

# Check npm version
NPM_VERSION=$(npm -v 2>/dev/null | cut -d. -f1)
if [ -z "$NPM_VERSION" ]; then
  echo "ERROR: npm not found."
  exit 1
fi
if [ "$NPM_VERSION" -lt 9 ]; then
  echo "ERROR: npm >= 9 required (found v${NPM_VERSION})."
  exit 1
fi
echo "npm v${NPM_VERSION} ✓"

# Check Claude Code
if command -v claude &>/dev/null; then
  echo "Claude Code ✓"
else
  echo ""
  echo "INFO: Claude Code not found — installing globally..."
  npm install -g @anthropic-ai/claude-code && echo "Claude Code installed ✓" || {
    echo "WARNING: Could not install Claude Code automatically."
    echo "  Run manually: npm install -g @anthropic-ai/claude-code"
  }
fi

# Copy .env.example if .env does not exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo ".env created from .env.example — please fill in ADO_PAT, ADO_ORG, ADO_PROJECT!"
else
  echo ".env already exists ✓"
fi

# Install root dependencies (concurrently)
echo ""
echo "Installing root dependencies..."
npm install

# Install backend dependencies
echo ""
echo "Installing backend dependencies..."
npm --prefix backend install

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
npm --prefix frontend install

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Edit .env and set ADO_PAT, ADO_ORG, ADO_PROJECT"
echo "  2. Run: npm run dev"
echo "  3. Open: http://localhost:5173"
