#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT_DIR/.myquiz.pid"
LOG_FILE="$ROOT_DIR/.myquiz.log"
PORT="${PORT:-8000}"

if [[ -f "$PID_FILE" ]]; then
  EXISTING_PID="$(cat "$PID_FILE")"
  if kill -0 "$EXISTING_PID" >/dev/null 2>&1; then
    echo "MyQuiz is already running on http://localhost:$PORT (PID $EXISTING_PID)"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

cd "$ROOT_DIR"
nohup env PORT="$PORT" python3 server.py >"$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" >"$PID_FILE"
echo "MyQuiz started on http://localhost:$PORT"
echo "PID: $SERVER_PID"
echo "Log: $LOG_FILE"
