import can
import csv
import time
import argparse  # Assuming you're using argparse to handle command-line arguments

def time_delay(current_time, old_time):
    # Implement the delay based on current and old timestamps
    time_to_wait = float(current_time) - old_time
    if time_to_wait > 0:
        time.sleep(time_to_wait)

def send_can_messages(args):
    start = time.time()
    print('Initializing CANBus')
    
    # Initialize CAN interface
    bus = can.interface.Bus(bustype='slcan', channel=args.slcan_port, bitrate=500000)
    print(f'Bus Initialized, took: {time.time() - start} seconds')

    with open(args.logfile, newline='', mode='r') as log:
        reader = csv.reader(log)  # We enumerate so i=line_number of CSV.
        old_time = 0

        for i, row in enumerate(reader):
            if i > 7:  # Skip the header
                try:
                    # Create CAN message
                    data_arr = [int(x, 16) for x in row[5:-2] if x]
                    msg = can.Message(
                        timestamp=float(row[0]), 
                        arbitration_id=int(row[2], 16), 
                        data=data_arr, 
                        is_extended_id=False
                    )
                        
                    # Send CAN message with calculated delay
                    time_delay(row[0], old_time)
                    old_time = float(row[0])
                    
                    bus.send(msg)
                    print(msg)
                    
                except ValueError as e:
                    print(f'{e} for line {i} with {row}')
                except Exception as e:
                    print(f'Unexpected error on line {i}: {e}')

        print('Shutting down')
        bus.shutdown()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Send CAN messages over SLCAN.')
    parser.add_argument('--slcan_port', type=str, required=True, help='SLCAN port (e.g., /dev/ttyUSB0)')
    parser.add_argument('--logfile', type=str, required=True, help='CSV log file with CAN messages')

    
    args = parser.parse_args()
    send_can_messages(args)