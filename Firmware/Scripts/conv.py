import csv

# Define the input and output file paths
input_file = './Data/Raw Data/11-16_043.csv'
output_file = './conv.csv'

with open(input_file, 'r') as infile, open(output_file, 'w', newline='') as outfile:
    reader = csv.reader(infile)
    writer = csv.writer(outfile)

    # Read the header and determine column indices
    header = next(reader)
    time_idx = header.index('Time')
    channel_idx = header.index('Channel')
    id_idx = header.index('id')
    flags_idx = header.index('Flags')
    dlc_idx = header.index('DLC')
    data_start_idx = header.index('Data0')
    counter_idx = header.index('Counter')
    abstime_idx = header.index('AbsTime')

    # Create new header with Data0 to Data7
    new_header = header[:data_start_idx] + \
        [f'Data{i}' for i in range(8)] + header[counter_idx:]
    writer.writerow(new_header)

    for row in reader:
        # Extract original values
        original_dlc = int(row[dlc_idx])
        data = row[data_start_idx: data_start_idx + original_dlc]
        flags = int(row[flags_idx])

        # Convert to CAN 2.0
        can20_dlc = min(original_dlc, 8)
        truncated_data = data[:can20_dlc]
        # Clear CAN FD EDL bit (bit 30)
        adjusted_flags = flags & ~0x40000000

        # Pad data to ensure 8 bytes (empty strings if needed)
        padded_data = truncated_data + [''] * (8 - len(truncated_data))

        # Construct the new row
        new_row = [
            row[time_idx],
            row[channel_idx],
            row[id_idx],
            str(adjusted_flags),
            str(can20_dlc),
            *padded_data,
            row[counter_idx],
            row[abstime_idx]
        ]

        writer.writerow(new_row)

print(f"Conversion completed. Output saved to {output_file}")
