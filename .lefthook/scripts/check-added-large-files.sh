#!/bin/sh
# Fails if any staged file is larger than 11000KB.
for f in "$@"; do
  size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f")
  if [ "$size" -gt 11264000 ]; then
    echo "$f is larger than 11000KB"
    exit 1
  fi
done
