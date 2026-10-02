#!/usr/bin/env sh
set -eu
: "${AI_SERVICE_KEY:?Set AI_SERVICE_KEY}"
: "${1:?Usage: mock-ai-event.sh CAMERA_UUID}"
curl --fail-with-body -X POST "${API_BASE_URL:-http://localhost:8080}/api/detection-events" \
  -H 'Content-Type: application/json' -H "X-AI-SERVICE-KEY: $AI_SERVICE_KEY" \
  -d "{\"cameraId\":\"$1\",\"eventType\":\"DROWNING\",\"confidence\":0.94,\"detectedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
