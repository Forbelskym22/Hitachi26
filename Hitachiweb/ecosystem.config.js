const APP_DIR = process.env.APP_DIR || `${process.env.HOME}/soutez/Hitachi26/Hitachiweb`;

module.exports = {
  apps: [{
    name:        'hitachiweb',
    script:      'server.js',
    cwd:         APP_DIR,

    // Automatický restart při pádu
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,

    // Produkční prostředí
    env_production: {
      NODE_ENV:        'production',
      HTTP_PORT:       3000,
      SESSION_SECRET:  'CHANGE_ME_STRONG_SECRET',

      // MQTT broker — loopback na Rasp
      MQTT_URL:          'mqtt://127.0.0.1:1883',
      MQTT_TOPIC_PREFIX: 'hitachi',

      // SQLite — relativně k APP_DIR
      DB_PATH: `${APP_DIR}/data`,
    },

    // Dev prostředí (lokálně)
    env: {
      NODE_ENV: 'development',
      HTTP_PORT: 3000,
    },

    // Logy — relativně k APP_DIR
    out_file:        `${APP_DIR}/logs/out.log`,
    error_file:      `${APP_DIR}/logs/error.log`,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs:      true,
  }],
};
