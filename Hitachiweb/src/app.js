const express = require('express');
const path = require('path');
const session = require('express-session');
const itemRoutes      = require('./routes/itemRoutes');
const authRoutes      = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const errorHandler    = require('./middleware/errorHandler');
const startSimulator  = require('./simulator');
const brokerService   = require('./services/BrokerService');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'hitachiweb-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth',      authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/items',     itemRoutes);

// Broker (aktivuje se pokud je nastavena MQTT_URL)
const brokerActive = brokerService.connect();

// Simulátor běží vždy v dev módu nebo pokud broker není nakonfigurován
if (!brokerActive || process.env.NODE_ENV !== 'production') {
  startSimulator();
}

app.use(errorHandler);

module.exports = app;
