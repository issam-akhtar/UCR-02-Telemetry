import can
import random


def generate_blf_file(messages, file):
    blf_writer = can.BLFWriter(file=file, append=False)

    for message in messages:
        blf_writer.on_message_received(message)

    blf_writer.stop()

# Function to generate a CAN message with random data of 20 bytes


def create_can_message(timestamp, arbitration_id, channel, is_rx=False):
    return can.Message(
        timestamp=timestamp,
        arbitration_id=arbitration_id,
        is_extended_id=False,
        is_rx=is_rx,
        channel=channel,
        dlc=64,  # Set the Data Length Code to 20
        # Generate random values for 20 bytes
        data=[random.randint(0, 255) for _ in range(64)],
        is_fd=False  # Marking this as a CAN FD frame
    )


# Generate initial set of CAN messages with random data
can_messages = [
    create_can_message(timestamp=2.5010, arbitration_id=0xC8, channel=1),
    create_can_message(timestamp=3.876708, arbitration_id=0x6F9, channel=0),
    create_can_message(timestamp=3.876708, arbitration_id=0x6F9, channel=0),
    create_can_message(timestamp=3.876708, arbitration_id=0x6F9, channel=0),
    create_can_message(timestamp=3.876708, arbitration_id=0x6F9, channel=0),
    create_can_message(timestamp=3.876708, arbitration_id=0x6F9, channel=0)
]

# Generate additional set of CAN messages with random data
can_messages_append = [
    create_can_message(timestamp=4.5010, arbitration_id=0xC8, channel=1),
    create_can_message(timestamp=5.876708, arbitration_id=0x6F9, channel=0)
]

blf_output_file = './output.blf'

# Generate the BLF file with the messages
generate_blf_file(can_messages, blf_output_file)
# generate_blf_file(can_messages_append, blf_output_file)
