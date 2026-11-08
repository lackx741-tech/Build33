#!/usr/bin/env sh
# Post-deployment verification (spec §14: deployment verification, §15).
# Checks that every public surface answers correctly after a deploy.
set -eu

BASE="${BASE_URL:-https://localhost}"
FRONTEND="${FRONTEND_URL:-$BASE}"
API="${API_URL:-$BASE/api}"
RPC="${RPC_URL:-$BASE/rpc}"
WS="${WS_URL:-$BASE/ws}"

fail=0

# Self-signed certificates (the default for local/staging) fail strict
# verification; set CURL_INSECURE=1 to skip it.
CURL_OPTS=""
if [ "${CURL_INSECURE:-0}" = "1" ]; then
  CURL_OPTS="-k"
fi
# Services start concurrently; retry briefly so a slow container does not fail
# the check spuriously.
CURL_OPTS="$CURL_OPTS --retry 5 --retry-delay 2 --retry-connrefused --max-time 15"

check() {
  name="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo "  ok   $name"
  else
    echo "  FAIL $name"
    fail=1
  fi
}

echo "verifying deployment at $BASE"

check "frontend index"      curl $CURL_OPTS -fsS -o /dev/null "$FRONTEND/"
check "node api health"     curl $CURL_OPTS -fsS -o /dev/null "$API/health"
check "node api networks"   curl $CURL_OPTS -fsS -o /dev/null "$API/networks"
check "php gateway health"  curl $CURL_OPTS -fsS -o /dev/null "$RPC/api/health"

# TLS certificate validity (skipped for plain-HTTP targets).
case "$BASE" in
  https://*)
    if [ "${CURL_INSECURE:-0}" = "1" ]; then
      echo "  skip tls certificate (CURL_INSECURE=1)"
    else
      HOSTPORT="$(echo "$BASE" | sed -e 's#https://##' -e 's#/.*##')"
      HOST="${HOSTPORT%%:*}"
      if openssl s_client -connect "${HOSTPORT}:443" -servername "$HOST" -verify_return_error </dev/null >/dev/null 2>&1; then
        echo "  ok   tls certificate"
      else
        echo "  FAIL tls certificate"
        fail=1
      fi
    fi
    ;;
  *) echo "  skip tls certificate (non-https base)" ;;
esac

if [ "$fail" -eq 0 ]; then
  echo "deployment verification passed"
else
  echo "deployment verification FAILED"
  exit 1
fi
