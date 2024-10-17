import matplotlib.pyplot as plt
import re
import os
import mplcursors  # Import mplcursors for interactive tooltips

# Function to parse the input data
def parse_input_data(lines):
    data = {}
    for line in lines:
        parts = line.strip().split(',')
        time_stamp = float(parts[0])
        values = {}
        for part in parts[1:]:
            match = re.match(r"(Cell\d+)\s\{([0-9.]+)\}", part)
            if match:
                cell, value = match.groups()
                # Check if the cell number is 115 or less
                if int(cell[4:]) <= 115:  # Extract the number from 'CellX'
                    values[cell] = float(value)
        if values:  # Only add to data if values is not empty
            if time_stamp in data:
                data[time_stamp].update(values)  # Merge new values if timestamp already exists
            else:
                data[time_stamp] = values
    return data

# Function to plot data for a given file
def plot_data(file_path, data):
    plt.figure(figsize=(14, 10))

    # Extract and plot values for each cell from Cell1 to Cell115
    for cell_number in range(1, 116):  # From Cell1 to Cell115
        cell_name = f'Cell{cell_number}'
        cell_times = []
        cell_values = []

        # Extract values for the current cell
        for time_stamp, values in sorted(data.items()):  # Ensure timestamps are sorted
            if cell_name in values:
                cell_times.append(time_stamp)
                cell_values.append(values[cell_name])

        # Plotting the line graph for the current cell
        line, = plt.plot(cell_times, cell_values, marker='o', label=cell_name)  # Line graph with markers

        # Enable hover tooltip for the current line
        mplcursors.cursor(line, hover=True).connect("add", lambda sel, cell_name=cell_name: sel.annotation.set_text(cell_name))

    # Adding title and labels
    plt.title(f'Cell Voltages Over Time for {os.path.basename(file_path)}')
    plt.xlabel('Time')
    plt.ylabel('Cell Voltage')
    plt.xticks(rotation=45)  # Rotate x-ticks for better readability
    plt.grid(True)

    # Adding legend
    plt.legend(loc='upper left', bbox_to_anchor=(1, 1), ncol=4, fontsize='small')

    # Adjust layout to prevent clipping of tick-labels
    plt.tight_layout()
    plt.subplots_adjust(right=0.7)
    # Show plot
    plt.show()

# Main function to process the text file
def process_text_file(text_file_path):
    with open(text_file_path, 'r') as file:
        lines = file.readlines()

    current_file = None
    current_data = []

    for line in lines:
        line = line.strip()
        if line.startswith("Processing file:"):
            # If we were processing a file, plot its data
            if current_file and current_data:
                data = parse_input_data(current_data)
                plot_data(current_file, data)

            # Start a new file
            current_file = line.split(": ")[1]  # Get the CSV file path
            current_data = []  # Reset current data
        else:
            # Add line to current data if it's not a processing file line
            current_data.append(line)

    # Don't forget to plot the last file's data
    if current_file and current_data:
        data = parse_input_data(current_data)
        plot_data(current_file, data)

# Path to the input text file
text_file_path = './cell.plot'  # Adjust this path as necessary

# Process the text file
process_text_file(text_file_path)
#good