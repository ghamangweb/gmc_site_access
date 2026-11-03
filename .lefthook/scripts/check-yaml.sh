#!/bin/sh
# Fails if any staged YAML file cannot be parsed.
# Windows Python installs provide `python` rather than `python3`.
if command -v python3 >/dev/null 2>&1; then
  py=python3
else
  py=python
fi

for f in "$@"; do
  "$py" -c "import yaml, sys; yaml.safe_load(open(sys.argv[1]))" "$f" || exit 1
done
