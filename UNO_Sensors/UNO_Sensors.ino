/**
 * Hitachi26 — UNO MQTT Publisher
 *
 * Cílová deska: Arduino UNO R4 WiFi
 *   → knihovna: WiFiS3.h  (předdefinovaná pro UNO R4 WiFi)
 *
 * Pro jiné moduly změň include a inicializaci WiFi:
 *   ESP8266 NodeMCU  → #include <ESP8266WiFi.h>
 *   ESP32            → #include <WiFi.h>
 *   UNO + WiFiNINA   → #include <WiFiNINA.h>
 *
 * Potřebné knihovny (Library Manager):
 *   - WiFiS3        (součást Arduino UNO R4 boards)
 *   - PubSubClient  (knolleary/pubsubclient)
 *   - Adafruit GFX + Adafruit ILI9341
 */

#include <SPI.h>
#include <WiFiS3.h>           // ← změň podle svého modulu
#include <PubSubClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>

// ════════════════════════════════════════════════════
//  KONFIGURACE — uprav zde
// ════════════════════════════════════════════════════

// WiFi
const char* WIFI_SSID     = "YourSSID";
const char* WIFI_PASSWORD = "YourPassword";

// MQTT broker (IP Raspberry Pi)
const char* MQTT_BROKER   = "192.168.1.100";
const int   MQTT_PORT     = 1883;
const char* MQTT_CLIENT   = "hitachi-uno";
const char* MQTT_PREFIX   = "hitachi";
// const char* MQTT_USER  = "";   // odkomentuj pokud broker vyžaduje auth
// const char* MQTT_PASS  = "";

// Intervaly (ms)
const unsigned long PUBLISH_INTERVAL    = 1000;   // odeslání měření
const unsigned long CONTACTOR_KEEPALIVE = 30000;  // periodický stav stykačů

// ════════════════════════════════════════════════════
//  PINY
// ════════════════════════════════════════════════════

#define LCD_CS     10
#define LCD_DC      9
#define LCD_RESET   8
#define LCD_LED     7

#define PIN_VOLTAGE     A0
#define PIN_CURRENT_1   A1
#define PIN_CURRENT_2   A2
#define PIN_CURRENT_3   A3
#define PIN_CURRENT_4   A4   // 4. kanál (L4) — volitelné
#define PIN_CONTACTOR_1  2
#define PIN_CONTACTOR_2  3
#define PIN_CONTACTOR_3  4

// ════════════════════════════════════════════════════
//  SENSORS (přeneseno z původního sketcheru)
// ════════════════════════════════════════════════════

class VoltageSensor {
  int   pin;
  float calibrationFactor;
  const float REFERENCE_VOLTAGE = 24.0;
  const int   ADC_RES           = 4096;
public:
  VoltageSensor(int pin) : pin(pin), calibrationFactor(0.0) {}
  void  calibrate() { int raw = analogRead(pin); calibrationFactor = (raw > 0) ? (REFERENCE_VOLTAGE / raw) : 0; }
  float read()      { return analogRead(pin) * calibrationFactor; }
};

class CurrentSensor {
  int pin;
  const float SENSITIVITY = 0.185;
  const float VREF        = 2.5;
  const float ADC_VREF    = 5.0;
  const int   ADC_RES     = 4096;
public:
  CurrentSensor(int pin) : pin(pin) {}
  float read() {
    float volt = (analogRead(pin) / (float)ADC_RES) * ADC_VREF;
    return (volt - VREF) / SENSITIVITY;
  }
};

class Contactor {
  int  pin;
  bool lastState;
public:
  Contactor(int pin) : pin(pin), lastState(false) {}
  void begin()        { pinMode(pin, INPUT_PULLUP); lastState = isOn(); }
  bool isOn()         { return digitalRead(pin) == LOW; }
  bool stateChanged() { bool s = isOn(); bool changed = (s != lastState); lastState = s; return changed; }
  bool getLastState() { return lastState; }
};

class Display {
  Adafruit_ILI9341 tft;
  void label(int x, int y, const char* txt)      { tft.setTextColor(ILI9341_CYAN); tft.setTextSize(1); tft.setCursor(x,y); tft.print(txt); }
  void value(int x, int y, float v, const char* u) { tft.fillRect(x,y,120,16,ILI9341_BLACK); tft.setTextColor(ILI9341_WHITE); tft.setTextSize(2); tft.setCursor(x,y); tft.print(v,2); tft.print(u); }
  void status(int x, int y, bool on)             { tft.fillRect(x,y,80,16,ILI9341_BLACK); tft.setTextSize(2); tft.setTextColor(on?ILI9341_GREEN:ILI9341_RED); tft.setCursor(x,y); tft.print(on?"SEPNUT":"ROZEP."); }
  void wifiStatus(bool ok, bool mqtt)            {
    tft.fillRect(0,310,240,10,ILI9341_BLACK);
    tft.setTextSize(1);
    tft.setTextColor(ok ? ILI9341_GREEN : ILI9341_RED);
    tft.setCursor(0,310); tft.print(ok ? "WiFi OK " : "WiFi -- ");
    tft.setTextColor(mqtt ? ILI9341_GREEN : ILI9341_YELLOW);
    tft.print(mqtt ? "MQTT OK" : "MQTT --");
  }
public:
  Display() : tft(LCD_CS, LCD_DC, LCD_RESET) {}
  void begin() {
    pinMode(LCD_LED, OUTPUT); digitalWrite(LCD_LED, HIGH); delay(100);
    tft.begin(2000000); tft.setRotation(0); tft.fillScreen(ILI9341_BLACK);
    label(0,  0, "NAPETI:");
    label(0, 50, "PROUD 1:"); label(0, 90, "PROUD 2:");
    label(0,130, "PROUD 3:"); label(0,170, "PROUD 4:");
    label(0,220, "STYKAC 1:"); label(0,260, "STYKAC 2:"); label(0,300, "STYKAC 3:");
  }
  void update(float voltage, float current[], bool contactor[], bool wifiOk, bool mqttOk) {
    value(0, 12, voltage, " V");
    for (int i = 0; i < 4; i++) value(0, 62 + i*40, current[i], " A");
    for (int i = 0; i < 3; i++) status(0, 232 + i*40, contactor[i]);
    wifiStatus(wifiOk, mqttOk);
  }
};

// ════════════════════════════════════════════════════
//  MQTT HELPERS
// ════════════════════════════════════════════════════

WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);

// Sestaví téma: "hitachi/voltage/L1"
void buildTopic(char* buf, const char* type, const char* channel) {
  snprintf(buf, 64, "%s/%s/%s", MQTT_PREFIX, type, channel);
}

// Publikuje float hodnotu: {"value": 230.50}
void publishValue(const char* type, const char* channel, float value) {
  char topic[64], payload[32];
  buildTopic(topic, type, channel);
  snprintf(payload, sizeof(payload), "{\"value\":%.3f}", value);
  mqtt.publish(topic, payload, true);  // retain=true
}

// Publikuje stav stykače: {"state": true}
void publishContactor(const char* name, bool state) {
  char topic[64], payload[20];
  buildTopic(topic, "contactor", name);
  snprintf(payload, sizeof(payload), "{\"state\":%s}", state ? "true" : "false");
  mqtt.publish(topic, payload, true);
}

// ════════════════════════════════════════════════════
//  WIFI + MQTT RECONNECT
// ════════════════════════════════════════════════════

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("[WiFi] Připojuji k "); Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);  // DHCP automaticky
  unsigned long t = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t < 15000) {
    delay(500); Serial.print('.');
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("\n[WiFi] Připojeno. IP: "); Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Nepodařilo se připojit — zkusím znovu příště");
  }
}

bool connectMQTT() {
  if (mqtt.connected()) return true;
  if (WiFi.status() != WL_CONNECTED) return false;

  Serial.print("[MQTT] Připojuji k "); Serial.print(MQTT_BROKER); Serial.print(":"); Serial.println(MQTT_PORT);

  // Odkomentuj pokud broker vyžaduje auth:
  // bool ok = mqtt.connect(MQTT_CLIENT, MQTT_USER, MQTT_PASS);
  bool ok = mqtt.connect(MQTT_CLIENT);

  if (ok) { Serial.println("[MQTT] Připojeno"); }
  else    { Serial.print("[MQTT] Chyba: "); Serial.println(mqtt.state()); }
  return ok;
}

// ════════════════════════════════════════════════════
//  INSTANCE
// ════════════════════════════════════════════════════

VoltageSensor voltage(PIN_VOLTAGE);
CurrentSensor current[4] = { PIN_CURRENT_1, PIN_CURRENT_2, PIN_CURRENT_3, PIN_CURRENT_4 };
Contactor     contactor[3] = { PIN_CONTACTOR_1, PIN_CONTACTOR_2, PIN_CONTACTOR_3 };
Display       display;

const char* CURRENT_NAMES[]   = { "L1", "L2", "L3", "L4" };
const char* CONTACTOR_NAMES[] = { "K1", "K2", "K3" };

unsigned long lastPublish   = 0;
unsigned long lastKeepalive = 0;

// ════════════════════════════════════════════════════
//  SETUP / LOOP
// ════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);

  voltage.calibrate();
  for (int i = 0; i < 3; i++) contactor[i].begin();

  display.begin();

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setKeepAlive(60);

  connectWiFi();
  connectMQTT();
}

void loop() {
  // Udržuj spojení
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected())             connectMQTT();
  mqtt.loop();

  unsigned long now = millis();
  bool wifiOk = (WiFi.status() == WL_CONNECTED);
  bool mqttOk = mqtt.connected();

  // ── Publikuj měření ──────────────────────────────
  if (now - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = now;

    float v = voltage.read();
    float currVals[4];
    bool  contVals[3];

    for (int i = 0; i < 4; i++) currVals[i] = current[i].read();
    for (int i = 0; i < 3; i++) contVals[i] = contactor[i].getLastState();

    if (mqttOk) {
      // Napětí — mapujeme na L1 (jednofázové měření)
      publishValue("voltage", "L1", v);

      // Proud L1–L4
      for (int i = 0; i < 4; i++)
        publishValue("current", CURRENT_NAMES[i], currVals[i]);
    }

    // Displej
    display.update(v, currVals, contVals, wifiOk, mqttOk);

    // Serial debug
    Serial.print("V="); Serial.print(v, 2);
    for (int i = 0; i < 4; i++) { Serial.print(" I"); Serial.print(i+1); Serial.print("="); Serial.print(currVals[i], 2); }
    Serial.println(mqttOk ? " [MQTT OK]" : " [MQTT --]");
  }

  // ── Stykače: reaguj na změnu + keepalive ─────────
  bool keepalive = (now - lastKeepalive >= CONTACTOR_KEEPALIVE);
  if (keepalive) lastKeepalive = now;

  for (int i = 0; i < 3; i++) {
    bool changed = contactor[i].stateChanged();
    if ((changed || keepalive) && mqttOk) {
      publishContactor(CONTACTOR_NAMES[i], contactor[i].getLastState());
      if (changed) {
        Serial.print("[MQTT] "); Serial.print(CONTACTOR_NAMES[i]);
        Serial.println(contactor[i].getLastState() ? " SEPNUT" : " ROZEPNUT");
      }
    }
  }
}
