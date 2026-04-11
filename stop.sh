#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT_DIR/.myquiz.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "MyQuiz is not running."
  exit 0
fi

PID="$(cat "$PID_FILE")"
if kill -0 "$PID" >/dev/null 2>&1; then
  kill "$PID"
  echo "Stopped MyQuiz (PID $PID)."
else
  echo "MyQuiz process $PID was not running."
fi

rm -f "$PID_FILE"
