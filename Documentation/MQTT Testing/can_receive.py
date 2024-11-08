import paho.mqtt.client as mqtt
import json
from datetime import datetime

# MQTT credentials and settings
mqtt_broker = "localhost"  # Replace with your MQTT broker IP
mqtt_port = 1883 # specify the port here
mqtt_topic = "car/raw_sensors"
mqtt_user = "test_user"
mqtt_password = "test_password"

# Variables to track timing
last_packet_time = None  # Timestamp of the last received packet
last_expected_time = None  # Expected timestamp (from CAN data) of the last packet


# Function to handle incoming MQTT messages
def on_message(client, userdata, msg):
    global last_packet_time, last_expected_time
    try:
        # Decode and parse JSON data
        data = json.loads(msg.payload.decode())
        print(f"Received packet: {data}")

        # Extract expected timestamp from the packet data
        expected_time = data.get("Time", None)
        if expected_time is None:
            print("No 'Time' field in packet data, skipping delay calculation.")
            return

        # Log actual receipt timestamp
        current_time = datetime.now()
        timestamp = current_time.strftime("%Y-%m-%d %H:%M:%S.%f")
        print(f"Timestamp: {timestamp} - Packet: {data}")

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


# Function to handle connection to the broker
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected to MQTT Broker!")
        client.subscribe(mqtt_topic)
    else:
        print("Failed to connect, return code %d\n", rc)


# Set up the client
client = mqtt.Client()
client.username_pw_set(mqtt_user, mqtt_password)
client.on_connect = on_connect
client.on_message = on_message

# Connect to the MQTT broker and start the loop
client.connect(mqtt_broker, mqtt_port, 60)
client.loop_forever()
