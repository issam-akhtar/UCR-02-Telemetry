import cantools
import can
import csv
import os
import sys
import matplotlib.pyplot as plt
import re
import os
import cantools.database

class CanFrame:
    def __init__(self, timestamp, channel, can_id, flags, dlc, data) -> None:
        self.timestamp = timestamp 
        self.channel = channel 
        self.can_id = can_id 
        self.flags = flags 
        self.dlc = dlc
        self.data = data  # each element is one byte      

    def __str__(self) -> str:
        return f'''
            Timestamp: {self.timestamp}
            Channel: {self.channel}
            CAN ID: {self.can_id}
            Flags: {self.flags}
            DLC: {self.dlc}
            Data: {self.data}
        ''' 

# Define the folder containing CSV files and the DBC file path
csv_folder = "./09-30"
dbc_path = "./UCR-01-1.dbc"

# Load the DBC file
db = cantools.database.load_file(dbc_path)

# Iterate through all files in the specified folder
for filename in os.listdir(csv_folder):
    if filename.endswith('.csv'):
        csv_path = os.path.join(csv_folder, filename)  # Create full path for the CSV file
        print(f'Processing file: {csv_path}')  # Print the name of the file being processed

        with open(csv_path, newline='') as csv_file:
            can_data = csv.reader(csv_file)
            for i, row in enumerate(can_data):
                if i >= 8:
                    row = [item for item in row if item != '']  # Remove empty items
                    try:
                        data = bytes([(int(i, 16)) for i in row[5:-2]])  # Extract data bytes
                    except:
                        print(f'Error converting data: {e}')
                        continue
                    can_id = int(row[2])  # Get the CAN ID
                    cells = [8]
                    da = [259,100,101]
                    if can_id in cells:
                        try:
                            frame = CanFrame(row[0], row[1], can_id, row[3], row[4], data)  # Create a CanFrame instance
                            msg = db.decode_message(can_id, data)  # Decode the message
                            # if msg.get("Cell7"):
                            if msg.get("CellCurrent"):
                            # print(f'{msg} for {can_id} at {frame.timestamp}')  # Print the decoded message
                                print(f'{msg.get("CellCurrent")} at {frame.timestamp}')  # Print the decoded message
                        except Exception as e:
                            # Handle any exceptions that occur during processing
                            print(f'Error: {e} for id:{can_id}')
                            continue
                        except IndexError as e:
                            # Handle index errors
                            print(f'Error: {e}')
                            continue
