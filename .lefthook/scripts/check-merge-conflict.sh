#!/bin/sh
# Fails if any staged text file still contains merge conflict markers.
for f in "$@"; do
  grep -Iq . "$f" 2>/dev/null || continue
  if grep -nE '^(<{7}|={7}|>{7})( |$)' "$f"; then
    echo "Merge conflict markers found in $f"
    exit 1
  fi
done
