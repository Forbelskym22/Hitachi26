#!/bin/bash
# ════════════════════════════════════════════════════════════════════════
#  Hitachiweb — deploy / aktualizace
#  Spusť z kořene Hitachiweb složky:  sudo bash deploy/deploy.sh
# ════════════════════════════════════════════════════════════════════════
set -e

# Cesta k aplikaci — detekuje se automaticky podle umístění skriptu
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_USER="${SUDO_USER:-$(whoami)}"

echo "═══ [1/4] Závislosti ═══"
cd "$APP_DIR"
npm ci --omit=dev

echo "═══ [2/4] Složky a oprávnění ═══"
mkdir -p "$APP_DIR/data" "$APP_DIR/certs"

echo "═══ [3/4] Kontrola .env ═══"
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo "[!] Vytvořen .env z příkladu — uprav před spuštěním: $APP_DIR/.env"
  echo "[!] Minimálně nastav: SESSION_SECRET, MQTT_URL"
  exit 1
fi

echo "═══ [4/4] PM2 ═══"
if pm2 list | grep -q "hitachiweb"; then
  pm2 reload ecosystem.config.js --env production
else
  pm2 start ecosystem.config.js --env production
fi
pm2 save

# PM2 autostart při bootu (jednou)
pm2 startup | tail -1 | bash 2>/dev/null || true

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  Deploy hotov!                                 ║"
echo "║  Status: pm2 status                            ║"
echo "║  Logy:   pm2 logs hitachiweb                   ║"
echo "╚════════════════════════════════════════════════╝"
