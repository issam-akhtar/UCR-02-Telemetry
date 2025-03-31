// Required libraries
#include <ACAN2517FD.h>
#include <WiFi.h>
#include <SPI.h>


// Define SPI and CAN pins
static const byte MCP2517FD_CS  = 5;  // Chip Select pin
static const byte MCP2517FD_INT = 4;  // Interrupt pin

// Create CAN controller instance
ACAN2517FD can(MCP2517FD_CS, SPI, MCP2517FD_INT);

void setup() {
  Serial.begin(115200);
  while (!Serial) {}

  // Start SPI
  SPI.begin();

  // Configure CAN settings
  ACAN2517FDSettings settings(ACAN2517FDSettings::OSC_40MHz, 500 * 1000, DataBitRateFactor::x8); // 500 kbps nominal, 4 Mbps data rate
  settings.mDriverTransmitFIFOSize = 32;
  settings.mDriverReceiveFIFOSize = 32;

  // Initialize CAN controller
  const uint32_t errorCode = can.begin(settings, [] { can.isr(); });
  if (errorCode == 0) {
    Serial.println("CAN FD initialized successfully.");
  } else {
    Serial.print("CAN FD initialization failed. Error code: 0x");
    Serial.println(errorCode, HEX);
    while (1);
  }
}

void loop() {
  // Example: Sending a CAN FD message
  CANFDMessage message;
  message.id = 0x123;
  message.len = 8;
  message.data[0] = 0x11;
  message.data[1] = 0x22;
  message.data[2] = 0x33;
  message.data[3] = 0x44;
  message.data[4] = 0x55;
  message.data[5] = 0x66;
  message.data[6] = 0x77;
  message.data[7] = 0x88;
  message.type = CANFDMessage::CANFD_WITH_BIT_RATE_SWITCH;

  const bool sent = can.tryToSend(message);
  if (sent) {
    Serial.println("CAN FD message sent.");
  } else {
    Serial.println("Failed to send CAN FD message.");
  }

  // Example: Receiving a CAN FD message
  if (can.available()) {
    CANFDMessage receivedMessage;
    can.receive(receivedMessage);
    Serial.print("Received CAN FD message with ID: 0x");
    Serial.println(receivedMessage.id, HEX);
    // Process received message
  }

  delay(1000);
}
