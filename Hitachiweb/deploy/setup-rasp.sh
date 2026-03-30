#!/bin/bash
# ════════════════════════════════════════════════════════════════════════
#  Hitachiweb — setup skript pro Raspberry Pi OS (Debian/Bookworm)
#  Spusť jako:  sudo bash setup-rasp.sh
# ════════════════════════════════════════════════════════════════════════
set -e

APP_DIR="/opt/hitachiweb"
APP_USER="hitachi"
NODE_VERSION="20"

echo "═══ [1/6] Systémové balíčky ═══"
apt-get update -qq
apt-get install -y -qq curl git mosquitto mosquitto-clients sqlite3 openssl

echo "═══ [2/6] Node.js $NODE_VERSION ═══"
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y -qq nodejs
fi
node -v && npm -v

echo "═══ [3/6] PM2 ═══"
npm install -g pm2 --quiet
pm2 --version

echo "═══ [4/6] Aplikační uživatel + složka ═══"
id "$APP_USER" &>/dev/null || useradd -r -m -s /bin/bash "$APP_USER"
mkdir -p "$APP_DIR" "$APP_DIR/data" "$APP_DIR/certs"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "═══ [5/6] Mosquitto broker ═══"
cat > /etc/mosquitto/conf.d/hitachi.conf << 'EOF'
listener 1883 0.0.0.0
allow_anonymous true

# Pro produkci s autentizací odkomentuj:
# allow_anonymous false
# password_file /etc/mosquitto/passwd
EOF
systemctl enable mosquitto
systemctl restart mosquitto
echo "[Mosquitto] Stav: $(systemctl is-active mosquitto)"

echo "═══ [6/6] SSL certifikáty (self-signed CA) ═══"
CERT_DIR="$APP_DIR/certs"
if [ ! -f "$CERT_DIR/ca.key" ]; then
  # CA klíč + certifikát
  openssl genrsa -out "$CERT_DIR/ca.key" 4096
  openssl req -new -x509 -days 3650 -key "$CERT_DIR/ca.key" \
    -out "$CERT_DIR/ca.crt" \
    -subj "/CN=HitachiCA/O=Hitachi26/C=CZ"

  # Server klíč + CSR + podpis CA
  RASP_IP=$(hostname -I | awk '{print $1}')
  openssl genrsa -out "$CERT_DIR/server.key" 2048
  openssl req -new -key "$CERT_DIR/server.key" \
    -out "$CERT_DIR/server.csr" \
    -subj "/CN=$RASP_IP/O=Hitachi26/C=CZ"
  openssl x509 -req -days 825 \
    -in "$CERT_DIR/server.csr" \
    -CA "$CERT_DIR/ca.crt" -CAkey "$CERT_DIR/ca.key" -CAcreateserial \
    -extfile <(printf "subjectAltName=IP:%s,DNS:localhost" "$RASP_IP") \
    -out "$CERT_DIR/server.crt"

  chown -R "$APP_USER:$APP_USER" "$CERT_DIR"
  chmod 600 "$CERT_DIR/ca.key" "$CERT_DIR/server.key"
  echo "[SSL] Certifikáty vygenerovány pro IP: $RASP_IP"
  echo "[SSL] CA certifikát k importu do prohlížeče: $CERT_DIR/ca.crt"
fi

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  Setup hotov!                                     ║"
echo "║                                                   ║"
echo "║  Další kroky:                                     ║"
echo "║  1. Zkopíruj app do $APP_DIR                      ║"
echo "║  2. Vytvoř .env (viz .env.example)                ║"
echo "║  3. Spusť: sudo bash deploy/deploy.sh             ║"
echo "╚═══════════════════════════════════════════════════╝"
