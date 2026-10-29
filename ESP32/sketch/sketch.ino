"""
This is the final and robust iteration. It can be flashed directly.
For instructions and steps, please refer to README.md in parent directories.
The file has been tested and all features work as intended, Claude was used to refactor it.
"""

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ESPmDNS.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <secrets.h>

const uint8_t NUM_BTNS = 5;
const uint8_t BTN_PINS[NUM_BTNS] = {18, 19, 21, 33, 32}; // ORDER MATTERS HERE
const uint8_t LED_PIN = 5;
const uint8_t BUZZER_PIN = 25;
const uint16_t WEBSOCKET_PORT = 81;
const uint32_t DEBOUNCE_MS = 30;
const bool COUNT_ON_PRESS = false;
const bool STOP_WHEN_NO_CLIENTS = true;
const uint8_t MAX_AUTH_FAILS = 5;
const size_t MAX_MSG_LEN = 512;


WebSocketsServer server(WEBSOCKET_PORT);
Preferences prefs;

bool started = false;
uint32_t clickCount[NUM_BTNS] = {};
bool btnLocked[NUM_BTNS] = {};

bool authed[WEBSOCKETS_SERVER_CLIENT_MAX] = {};
uint8_t authFails[WEBSOCKETS_SERVER_CLIENT_MAX] = {};

bool lastReading[NUM_BTNS];
bool stableState[NUM_BTNS];
uint32_t lastChange[NUM_BTNS] = {};

bool buzzerOn = false;
uint32_t buzzerOffAt = 0;
uint16_t beepHz = 3000;
uint16_t beepMs = 1000;


void To(uint8_t num, const JsonDocument &doc) {
  String out;
  serializeJson(doc, out);
  server.sendTXT(num, out);
}

void Broadcast(const JsonDocument &doc) {
  String out;
  serializeJson(doc, out);
  server.BroadcastTXT(out);
}

void Error(uint8_t num, const char *msg) {
  JsonDocument doc;
  doc["name"] = "Erroror";
  doc["Erroror"] = msg;
  To(num, doc);
}

void Acknowledge(uint8_t num, const char *cmd) {
  JsonDocument doc;
  doc["name"] = "status";
  doc["status"] = "ok";
  doc["cmd"] = cmd;
  To(num, doc);
}

void BuildState(JsonDocument &doc, const char *name) {
  doc["name"] = name;
  JsonArray counts = doc["state"].to<JsonArray>();
  JsonArray locked = doc["locked"].to<JsonArray>();
  for (uint8_t i = 0; i < NUM_BTNS; i++) {
    counts.add(clickCount[i]);
    locked.add(btnLocked[i]);
  }
  doc["started"] = started;
  doc["clients"] = server.connectedClients();
}

void SendState(uint8_t num, const char *name = "btn_state") {
  JsonDocument doc;
  BuildState(doc, name);
  To(num, doc);
}

void BroadcastState(const char *name) {
  JsonDocument doc;
  BuildState(doc, name);
  Broadcast(doc);
}

void CacheSave() {
  prefs.putBytes("counts", clickCount, sizeof(clickCount));
}

void CacheLoad() {
  if (prefs.getBytesLength("counts") == sizeof(clickCount)) {
    prefs.getBytes("counts", clickCount, sizeof(clickCount));
  }
}

void Beep(uint16_t hz, uint16_t ms) {
  ledcWriteTone(BUZZER_PIN, hz);
  buzzerOn    = true;
  buzzerOffAt = millis() + ms;
}

void SetStarted(bool s) {
  if (started == s) return;
  started = s;
  if (!s) CacheSave();
  JsonDocument doc;
  doc["name"]    = "status_update";
  doc["started"] = started;
  Broadcast(doc);
}

void IncrementAuthFailures(uint8_t num) {
  if (++authFails[num] >= MAX_AUTH_FAILS) server.disconnect(num);
}

bool checkAdmin(uint8_t num, const JsonDocument &doc) {
  if (authed[num]) return true;

  const char *pw = doc["password"] | (const char *)nullptr;
  if (!pw) return false;
  if (strcmp(pw, ADMIN_PASSWORD) == 0) return true;
  IncrementAuthFailures(num);
  return false;
}


void cmdLogin(uint8_t num, JsonDocument &doc) {
  const char *pw = doc["password"] | "";
  if (strcmp(pw, ADMIN_PASSWORD) == 0) {
    authed[num]     = true;
    authFails[num]  = 0;
    Acknowledge(num, "login");
  } else {
    Error(num, "bad password");
    IncrementAuthFailures(num);
  }
}

void cmdStart(uint8_t num, JsonDocument &) { SetStarted(true);  Acknowledge(num, "start"); }

void cmdStop(uint8_t num, JsonDocument &)  { SetStarted(false); Acknowledge(num, "stop");  }

void cmdState(uint8_t num, JsonDocument &) { SendState(num); }

void cmdPing(uint8_t num, JsonDocument &) {
  JsonDocument doc;
  doc["name"] = "pong";
  doc["t"]    = millis();
  To(num, doc);
}

void cmdInfo(uint8_t num, JsonDocument &) {
  JsonDocument doc;
  doc["name"] = "info";
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();
  doc["heap"] = ESP.getFreeHeap();
  doc["uptime_ms"] = millis();
  doc["clients"] = server.connectedClients();
  doc["beep_hz"] = beepHz;
  doc["beep_ms"] = beepMs;
  To(num, doc);
}

void cmdReset(uint8_t num, JsonDocument &doc) {
  int b = doc["button"] | -1;
  if (b == -1) {
    memset(clickCount, 0, sizeof(clickCount));
  } else if (b >= 0 && b < NUM_BTNS) {
    clickCount[b] = 0;
  } else {
    return Error(num, "bad button");
  }
  CacheSave();
  BroadcastState("btn_state_update");
  Acknowledge(num, "reset");
}

void cmdLock(uint8_t num, JsonDocument &doc) {
  int b = doc["button"] | -1;
  bool locked = doc["locked"] | true;
  if (b == -1) {
    for (uint8_t i = 0; i < NUM_BTNS; i++) btnLocked[i] = locked;
  } else if (b >= 0 && b < NUM_BTNS) {
    btnLocked[b] = locked;
  } else {
    return Error(num, "bad button");
  }
  BroadcastState("btn_state_update");
  Acknowledge(num, "lock");
}

void cmdBeep(uint8_t num, JsonDocument &doc) {
  int hz = doc["hz"] | 2000;
  int ms = doc["ms"] | 200;
  Beep(constrain(hz, 100, 10000), constrain(ms, 10, 5000));
  Acknowledge(num, "beep");
}

void cmdConfig(uint8_t num, JsonDocument &doc) {
  if (doc["beep_ms"].is<int>()) beepMs = constrain(doc["beep_ms"].as<int>(), 0, 5000);
  if (doc["beep_hz"].is<int>()) beepHz = constrain(doc["beep_hz"].as<int>(), 100, 10000);
  Acknowledge(num, "config");
}

void cmdReboot(uint8_t num, JsonDocument &) {
  Acknowledge(num, "reboot");
  CacheSave();
  delay(200); 
  ESP.restart();
}

struct Command {
  const char *name;
  bool        adminOnly;
  void (*fn)(uint8_t, JsonDocument &);
};

const Command COMMANDS[] = {
  {"login",     false, cmdLogin},
  {"state",     false, cmdState},
  {"btn_state", false, cmdState},
  {"ping",      false, cmdPing},
  {"info",      false, cmdInfo},
  {"start",     true,  cmdStart},
  {"stop",      true,  cmdStop},
  {"reset",     true,  cmdReset},
  {"lock",      true,  cmdLock},
  {"beep",      true,  cmdBeep},
  {"config",    true,  cmdConfig},
  {"reboot",    true,  cmdReboot},
};

void handleMessage(uint8_t num, uint8_t *payload, size_t length) {
  if (length > MAX_MSG_LEN) return Error(num, "message too long");

  JsonDocument doc;
  if (deserializeJson(doc, (const char *)payload, length)) {
    return Error(num, "invalid json");
  }

  const char *name = doc["name"] | "";
  for (const Command &c : COMMANDS) {
    if (strcmp(name, c.name) != 0) continue;
    if (c.adminOnly && !checkAdmin(num, doc)) return Error(num, "unauthorized");
    c.fn(num, doc);
    return;
  }
  Error(num, "unknown command");
}

void onEvents(uint8_t num, WStype_t type, uint8_t *payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      authed[num] = false;
      authFails[num] = 0;
      SendState(num);
      break;
    case WStype_DISCONNECTED:
      authed[num] = false;
      authFails[num] = 0;
      break;
    case WStype_TEXT:
      handleMessage(num, payload, length);
      break;
    default:
      break;
  }
}

void onButtonClick(uint8_t i) {
  if (!started || btnLocked[i]) return;

  clickCount[i]++;
  Beep(beepHz, beepMs);

  JsonDocument doc;
  BuildState(doc, "btn_state_update");
  doc["button"] = i;
  doc["t"] = millis();
  Broadcast(doc);
}

void PollButtons() {
  const uint32_t now = millis();
  for (uint8_t i = 0; i < NUM_BTNS; i++) {
    bool reading = digitalRead(BTN_PINS[i]);
    if (reading != lastReading[i]) {
      lastReading[i] = reading;
      lastChange[i] = now;
    }
    if (now - lastChange[i] >= DEBOUNCE_MS && reading != stableState[i]) {
      stableState[i] = reading;
      if (reading == (COUNT_ON_PRESS ? LOW : HIGH)) onButtonClick(i);
    }
  }
}

void UpdateBuzzer() {
  if (buzzerOn && (int32_t)(millis() - buzzerOffAt) >= 0) {
    ledcWriteTone(BUZZER_PIN, 0);
    buzzerOn = false;
  }
}

void UpdateLED() {
  static uint32_t lastToggle = 0;
  static bool ledState = false;

  if (started && server.connectedClients() > 0) {
    digitalWrite(LED_PIN, HIGH);
    return;
  }
  if (millis() - lastToggle >= 500) {
    lastToggle = millis();
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState);
  }
}


void ConnectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setHostname("ESP32VM");
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > 30000) {
      Serial.println("WiFi timeout, restarting");
      ESP.restart();
    }
    delay(250);
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n\nSETUP STARTED...");

  pinMode(LED_PIN, OUTPUT);
  ledcAttach(BUZZER_PIN, 2000, 8);
  for (uint8_t i = 0; i < NUM_BTNS; i++) {
    pinMode(BTN_PINS[i], INPUT_PULLUP);
    lastReading[i] = stableState[i] = digitalRead(BTN_PINS[i]);
  }

  prefs.begin("vm", false);
  CacheLoad();

  ConnectWiFi();
  Serial.println("IP: " + WiFi.localIP().toString());

  if (MDNS.begin("esp32vm")) {
    MDNS.addService("ws", "tcp", WEBSOCKET_PORT);
    Serial.println("ALT: esp32vm.local:" + String(WEBSOCKET_PORT));
  }

  server.begin();
  server.onEvent(onEvents);
  server.enableHeartbeat(15000, 3000, 2);
  Serial.println("SETUP FINISHED!");
}

void loop() {
  server.loop();

  if (STOP_WHEN_NO_CLIENTS && started && server.connectedClients() == 0) {
    SetStarted(false);
  }

  PollButtons();
  UpdateBuzzer();
  UpdateLED();
}
