import cantools
import csv
import os

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
        
        # Define output CSV path for the current input file
        if not os.path.exists("./Decoded_Logs"):
            os.makedirs("./Decoded_Logs")
        output_csv_path = os.path.join("./Decoded_Logs", f'decoded_{filename}')  # New output file name

        # Prepare to write to the output CSV file
        with open(output_csv_path, mode='w', newline='') as output_csv_file:
            csv_writer = csv.writer(output_csv_file)
            
            # Initialize a set to hold all unique keys for the header
            header_set = set()

            # First pass: Read the input CSV to collect headers
            with open(csv_path, newline='') as csv_file:
                can_data = csv.reader(csv_file)
                for i, row in enumerate(can_data):
                    if i >= 8:  # Skip the first 8 rows
                        row = [item for item in row if item != '']  # Remove empty items
                        try:
                            data = bytes([(int(i, 16)) for i in row[5:-2]])  # Extract data bytes
                        except Exception as e:
                            print(f'Error converting data: {e}')
                            continue
                        can_id = int(row[2])  # Get the CAN ID
                        
                        if can_id:
                            try:
                                frame = CanFrame(row[0], row[1], can_id, row[3], row[4], data)  # Create a CanFrame instance
                                msg = db.decode_message(can_id, data)  # Decode the message

                                # Add keys to the header set
                                header_set.update(msg.keys())

                            except Exception as e:
                                continue
                            except IndexError as e:
                                continue

            # Custom sort headers: Cell# sorted numerically, others alphabetically
            def sort_key(header):
                if header.startswith("Cell") and header[4:].isdigit():
                    return (0, int(header[4:]))  # Sort numerically for Cell#
                else:
                    return (1, header)  # Sort alphabetically for others

            sorted_headers = sorted(header_set, key=sort_key)

            # Write the header row to the output CSV
            header_row = ['Timestamp', 'Channel', 'CAN ID', 'Flags', 'DLC'] + sorted_headers
            csv_writer.writerow(header_row)

            # Second pass: Read the input CSV again to write data rows
            with open(csv_path, newline='') as csv_file:
                can_data = csv.reader(csv_file)
                for i, row in enumerate(can_data):
                    if i >= 8:  # Skip the first 8 rows
                        row = [item for item in row if item != '']  # Remove empty items
                        try:
                            data = bytes([(int(i, 16)) for i in row[5:-2]])  # Extract data bytes
                        except Exception as e:
                            print(f'Error converting data: {e}')
                            continue
                        can_id = int(row[2])  # Get the CAN ID
                        
                        if can_id:
                            try:
                                frame = CanFrame(row[0], row[1], can_id, row[3], row[4], data)  # Create a CanFrame instance
                                msg = db.decode_message(can_id, data)  # Decode the message

                                # Create a row for the CSV
                                row_data = [frame.timestamp, frame.channel, frame.can_id, frame.flags, frame.dlc]
                                # Add values from the decoded message in sorted order
                                row_data += [msg.get(key, '') for key in sorted_headers]  # Fill missing keys with empty strings
                                csv_writer.writerow(row_data)  # Write to CSV

                            except Exception as e:
                                continue
                            except IndexError as e:
                                continue

        print(f'Decoded data has been exported to {output_csv_path}')  # Confirmation message for each file
