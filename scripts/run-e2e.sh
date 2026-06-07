#!/usr/bin/env bash
# Wrapper for Mocha E2E tests that makes --spec override the default spec glob
# instead of being additive with it.

# Check if --spec is in the arguments
has_spec=false
for arg in "$@"; do
  if [[ "$arg" == "--spec" || "$arg" == --spec=* ]]; then
    has_spec=true
    break
  fi
done

# If no --spec provided, use the default glob
if [ "$has_spec" = false ]; then
  set -- "test/e2e/**/*.test.ts" "$@"
fi

export TSX_TSCONFIG_PATH=test/e2e/tsconfig.json
exec npx mocha --config test/e2e/.mocharc.json "$@"
