#include <WiFi.h>
#include <WebSocketsClient.h>

const char* ssid     = "sample_ssd";
const char* password = "sample_pass";

const char* serverIP = "184.64.123.31";
const uint16_t serverPort = 50001;
const char* websocketPath = "/telemetry";

const int potPin = 34;

WebSocketsClient webSocket;

// Median filter
const int medianWindowSize = 12;
int medianBuffer[medianWindowSize];
int medianIndex = 0;

// Helper: Convert byte array to hex string
String byteArrayToHexString(uint8_t* data, size_t length) {
  String hexString = "";
  char hexChar[3];
  for (size_t i = 0; i < length; i++) {
    sprintf(hexChar, "%02X", data[i]);
    hexString += hexChar;
    if (i < length - 1) hexString += " ";
  }
  return hexString;
}

// Helper: Median from buffer
int getMedian(int* arr, int size) {
  int sorted[size];
  memcpy(sorted, arr, sizeof(int) * size);
  std::sort(sorted, sorted + size);
  return sorted[size / 2];
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED: Serial.println("Disconnected from WebSocket server!"); break;
    case WStype_CONNECTED: Serial.println("Connected to WebSocket server."); break;
    case WStype_TEXT: Serial.printf("Received text: %s\n", payload); break;
    case WStype_ERROR: Serial.println("WebSocket error!"); break;
    default: break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected. IP: " + WiFi.localIP().toString());

  webSocket.onEvent(webSocketEvent);
  webSocket.begin(serverIP, serverPort, websocketPath);
  webSocket.enableHeartbeat(15000, 3000, 2);

  // Initialize median buffer
  for (int i = 0; i < medianWindowSize; i++) {
    medianBuffer[i] = analogRead(potPin);
  }
}

void loop() {
  webSocket.loop();

  // Read analog and update median buffer
  int rawValue = analogRead(potPin);
  medianBuffer[medianIndex] = rawValue;
  medianIndex = (medianIndex + 1) % medianWindowSize;
  int filteredValue = getMedian(medianBuffer, medianWindowSize);

  // Debug
  Serial.print("Raw: ");
  Serial.print(rawValue);
  Serial.print("  Median Filtered: ");
  Serial.println(filteredValue);

  // Prepare CAN-like packet
  uint8_t data[20] = {0};
  data[0] = 0x00;
  data[1] = 0x00;
  data[2] = 0x01;
  data[3] = 0x03;

 
  uint16_t value = (uint16_t)filteredValue;
  data[16] = value & 0xFF;
  data[17] = (value >> 8) & 0xFF;

  Serial.print("CAN Packet Bytes: ");
  for (int i = 0; i < 20; i++) {
    Serial.print(data[i], HEX);
    Serial.print(" ");
  }
  Serial.println();

  String hexString = byteArrayToHexString(data, 20);
  Serial.print("Hex String: ");
  Serial.println(hexString);

  if (webSocket.isConnected()) {
    webSocket.sendTXT(hexString);
    Serial.println("Data sent successfully");
  } else {
    Serial.println("WebSocket disconnected. Trying to reconnect...");
  }

  delay(15);
}
