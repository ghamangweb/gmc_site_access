#!/bin/sh
# Ensures every staged text file ends with a newline.
for f in "$@"; do
  grep -Iq . "$f" 2>/dev/null || continue
  [ -s "$f" ] || continue
  [ "$(tail -c1 "$f")" = "" ] || printf '\n' >> "$f"
done
