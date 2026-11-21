/*
  Rover Pilot Dashboard — offline ESP32 firmware
  Target: classic ESP32-S / ESP32-WROOM-32 class board (not ESP32-S3).
  The motor pin assignments, PWM setup, speed variable and movement functions
  below are retained from the user's working sketch.
  Dashboard files are served from LittleFS at http://192.168.4.1.

  Arduino-ESP32 core 3.x is required for ledcAttach(pin, frequency, resolution).
*/
#include <WiFi.h>
#include <WebServer.h>
#include <LittleFS.h>

const char* ssid = "Electric-Car";
const char* password = "car12345";

WebServer server(80);

// L298N direction pins — retained unchanged
const int IN1 = 16;
const int IN2 = 17;
const int IN3 = 18;
const int IN4 = 19;

// L298N enable pins — retained unchanged
const int ENA = 25;
const int ENB = 26;

int motorSpeed = 180;  // السرعة من 0 إلى 255

// Motor control functions — retained unchanged from the supplied sketch.
void setSpeed() {
  ledcWrite(ENA, motorSpeed);
  ledcWrite(ENB, motorSpeed);
}

void stopCar() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
}

void forward() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  setSpeed();
}

void backward() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  setSpeed();
}

void left() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  setSpeed();
}

void right() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  setSpeed();
}

String contentTypeFor(const String& path) {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".ico")) return "image/x-icon";
  if (path.endsWith(".json") || path.endsWith(".webmanifest")) return "application/json; charset=utf-8";
  if (path.endsWith(".woff2")) return "font/woff2";
  if (path.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

bool serveGzipFile(String path) {
  if (path == "/") path = "/index.html";
  if (path.indexOf("..") >= 0 || path.indexOf('\\') >= 0) return false;

  File file = LittleFS.open(path + ".gz", "r");
  if (!file || file.isDirectory()) return false;

  server.sendHeader("Content-Encoding", "gzip");
  server.sendHeader("Cache-Control", path == "/index.html" ? "no-cache, no-store, must-revalidate" : "public, max-age=86400");
  server.streamFile(file, contentTypeFor(path));
  file.close();
  return true;
}

void sendOk() {
  server.send(200, "text/plain; charset=utf-8", "OK");
}

void setup() {
  Serial.begin(115200);

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  // PWM: frequency 1000 Hz, resolution 8-bit (0–255) — retained unchanged.
  ledcAttach(ENA, 1000, 8);
  ledcAttach(ENB, 1000, 8);

  stopCar();
  setSpeed();

  if (!LittleFS.begin(true)) {
    Serial.println("LittleFS mount failed");
  }

  WiFi.mode(WIFI_AP);
  WiFi.setSleep(false);
  WiFi.softAPConfig(IPAddress(192, 168, 4, 1), IPAddress(192, 168, 4, 1), IPAddress(255, 255, 255, 0));
  WiFi.softAP(ssid, password);

  Serial.print("Dashboard: http://");
  Serial.println(WiFi.softAPIP());

  server.on("/", HTTP_GET, []() {
    if (!serveGzipFile("/index.html")) {
      server.send(500, "text/plain; charset=utf-8", "Dashboard files missing. Upload the LittleFS data files first.");
    }
  });

  // HTTP API — same routes consumed by the dashboard frontend.
  server.on("/forward", HTTP_GET, []() { forward(); sendOk(); });
  server.on("/backward", HTTP_GET, []() { backward(); sendOk(); });
  server.on("/left", HTTP_GET, []() { left(); sendOk(); });
  server.on("/right", HTTP_GET, []() { right(); sendOk(); });
  server.on("/stop", HTTP_GET, []() { stopCar(); sendOk(); });

  server.on("/speed", HTTP_GET, []() {
    if (server.hasArg("v")) {
      motorSpeed = constrain(server.arg("v").toInt(), 0, 255);
      setSpeed();
    }
    sendOk();
  });

  server.onNotFound([]() {
    if (!serveGzipFile(server.uri())) {
      server.send(404, "text/plain; charset=utf-8", "Not found");
    }
  });

  server.begin();
}

void loop() {
  server.handleClient();
}
