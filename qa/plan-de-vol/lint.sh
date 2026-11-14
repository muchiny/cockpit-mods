#!/usr/bin/env bash
# Lint et contrôle de types du mod plan-de-vol, depuis le dossier du mod.
set -euo pipefail
QA="$(cd "$(dirname "$0")" && pwd)"
MOD="$QA/../../plan-de-vol"
cd "$MOD"
"$QA/../node_modules/.bin/tsc" -p .
"$QA/../node_modules/.bin/eslint" --config "$QA/eslint.config.mjs" --max-warnings 0 hooks tests types "$@"
