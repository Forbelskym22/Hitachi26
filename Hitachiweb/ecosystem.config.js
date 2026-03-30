module.exports = {
  apps: [{
    name:        'hitachiweb',
    script:      'server.js',
    cwd:         '/opt/hitachiweb',

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

      // SQLite — cesta k datové složce
      DB_PATH: '/opt/hitachiweb/data',
    },

    // Dev prostředí (lokálně)
    env: {
      NODE_ENV: 'development',
      HTTP_PORT: 3000,
    },

    // Logy
    out_file:  '/var/log/hitachiweb/out.log',
    error_file:'/var/log/hitachiweb/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
  }],
};
