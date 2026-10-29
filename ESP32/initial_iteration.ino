"""
This was an initial iteration created by me for AI to get a context and make a refined version.
Its test only and should not be used as a final product. The finalized version is much more robust.
"""

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ESPmDNS.h>
#include <ArduinoJson.h>
#include <optional>

// Constants
const char* ssid = "SSID";
const char* password = "PASSWORD";
const int LED_PIN = 5;
const int BTN_PINS[5] = {18, 19, 21, 33, 32};
const int BUZZER_PIN = 25;
const int WEBSOCKET_PORT = 81;
const char* ADMIN_PASSWORD = "PASS_ADMIN";

// Flags
bool isConnected = false;
bool isStarted = false;
bool lastBtnState[5] = {HIGH, HIGH, HIGH, HIGH, HIGH};

// Init
WebSocketsServer server = WebSocketsServer(WEBSOCKET_PORT);
int buttonClickState[5] = {0, 0, 0, 0, 0};


std::optional<JsonDocument> handleJSON(uint8_t num, uint8_t *payload, size_t length) {
  JsonDocument doc;

  if (deserializeJson(doc, (char *)payload, length)) {
    server.sendTXT(num, "{\"error\":\"invalid json\"}");
    return {};
  }

  return std::move(doc);
}

void handleBtnClick(int btn_no) {
  ledcWriteTone(BUZZER_PIN, 3000);

  buttonClickState[btn_no] += 1;

  JsonDocument doc;
  doc["name"] = "btn_state_update";
  doc["state"] = buttonClickState;

  char buffer[256];
  size_t len = serializeJson(doc, buffer, sizeof(buffer));
  server.broadcastTXT(buffer, len);

  delay(1000);
  ledcWriteTone(BUZZER_PIN, 0);
}

void acknowledge(uint8_t num) {
  JsonDocument reply;
  reply["name"]   = "status";
  reply["status"] = "ok";
  char out[128];
  size_t len = serializeJson(reply, out, sizeof(out));
  server.sendTXT(num, out, len);
}

void handleCommands(uint8_t num, uint8_t *payload, size_t length) {
  const std::optional<JsonDocument> cmd = handleJSON(num, payload, length);
  if (!cmd) return;

  const JsonDocument &doc = *cmd;
  const char *name = doc["name"];
  if (!name) return;


  // Start/Stop
  if (strcmp(name, "start") == 0 || strcmp(name, "stop") == 0) {
    const char *password = doc["password"];
    if (!password || strcmp(password, ADMIN_PASSWORD) != 0) return;
    isStarted = strcmp(name, "start") == 0;
    return acknowledge(num);
  }

  // Get Button State
  if (strcmp(name, "btn_state") == 0) {
    JsonDocument doc;
    doc["name"] = "btn_state";
    doc["state"] = buttonClickState;
    char buffer[256];
    size_t len = serializeJson(doc, buffer, sizeof(buffer));
    server.sendTXT(num, buffer, len);
  }

}

void blink_led() {
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  delay(500);
}

void onEvents(uint8_t num, WStype_t type, uint8_t *payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      isConnected = true;
      break;
    case WStype_DISCONNECTED:
      isConnected = false;
      isStarted = false;
      break;
    case WStype_TEXT:
      handleCommands(num, payload, length);
      break;
    default:
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(LED_PIN, OUTPUT);
  ledcAttach(BUZZER_PIN, 2000, 8);
  for (int pin : BTN_PINS) {
    pinMode(pin, INPUT_PULLUP);
  }

  digitalWrite(LED_PIN, HIGH);

  Serial.println("\n\nSETUP STARTED...");

  WiFi.mode(WIFI_STA);
  WiFi.setHostname("ESP32VM");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  Serial.println(String("IP: ")+WiFi.localIP());
  if (MDNS.begin("esp32vm")) {
    Serial.println("ALT: esp32vm.local:"+String(WEBSOCKET_PORT));
  }

  server.begin();
  server.onEvent(onEvents);
  Serial.println("SETUP FINISHED!");
}

void loop() {
  server.loop();
  if (!isConnected || !isStarted) {
    blink_led();
  } else {
    for (int i=0; i < 5; i++) {
      bool state = digitalRead(BTN_PINS[i]);
      if (lastBtnState[i] == LOW && state == HIGH) {
        handleBtnClick(i);
      }
      lastBtnState[i] = state;
    }
  }
}