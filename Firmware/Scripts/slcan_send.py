#!/Users/issam/system_env/bin/python3
"""
This is a utility to send can data from a csv log file from the vehicle kvaser and send it over a slcan device.
The intention is to send data from the slcan to the telemetry module to simulat the car sending data.
Essentially the slcan is replacing the car and this script will be driving the slcan with data.

Written by: Issam Akhtar
"""

import csv
import signal
import sys
import can
import cantools
import time
import argparse
from can import Message
from can.interfaces import slcan

old_time = 0.000000000


def test_can(bus):
    arbitration_id = 0x123    # Replace with your CAN ID
    data = [0x01, 0x02, 0x03, 0x04]  # Replace with your data bytes
    message = can.Message(
        arbitration_id=arbitration_id, data=data, is_extended_id=False)
    # while True:
    bus.send(message)
    print(f"Message sent on {message}")


def can_init(start):
    print(f'Initializing CANBus')
    # Initialize the SLCAN bus
    bus = slcan.slcanBus(
        channel=args.slcan_port, bitrate=500000)
    print(f'Bus Initialized, took: {time.time() - start} seconds')
    bus.open()
    return bus


def time_delay(t: float) -> None:
    """
    Might need to delay this more after doing the can processing, see how long it takes
    """
    sleep_time = float(t) - old_time - 0.000415 if (
        float(t) - old_time - 0.000415 > 0) else (float(t) - old_time)
    time.sleep(sleep_time)


def create_can_msg(row):
    data_arr = [int(i, 16) for i in row[5:-2] if i]
    msg = Message(
        timestamp=float(row[0]), channel=row[1], arbitration_id=int(row[2]), dlc=int(row[4], 16), data=data_arr)
    return msg


def main():
    global old_time
    global bus
    start = time.time()
    try:
        bus = can_init(start)

        with open(args.logfile, newline='', mode='r') as log:
            # delimiter='  ' makes the whole line one string
            reader = csv.reader(log)  # We enumerate so i=line_number of csv.
            for i, row in enumerate(reader):
                if i > 7:  # if i > 8 means we skip the header
                    try:
                        # create can packet here
                        msg = create_can_msg(row)
                        time_delay(row[0])
                        old_time = float(row[0])
                    except ValueError as e:
                        print(f'{e} for {i} with {row}')
                    # send can packet over SLCAN
                    try:
                        bus.send(msg)
                        print(f'{msg} : {i}')
                    except Exception as e:
                        print('shutting down with {e}')
                        bus.shutdown()
                    except KeyboardInterrupt:
                        bus.shutdown()
                        print('\nProgram Terminated')
    except KeyboardInterrupt:
        bus.shutdown()
        print('\nProgram Terminated')


if __name__ == "__main__":
    args = argparse.ArgumentParser(
        prog="SLCAN Transmit", description="Sends csv data over the SLCAN interface", epilog="Developed by: Issam Akhtar")
    args.add_argument(
        "logfile", help="The path to the .csv file you want to send")
    args.add_argument("slcan_port", help="The tty port the slcan registers as")
    args = args.parse_args()

    # Send the CAN message
    main()
    bus.shutdown()
