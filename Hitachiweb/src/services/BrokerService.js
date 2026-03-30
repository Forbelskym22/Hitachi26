const mqtt            = require('mqtt');
const measurementRepo = require('../repositories/MeasurementRepository');
const contactorRepo   = require('../repositories/ContactorRepository');

/**
 * MQTT Broker Service
 *
 * Konfigurace přes prostředí:
 *   MQTT_URL          – adresa brokeru, např. mqtt://localhost:1883
 *   MQTT_TOPIC_PREFIX – prefix témat (výchozí: "hitachi")
 *   MQTT_USERNAME     – volitelně
 *   MQTT_PASSWORD     – volitelně
 *
 * Témata:
 *   {prefix}/voltage/L1|L2|L3   → payload: { "value": <number> }
 *   {prefix}/current/L1|L2|L3   → payload: { "value": <number> }
 *   {prefix}/contactor/K1|K2|K3 → payload: { "state": true|false }
 */

const TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX || 'hitachi';

const VOLTAGE_PHASES = new Set(['L1', 'L2', 'L3']);
const CURRENT_PHASES = new Set(['L1', 'L2', 'L3', 'L4']);
const CONTACTORS     = new Set(['K1', 'K2', 'K3']);

class BrokerService {
  constructor() {
    this.client        = null;
    this.connected     = false;
    this._url          = process.env.MQTT_URL || null;
    this.lastMessageAt = null;
  }

  /**
   * Pokusí se připojit k brokeru.
   * Vrátí true pokud MQTT_URL je nastavena, jinak false.
   */
  connect() {
    if (!this._url) {
      console.log('[Broker] MQTT_URL nenastavena — broker přeskočen');
      return false;
    }

    const options = {
      clientId:       `hitachiweb-${Date.now()}`,
      reconnectPeriod: 5_000,
      connectTimeout:  10_000,
    };

    if (process.env.MQTT_USERNAME) options.username = process.env.MQTT_USERNAME;
    if (process.env.MQTT_PASSWORD) options.password = process.env.MQTT_PASSWORD;

    this.client = mqtt.connect(this._url, options);

    this.client.on('connect', () => {
      this.connected = true;
      console.log(`[Broker] Připojen: ${this._url}`);
      this._subscribe();
    });

    this.client.on('reconnect', () => {
      console.log('[Broker] Znovu připojuji…');
    });

    this.client.on('disconnect', () => {
      this.connected = false;
      console.log('[Broker] Odpojen');
    });

    this.client.on('error', err => {
      console.error(`[Broker] Chyba: ${err.message}`);
    });

    this.client.on('message', (topic, payload) => {
      this._handle(topic, payload);
    });

    return true;
  }

  _subscribe() {
    const topics = [
      `${TOPIC_PREFIX}/voltage/+`,
      `${TOPIC_PREFIX}/current/+`,
      `${TOPIC_PREFIX}/contactor/+`,
    ];
    this.client.subscribe(topics, err => {
      if (err) console.error('[Broker] Chyba při subscribu:', err.message);
      else     console.log(`[Broker] Odebírám: ${topics.join(', ')}`);
    });
  }

  _handle(topic, raw) {
    try {
      const parts   = topic.split('/');
      const type    = parts[1]; // voltage | current | contactor
      const channel = parts[2]; // L1/L2/L3 or K1/K2/K3
      const msg     = JSON.parse(raw.toString());

      if (type === 'voltage' && VOLTAGE_PHASES.has(channel)) {
        const value = parseFloat(msg.value);
        if (!isNaN(value)) { measurementRepo.add(type, channel, value); this.lastMessageAt = new Date(); }

      } else if (type === 'current' && CURRENT_PHASES.has(channel)) {
        const value = parseFloat(msg.value);
        if (!isNaN(value)) { measurementRepo.add(type, channel, value); this.lastMessageAt = new Date(); }

      } else if (type === 'contactor' && CONTACTORS.has(channel)) {
        contactorRepo.setState(channel, Boolean(msg.state));
        this.lastMessageAt = new Date();
      }

    } catch (err) {
      console.warn(`[Broker] Neplatná zpráva na ${topic}: ${err.message}`);
    }
  }

  /** Publikuj zprávu (pro budoucí použití — odesílání příkazů) */
  publish(topic, payload) {
    if (!this.client || !this.connected) return;
    this.client.publish(`${TOPIC_PREFIX}/${topic}`, JSON.stringify(payload));
  }

  isConnected()    { return this.connected; }
  isConfigured()   { return Boolean(this._url); }
  getLastMessageAt() { return this.lastMessageAt; }
}

module.exports = new BrokerService();
