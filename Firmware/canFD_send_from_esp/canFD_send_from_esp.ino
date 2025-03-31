#include <SPI.h>
#include <ACAN2517FD.h>
#include <WiFi.h>

// WiFi credentials
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

// Remote server IP and port
const char* host = "192.168.1.100"; // Replace with public IP or forwarded IP
const uint16_t port = 5000;         // Replace with port forwarding config

// SPI and CAN pin definitions
const int SPI_CS = 5;       // Chip select pin
const int INT_PIN = 4;      // INT pin from MCP2517FD
const int SPI_MISO = 19;
const int SPI_MOSI = 23;
const int SPI_SCK  = 18;

WiFiClient client;
ACAN2517FD can(SPI_CS, SPI, INT_PIN);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Starting CAN FD + WiFi sender...");

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected. IP: " + WiFi.localIP().toString());

  // Start SPI
  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI);

  // CAN FD Settings
  ACAN2517FDSettings settings(ACAN2517FDSettings::OSC_20MHz, 500000, DataBitRateFactor::x1, 2000000);
  const uint32_t error = can.begin(settings, [] {});
  if (error != 0) {
    Serial.print("CAN init failed. Error code: ");
    Serial.println(error, HEX);
    while (true) delay(100);
  } else {
    Serial.println("CAN FD init success.");
  }

  delay(1000); // Wait before attempting connection
}

void loop() {
  // Build a CAN FD message
  CANFDMessage msg;
  msg.id = 0x123;
  msg.len = 8;
  msg.data[0] = 0xDE;
  msg.data[1] = 0xAD;
  msg.data[2] = 0xBE;
  msg.data[3] = 0xEF;
  msg.data[4] = 0xCA;
  msg.data[5] = 0xFE;
  msg.data[6] = 0xBA;
  msg.data[7] = 0xBE;

  // Send CAN message (optional)
  can.tryToSend(msg);

  // Transmit over TCP
  if (!client.connected()) {
    Serial.println("Connecting to receiver...");
    if (!client.connect(host, port)) {
      Serial.println("Connection failed.");
      delay(1000);
      return;
    }
    Serial.println("Connected to receiver.");
  }

  // Send raw CAN message bytes (ID, DLC, Data[])
  uint8_t buffer[13];
  buffer[0] = (msg.id >> 24) & 0xFF;
  buffer[1] = (msg.id >> 16) & 0xFF;
  buffer[2] = (msg.id >> 8) & 0xFF;
  buffer[3] = msg.id & 0xFF;
  buffer[4] = msg.len;
  memcpy(&buffer[5], msg.data, msg.len); // Up to 64 bytes for CAN FD, but msg.len = 8 here

  client.write(buffer, 5 + msg.len);
  Serial.println("Sent CAN FD message over TCP.");

  delay(1000); // Send once per second
}
