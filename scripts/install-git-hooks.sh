#!/usr/bin/env bash
# Copies repo git hooks into .git/hooks (run via npm prepare).
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
hooks_src="$root/scripts/git-hooks"
hooks_dst="$root/.git/hooks"

if [[ ! -d "$hooks_dst" ]]; then
  echo "No .git/hooks directory — skip hook install"
  exit 0
fi

for hook in "$hooks_src"/*; do
  [[ -f "$hook" ]] || continue
  name="$(basename "$hook")"
  cp "$hook" "$hooks_dst/$name"
  chmod +x "$hooks_dst/$name"
  echo "Installed git hook: $name"
done
