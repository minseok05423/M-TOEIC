#!/bin/bash
# Claude Code cloud sessions (e.g. started from the Claude app on a phone) run this at startup
# via the SessionStart hook in .claude/settings.json. Locally it does nothing.
#
# The cloud image ships Node 22; the scripts and tests here run .ts files directly, which needs
# Node 24 (same as the codespace). So: install Node 24 if missing, then npm ci.

if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

NODE_VERSION=24.22.2
NODE_DIR="$HOME/.node-v$NODE_VERSION"

if [ "$(node --version 2>/dev/null | cut -d. -f1)" != "v24" ]; then
  if [ ! -x "$NODE_DIR/bin/node" ]; then
    mkdir -p "$NODE_DIR"
    curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz" \
      | tar -xz -C "$NODE_DIR" --strip-components=1 || { echo "Node $NODE_VERSION download failed" >&2; rm -rf "$NODE_DIR"; exit 0; }
  fi
  export PATH="$NODE_DIR/bin:$PATH"
  # Make Node 24 the default for every later command in the session
  [ -n "$CLAUDE_ENV_FILE" ] && echo "export PATH=\"$NODE_DIR/bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi

cd "$CLAUDE_PROJECT_DIR" || exit 1
hashes=node_modules/.cloud-setup.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"
  if npm ci --no-audit --no-fund; then
    sha256sum scripts/cloud-setup.sh package.json package-lock.json > "$hashes" || rm -f "$hashes"
  fi
fi
exit 0
