#!/bin/bash
# ════════════════════════════════════════════════════════════════════════
#  Hitachiweb — deploy / aktualizace
#  Spusť jako:  sudo bash deploy/deploy.sh
# ════════════════════════════════════════════════════════════════════════
set -e

APP_DIR="/opt/hitachiweb"
APP_USER="hitachi"
REPO_URL="https://github.com/YOUR_USER/Hitachi26.git"  # ← uprav
APP_SUBDIR="Hitachiweb"

echo "═══ [1/4] Stahování kódu ═══"
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  sudo -u "$APP_USER" git pull
else
  sudo -u "$APP_USER" git clone "$REPO_URL" /tmp/hitachi-clone
  cp -r "/tmp/hitachi-clone/$APP_SUBDIR/." "$APP_DIR/"
  rm -rf /tmp/hitachi-clone
fi

echo "═══ [2/4] Závislosti ═══"
cd "$APP_DIR"
sudo -u "$APP_USER" npm ci --omit=dev

echo "═══ [3/4] Kontrola .env ═══"
if [ ! -f "$APP_DIR/.env" ]; then
  echo "[!] .env neexistuje — kopíruji .env.example"
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo "[!] Uprav $APP_DIR/.env před spuštěním!"
fi

echo "═══ [4/4] PM2 ═══"
cd "$APP_DIR"
sudo -u "$APP_USER" pm2 startOrReload ecosystem.config.js --env production
sudo -u "$APP_USER" pm2 save

# Nastav PM2 autostart při bootu (jednou)
if ! systemctl is-enabled pm2-"$APP_USER" &>/dev/null; then
  env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$APP_USER" --hp /home/"$APP_USER" | tail -1 | bash
fi

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  Deploy hotov!                                 ║"
echo "║  Status: pm2 status                            ║"
echo "║  Logy:   pm2 logs hitachiweb                   ║"
echo "╚════════════════════════════════════════════════╝"
