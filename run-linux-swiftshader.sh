#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
GPU_MODE=swiftshader exec "$ROOT/run-linux.sh" "$@"
