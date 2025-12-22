#!/usr/bin/env bash
set -euo pipefail

rg --files -g '*.py' | xargs -r python3 -m py_compile
