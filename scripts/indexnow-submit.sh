#!/usr/bin/env bash
# Submit site URLs to IndexNow so search engines (Bing, Naver, Seznam, Yandex...)
# re-crawl them promptly. Called automatically by the git post-commit hook.
set -u

HOST="coding.mcppla.net"
KEY="d6e40cc859e9445e966d1760442505f8"
KEY_LOCATION="https://${HOST}/${KEY}.txt"

PAYLOAD=$(cat <<EOF
{
  "host": "${HOST}",
  "key": "${KEY}",
  "keyLocation": "${KEY_LOCATION}",
  "urlList": [
    "https://${HOST}/",
    "https://${HOST}/ping"
  ]
}
EOF
)

submit() {
  local endpoint="$1"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -X POST "$endpoint" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d "$PAYLOAD")
  echo "IndexNow ${endpoint}: HTTP ${code}"
}

submit "https://api.indexnow.org/IndexNow"
submit "https://www.bing.com/IndexNow"
