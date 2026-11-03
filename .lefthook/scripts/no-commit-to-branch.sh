#!/bin/sh
# Blocks commits on branches that do not follow the naming convention.
branch=$(git rev-parse --abbrev-ref HEAD)
if ! echo "$branch" | grep -Eq '^(fix|feature|bugfix|chore|hotfix)/[a-zA-Z0-9-]+$'; then
  echo "Direct commits to '$branch' are not allowed. Use fix/, feature/, bugfix/, chore/, or hotfix/ branches."
  exit 1
fi
