#!/bin/sh
# Fails if any staged JSON file cannot be parsed.
# The error is caught explicitly: Bun 1.3 exits 0 when an uncaught
# JSON parse error is thrown inside `bun -e`.
for f in "$@"; do
  bun -e "try { JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')) } catch (e) { console.error(process.argv[1] + ': ' + e.message); process.exit(1) }" "$f" || exit 1
done
