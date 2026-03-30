#!/usr/bin/env bash
# Generuje CA + serverový certifikát podepsaný touto CA
# Použití: bash scripts/gen-certs.sh [--domain hostname]
#
# CA cert (certs/ca/ca.crt) importuj do Windows:
#   certutil -addstore -f "Root" certs/ca/ca.crt

set -e

DOMAIN="${1:-localhost}"
CERTS_DIR="certs"
CA_DIR="$CERTS_DIR/ca"

mkdir -p "$CERTS_DIR" "$CA_DIR"

# ── 1. CA (pokud ještě neexistuje) ──────────────────────────────────────────
if [ ! -f "$CA_DIR/ca.key" ]; then
  echo "[CA] Generuji CA klíč a certifikát..."
  openssl genrsa -out "$CA_DIR/ca.key" 4096

  openssl req -x509 -new -nodes \
    -key "$CA_DIR/ca.key" \
    -sha256 -days 3650 \
    -out "$CA_DIR/ca.crt" \
    -subj "/CN=Hitachiweb CA/O=Hitachi/C=CZ"

  echo "[CA] Hotovo: $CA_DIR/ca.crt"
  echo ""
  echo "  Přidej CA do Windows trusted store:"
  echo "  certutil -addstore -f \"Root\" $CA_DIR/ca.crt"
  echo ""
else
  echo "[CA] CA klíč nalezen, přeskakuji generování."
fi

# ── 2. Serverový certifikát ─────────────────────────────────────────────────
echo "[CERT] Generuji serverový klíč a CSR pro: $DOMAIN"

openssl genrsa -out "$CERTS_DIR/key.pem" 2048

openssl req -new \
  -key "$CERTS_DIR/key.pem" \
  -out "$CERTS_DIR/server.csr" \
  -subj "/CN=$DOMAIN/O=Hitachi/C=CZ"

# SAN extension (nutné pro Chrome/Edge)
cat > "$CERTS_DIR/ext.cnf" <<EOF
[req]
req_extensions = v3_req
[v3_req]
subjectAltName = @alt_names
[alt_names]
DNS.1 = $DOMAIN
DNS.2 = localhost
IP.1  = 127.0.0.1
EOF

openssl x509 -req \
  -in "$CERTS_DIR/server.csr" \
  -CA "$CA_DIR/ca.crt" \
  -CAkey "$CA_DIR/ca.key" \
  -CAcreateserial \
  -out "$CERTS_DIR/cert.pem" \
  -days 365 \
  -sha256 \
  -extfile "$CERTS_DIR/ext.cnf" \
  -extensions v3_req

# Cleanup CSR a ext config
rm -f "$CERTS_DIR/server.csr" "$CERTS_DIR/ext.cnf"

echo "[CERT] Hotovo: $CERTS_DIR/cert.pem + $CERTS_DIR/key.pem"
echo ""
echo "Server certifikát platí 365 dní, CA 10 let."
echo "Pro obnovení spusť skript znovu (CA se znovu generovat nebude)."
