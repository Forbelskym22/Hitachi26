const express = require('express');
const path = require('path');
const session = require('express-session');
const itemRoutes      = require('./routes/itemRoutes');
const authRoutes      = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const errorHandler    = require('./middleware/errorHandler');
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

// Broker
brokerService.connect();

// Simulátor — pouze při SIMULATE=true (lokální vývoj)
if (process.env.SIMULATE === 'true') {
  require('./simulator')();
}

app.use(errorHandler);

module.exports = app;
