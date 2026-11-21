/*
  Rover Pilot Dashboard — ESP32 offline firmware
  Board: original ESP32 / ESP32-WROOM family (not ESP32-S3)
  Upload frontend files from firmware/data to LittleFS using Arduino IDE's
  ESP32 LittleFS filesystem uploader. See firmware/README.md.

  AP: Electric-Car / car12345
  Dashboard: http://192.168.4.1
  API: /forward /backward /left /right /stop /speed?v=0..255
*/
#include <WiFi.h>
#include <WebServer.h>
#include <LittleFS.h>

const char* WIFI_SSID = "Electric-Car";
const char* WIFI_PASSWORD = "car12345";
WebServer server(80);

const int IN1 = 16, IN2 = 17, IN3 = 18, IN4 = 19;
const int ENA = 25, ENB = 26;
int motorSpeed = 180;
bool driveActive = false;
unsigned long lastDriveCommandMs = 0;
const unsigned long MOTOR_WATCHDOG_MS = 500;

void setSpeed() { ledcWrite(ENA, motorSpeed); ledcWrite(ENB, motorSpeed); }
void stopCar() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
  driveActive = false;
}
void markDriveCommand() { driveActive = true; lastDriveCommandMs = millis(); }
void forward() {
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
  setSpeed(); markDriveCommand();
}
void backward() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH);
  setSpeed(); markDriveCommand();
}
void left() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
  setSpeed(); markDriveCommand();
}
void right() {
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH);
  setSpeed(); markDriveCommand();
}
String contentTypeFor(const String& path) {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".ico")) return "image/x-icon";
  if (path.endsWith(".json") || path.endsWith(".webmanifest")) return "application/json";
  if (path.endsWith(".woff2")) return "font/woff2";
  if (path.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}
bool serveGzipFile(String path) {
  if (path == "/") path = "/index.html";
  if (path.indexOf("..") >= 0 || path.indexOf('\\\\') >= 0) return false;
  File file = LittleFS.open(path + ".gz", "r");
  if (!file || file.isDirectory()) return false;
  server.sendHeader("Content-Encoding", "gzip");
  server.sendHeader("Cache-Control", path == "/index.html" ? "no-cache" : "public, max-age=86400");
  server.streamFile(file, contentTypeFor(path));
  file.close();
  return true;
}
void sendOk() { server.send(200, "text/plain", "OK"); }

void setup() {
  Serial.begin(115200);
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  ledcAttach(ENA, 1000, 8); ledcAttach(ENB, 1000, 8);
  stopCar(); setSpeed();
  if (!LittleFS.begin(true)) Serial.println("LittleFS mount failed");

  WiFi.mode(WIFI_AP);
  WiFi.setSleep(false);
  WiFi.softAPConfig(IPAddress(192,168,4,1), IPAddress(192,168,4,1), IPAddress(255,255,255,0));
  WiFi.softAP(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Dashboard: http://"); Serial.println(WiFi.softAPIP());

  server.on("/", HTTP_GET, []() {
    if (!serveGzipFile("/index.html")) server.send(500, "text/plain", "Dashboard files missing. Upload the LittleFS data artifact.");
  });
  server.on("/forward", HTTP_GET, []() { forward(); sendOk(); });
  server.on("/backward", HTTP_GET, []() { backward(); sendOk(); });
  server.on("/left", HTTP_GET, []() { left(); sendOk(); });
  server.on("/right", HTTP_GET, []() { right(); sendOk(); });
  server.on("/stop", HTTP_GET, []() { stopCar(); sendOk(); });
  server.on("/speed", HTTP_GET, []() {
    if (server.hasArg("v")) motorSpeed = constrain(server.arg("v").toInt(), 0, 255);
    setSpeed(); sendOk();
  });
  server.onNotFound([]() {
    if (!serveGzipFile(server.uri())) server.send(404, "text/plain", "Not found");
  });
  server.begin();
}
void loop() {
  server.handleClient();
  if (driveActive && millis() - lastDriveCommandMs > MOTOR_WATCHDOG_MS) {
    stopCar();
    Serial.println("Motor watchdog: STOP");
  }
}
