#!/usr/bin/env sh
# Generate a self-signed TLS certificate for local/staging deployments.
# Production deployments should replace these with CA-issued certificates
# (e.g. from Let's Encrypt via certbot).
set -eu

CERT_DIR="$(cd "$(dirname "$0")/../nginx" && pwd)/certs"
HOSTNAME="${TLS_HOSTNAME:-localhost}"

mkdir -p "$CERT_DIR"

if [ -f "$CERT_DIR/fullchain.pem" ] && [ "${FORCE:-0}" != "1" ]; then
  echo "certificate already present at $CERT_DIR (set FORCE=1 to regenerate)"
  exit 0
fi

openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -subj "/CN=${HOSTNAME}" \
  -addext "subjectAltName=DNS:${HOSTNAME}"

chmod 600 "$CERT_DIR/privkey.pem"
echo "self-signed certificate written to $CERT_DIR"
