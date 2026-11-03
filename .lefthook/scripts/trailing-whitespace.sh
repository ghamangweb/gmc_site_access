#!/bin/sh
# Strips trailing whitespace from every staged text file.
for f in "$@"; do
  grep -Iq . "$f" 2>/dev/null || continue
  sed -i 's/[ \t]*$//' "$f"
done
