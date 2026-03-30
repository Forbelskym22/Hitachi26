#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <SPI.h>

// === PINY DISPLEJE ===
#define LCD_CS    10
#define LCD_DC     9
#define LCD_RESET  8
#define LCD_LED    7

// === VOLTAGE SENSOR ===
class VoltageSensor {
  private:
    int pin;
    float calibrationFactor;
    const float REFERENCE_VOLTAGE = 24.0;
    const int   ADC_RES           = 4096;

  public:
    VoltageSensor(int pin) : pin(pin), calibrationFactor(0.0) {}

    void calibrate() {
      int raw = analogRead(pin);
      calibrationFactor = REFERENCE_VOLTAGE / raw;
    }

    float read() {
      return analogRead(pin) * calibrationFactor;
    }
};

// === CURRENT SENSOR ===
class CurrentSensor {
  private:
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

// === CONTACTOR ===
class Contactor {
  private:
    int pin;

  public:
    Contactor(int pin) : pin(pin) {}

    void begin() { pinMode(pin, INPUT_PULLUP); }
    bool isOn()  { return digitalRead(pin) == LOW; }
};

// === DISPLAY ===
class Display {
  private:
    Adafruit_ILI9341 tft;

    void drawLabel(int x, int y, const char* label) {
      tft.setTextColor(ILI9341_CYAN);
      tft.setTextSize(1);
      tft.setCursor(x, y);
      tft.print(label);
    }

    void drawValue(int x, int y, float value, const char* unit) {
      tft.fillRect(x, y, 120, 16, ILI9341_BLACK);
      tft.setTextColor(ILI9341_WHITE);
      tft.setTextSize(2);
      tft.setCursor(x, y);
      tft.print(value, 2);
      tft.print(unit);
    }

    void drawStatus(int x, int y, bool on) {
      tft.fillRect(x, y, 80, 16, ILI9341_BLACK);
      tft.setTextSize(2);
      tft.setTextColor(on ? ILI9341_GREEN : ILI9341_RED);
      tft.setCursor(x, y);
      tft.print(on ? "SEPNUT" : "ROZEP.");
    }

  public:
    Display() : tft(LCD_CS, LCD_DC, LCD_RESET) {}

    void begin() {
      pinMode(LCD_LED, OUTPUT);
      digitalWrite(LCD_LED, HIGH);
      delay(100);
      tft.begin(2000000);  // 2 MHz - nutné kvůli odporovému děliči na SPI linkách
      tft.setRotation(0);
      tft.fillScreen(ILI9341_BLACK);

      // Statické popisky
      drawLabel(0,   0,  "NAPETI:");
      drawLabel(0,  50,  "PROUD 1:");
      drawLabel(0,  90,  "PROUD 2:");
      drawLabel(0, 130,  "PROUD 3:");
      drawLabel(0, 170,  "PROUD 4:");
      drawLabel(0, 220,  "STYKAC 1:");
      drawLabel(0, 260,  "STYKAC 2:");
      drawLabel(0, 300,  "STYKAC 3:");
    }

    void update(float voltage, float current[], bool contactor[]) {
      drawValue(0,  12, voltage,      " V");
      for (int i = 0; i < 4; i++)
        drawValue(0, 62 + i * 40, current[i], " A");
      for (int i = 0; i < 3; i++)
        drawStatus(0, 232 + i * 40, contactor[i]);
    }
};

// === INSTANCE ===
VoltageSensor voltage(A0);
CurrentSensor current[4] = { A1, A2, A3, A4 };
Contactor     contactor[3] = { 2, 3, 4 };
Display       display;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  voltage.calibrate();
  for (int i = 0; i < 3; i++)
    contactor[i].begin();
  display.begin();
}

void loop() {
  float   currVals[4];
  bool    contVals[3];

  float v = voltage.read();
  for (int i = 0; i < 4; i++) currVals[i] = current[i].read();
  for (int i = 0; i < 3; i++) contVals[i] = contactor[i].isOn();

  // Serial
  Serial.print("Napeti: "); Serial.print(v, 2); Serial.println(" V");
  for (int i = 0; i < 4; i++) {
    Serial.print("Proud #"); Serial.print(i+1);
    Serial.print(": "); Serial.print(currVals[i], 3); Serial.println(" A");
  }
  for (int i = 0; i < 3; i++) {
    Serial.print("Stykac #"); Serial.print(i+1);
    Serial.print(": "); Serial.println(contVals[i] ? "SEPNUT" : "ROZEPNUT");
  }
  Serial.println("---");

  // Displej
  display.update(v, currVals, contVals);

  delay(1000);
}
