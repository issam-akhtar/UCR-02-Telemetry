Python 3.7.8 (tags/v3.7.8:4b47a5b6ba, Jun 28 2020, 08:53:46) [MSC v.1916 64 bit (AMD64)] on win32
Type "help", "copyright", "credits" or "license()" for more information.
>>> import socket
import json
from datetime import datetime

# Server settings
HOST = "0.0.0.0"  # Listen on all available interfaces
PORT = 12345      # Match this with the ESP32 serverPort

# Variables to track timing
last_packet_time = None  # Timestamp of the last received packet
last_expected_time = None  # Expected timestamp (from CAN data) of the last packet

# Create a TCP socket
server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server_socket.bind((HOST, PORT))
server_socket.listen(1)

print(f"Listening for incoming connections on {HOST}:{PORT}...")

client_socket, client_address = server_socket.accept()
print(f"Connected to {client_address}")

while True:
    try:
        data = client_socket.recv(1024)
        if not data:
            break

        # Decode JSON data
        try:
            decoded_data = json.loads(data.decode("utf-8"))
            print(f"Received packet: {decoded_data}")

            # Extract expected timestamp from the packet data
            expected_time = decoded_data.get("Time", None)
            if expected_time is None:
                print("No 'Time' field in packet data, skipping delay calculation.")
                continue

            # Log actual receipt timestamp
            current_time = datetime.now()
            timestamp = current_time.strftime("%Y-%m-%d %H:%M:%S.%f")
            print(f"Timestamp: {timestamp} - Packet: {decoded_data}")

            # Calculate actual and expected delays
            if last_packet_time is not None and last_expected_time is not None:
                # Actual delay in milliseconds
                actual_delay = (current_time - last_packet_time).total_seconds() * 1000

                # Expected delay in milliseconds (based on CAN data timestamps)
                expected_delay = (expected_time - last_expected_time) * 1000

                print(f"Expected delay: {expected_delay:.2f} ms, Actual delay: {actual_delay:.2f} ms")
            else:
                print("First packet received, no previous delay to compare.")

            # Update timestamps for the next packet
            last_packet_time = current_time
            last_expected_time = expected_time

        except json.JSONDecodeError as e:
            print("Failed to decode JSON:", e)

    except ConnectionResetError:
        print("Client disconnected. Waiting for reconnection...")
        client_socket, client_address = server_socket.accept()
        print(f"Reconnected to {client_address}")

client_socket.close()
server_socket.close()
