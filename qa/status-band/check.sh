#!/usr/bin/env bash
# The mod's quality gate: types, lint, validation, tests, coverage. Exits
# non-zero on the first failure. Usage: check.sh [mod folder] (default: the
# mod beside this bench, ../../status-band). Mutation testing stays out of it, at about 35 minutes:
# node mutation.mjs [mod folder] [--survivors].
# The dependencies are the mods' benches' own, one level up: `npm ci` in
# qa/ installs them for this bench and plan-de-vol's alike.
set -euo pipefail

tooling="$(cd "$(dirname "$0")" && pwd)"
bin="$tooling/../node_modules/.bin"
mod="$(cd "${1:-$tooling/../../status-band}" && pwd)"
cd "$mod"

echo "== types (tsc) =="
"$bin/tsc" -p .

echo "== lint (eslint) =="
"$bin/eslint" -c "$tooling/eslint.config.mjs" --max-warnings 0 hooks types

echo "== validate =="
claude plugin validate .

echo "== tests =="
claude plugin test .

echo "== coverage (100 % required) =="
node "$tooling/coverage.mjs" "$mod" --strict
