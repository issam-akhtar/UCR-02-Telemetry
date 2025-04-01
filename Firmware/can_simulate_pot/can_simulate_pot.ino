#include <WiFi.h>

// WiFi credentials
const char* ssid     = "SM-G965W8691";
const char* password = "wxat1992";

// TCP server details
const char* serverIP = "192.168.1.100"; // Replace with your external computer's IP address or hostname
const uint16_t serverPort = 12345;      // Replace with the target port number

// Define the analog input pin
const int potPin = 34;

WiFiClient client;

void setup() {
  // Start Serial communication for debugging
  Serial.begin(115200);
  delay(1000);

  // Connect to WiFi network
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi connected.");
  Serial.print("Local IP: ");
  Serial.println(WiFi.localIP());

  // Connect to the TCP server
  Serial.print("Connecting to server ");
  Serial.print(serverIP);
  Serial.print(":");
  Serial.println(serverPort);
  if (!client.connect(serverIP, serverPort)) {
    Serial.println("Connection to server failed!");
  } else {
    Serial.println("Connected to server.");
  }
}

void loop() {
  // Read the analog value from the potentiometer
  int potValue = analogRead(potPin);
  Serial.print("Potentiometer Value: ");
  Serial.println(potValue);

  // Convert the analog value into a two-byte representation.
  // ESP32 analogRead returns a 12-bit value (0-4095), so 2 bytes are sufficient.
  uint16_t value = (uint16_t)potValue;
  uint8_t data[2];
  // Store in big-endian format (most significant byte first)
  data[0] = (value >> 8) & 0xFF;
  data[1] = value & 0xFF;

  // For debugging, print the hex bytes to the Serial Monitor
  Serial.print("Hex Bytes: ");
  Serial.print(data[0], HEX);
  Serial.print(" ");
  Serial.println(data[1], HEX);

  // Send the binary data over TCP if the connection is active
  if (client.connected()) {
    client.write(data, 2);
  } else {
    // Attempt to reconnect if the connection has dropped
    Serial.println("Reconnecting to server...");
    if (client.connect(serverIP, serverPort)) {
      client.write(data, 2);
    }
  }

  delay(500);
}
