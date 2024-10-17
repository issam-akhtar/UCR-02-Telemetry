import matplotlib.pyplot as plt
import re
import os

# Define the path to your text file
file_path = './cell_current.txt'

# Initialize a dictionary to hold the data for each file
data_dict = {}

# Read the file
with open(file_path, 'r') as file:
    lines = file.readlines()

cur = None

for line in lines:
    file_match = re.match(r'Processing file: (.+)', line)
    if file_match:
        cur = file_match.group(1)
        data_dict[cur] = {'timestamps': [], 'voltages': []}
        continue 

    # Extract voltage and timestamp data
    voltage_match = re.match(r'([0-9.]+) at ([0-9.]+)', line)
    if voltage_match and cur:
        voltage = float(voltage_match.group(1))
        timestamp = float(voltage_match.group(2))
        data_dict[cur]['voltages'].append(voltage)
        data_dict[cur]['timestamps'].append(timestamp)

# Plot all data on one graph
plt.figure(figsize=(10, 6))

for file_name, data in data_dict.items():
    plt.plot(data['timestamps'], data['voltages'], marker='o', label=os.path.basename(file_name))

plt.title('Cell Current vs. Timestamp')
plt.xlabel('Timestamp (seconds)')
plt.ylabel('Cell Current (A)')
plt.grid()
plt.legend()
plt.tight_layout()
plt.show()
