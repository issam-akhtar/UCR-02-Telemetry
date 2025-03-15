import can
from can.interfaces import slcan
import time


def send_can_message(channel, bitrate, arbitration_id, data):
    """
    Sends a CAN message using SLCAN and formats the output.

    :param channel: The serial port channel (e.g., '/dev/ttyUSB0' or 'COM3').
    :param bitrate: The CAN bus bitrate (e.g., 500000 for 500 kbps).
    :param arbitration_id: The CAN ID of the message.
    :param data: The data to be sent in the message (list of bytes).
    """
    try:
        # Initialize the SLCAN bus
        bus = slcan.slcanBus(channel=channel, bitrate=bitrate)
        bus.open()

        # Create a CAN message
        message = can.Message(
            arbitration_id=arbitration_id, data=data, is_extended_id=False)

        # Send the CAN message
        while True:
            bus.send(message)
            # Prepare the output format
            timestamp = time.time()  # Get the current time
            # Format data bytes as hex
            formatted_data = ','.join(f"{byte:02x}" for byte in data)
            # Create output string
            output = f"{timestamp:.5f},{channel},{arbitration_id},{196610},{len(data)},{formatted_data},"
            # Fill remaining fields with empty values
            output += ','.join([''] * (64 - len(data) - 6))
            output += f",1,{time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(timestamp))}"
            print(f"Message sent on {channel}: {output}")

    except can.CanError as e:
        print(f"An error occurred: {e}")
    except KeyboardInterrupt:
        bus.shutdown()
        print("\nDone")


if __name__ == "__main__":
    # Define your parameters
    channel = '/dev/tty.usbmodem1101'  # Replace with your serial port
    bitrate = 500000          # Replace with your CAN bus bitrate
    arbitration_id = 0x123    # Replace with your CAN ID
    data = [0x6a, 0xbc, 0x73, 0x46, 0x0d, 0x25, 0x17, 0x44, 0x95, 0x4e,
            0x28, 0x44, 0xb3, 0x2d, 0x83, 0x46]  # Example data bytes

    # Send the CAN message
    send_can_message(channel, bitrate, arbitration_id, data)
