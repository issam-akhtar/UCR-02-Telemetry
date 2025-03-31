#!/Users/issam/system_env/bin/python3
"""
This is a utility to send CAN FD data from a CSV log file from the vehicle Kvaser and send it over a SLCAN device.
The intention is to send data from the SLCAN to the telemetry module to simulate the car sending data.
Essentially, the SLCAN is replacing the car, and this script will be driving the SLCAN with data.

Written by: Issam Akhtar
"""

import csv
import signal
import sys
import can
import cantools
import time
import argparse
from can import Message, BLFWriter
from can.interfaces import slcan

old_time = 0.000000000
messages = []


def test_can(bus):
    arbitration_id = 0x123    # Replace with your CAN ID
    data = [0x01, 0x02, 0x03, 0x04]  # Replace with your data bytes
    message = can.Message(
        arbitration_id=arbitration_id, data=data, is_extended_id=False, is_fd=True)
    bus.send(message)
    print(f"Message sent on {message}")


def can_init(start):
    print(f'Initializing CANBus')
    # Initialize the SLCAN bus with CAN FD support
    bus = slcan.slcanBus(
        channel=args.slcan_port, bitrate=500000)
    print(f'Bus Initialized, took: {time.time() - start} seconds')
    bus.open()
    return bus


def time_delay(t: float) -> None:
    """
    Might need to delay this more after doing the CAN processing, see how long it takes
    """
    sleep_time = float(t) - old_time - 0.000415 if (
        float(t) - old_time - 0.000415 > 0) else (float(t) - old_time)
    time.sleep(sleep_time)


def create_can_msg(row):
    # Adjust the data array to handle up to 64 bytes for CAN FD
    data_arr = [int(i, 16) for i in row[5:-2] if i]
    msg = Message(
        timestamp=float(row[0]), channel=(int(row[1])-2), arbitration_id=int(row[2]), dlc=int(row[4], 16),
        data=data_arr)
    return msg


def listen_for_messages(bus):
    print('Listening for incoming CAN messages...')
    try:
        while True:
            msg = bus.recv()  # Blocking call, waits for a message
            if msg:
                print(f'Received message: {msg}')
    except KeyboardInterrupt:
        print('\nListening stopped.')
        bus.shutdown()


def generate_blf_file(messages, file):
    blf_writer = can.BLFWriter(file=file, append=False)

    for message in messages:
        print(message)
        blf_writer.on_message_received(message)

    blf_writer.stop()


def main():
    global old_time
    global bus
    start = time.time()
    try:
        bus = can_init(start)

        if args.listen:
            listen_for_messages(bus)
            # for i in range(10000):
            #     test_can(bus)
        else:
            writer = BLFWriter('output.blf')
            with open(args.logfile, newline='', mode='r') as log:
                # We enumerate so i=line_number of csv.
                reader = csv.reader(log)
                for i, row in enumerate(reader):
                    if i > 7:  # if i > 8 means we skip the header
                        try:
                            # create CAN FD packet here
                            msg = create_can_msg(row)
                            sleep_time = float(row[0]) - old_time - 0.000415 if (
                                float(row[0]) - old_time - 0.000415 > 0) else (float(row[0]) - old_time)
                            # time.sleep(sleep_time)
                            old_time = float(row[0])
                        except ValueError as e:
                            print(f'{e} for {i} with {row}')
                        # send CAN FD packet over SLCAN
                        try:
                            bus.send(msg)
                            # print(f'{msg} : {i}')
                            messages.append(msg)
                        except Exception as e:
                            print('shutting down with {e}')
                            bus.shutdown()
                        except KeyboardInterrupt:
                            bus.shutdown()
                            print('\nProgram Terminated')
    except KeyboardInterrupt:
        bus.shutdown()
        print('\nProgram Terminated')
        generate_blf_file(messages=messages, file='output.blf')
    generate_blf_file(messages=messages, file='output.blf')


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        prog="SLCAN Transmit", description="Sends CSV data over the SLCAN interface", epilog="Developed by: Issam Akhtar")
    parser.add_argument(
        "logfile", nargs='?', help="The path to the .csv file you want to send")
    parser.add_argument(
        "slcan_port", help="The tty port the SLCAN registers as")
    parser.add_argument("--listen", action='store_true',
                        help="Listen for incoming CAN messages on the SLCAN bus")
    parser.add_argument("--blf", action='store_true',
                        help="Convert file to bld")
    args = parser.parse_args()

    # Send the CAN message or listen
    main()
    bus.shutdown()
