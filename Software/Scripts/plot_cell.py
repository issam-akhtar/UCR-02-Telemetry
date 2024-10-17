import matplotlib.pyplot as plt
import pandas as pd
from ipywidgets import interact, Checkbox
import re
import numpy as np

# Function to parse the text file and extract cell data
def parse_cells_file(filename):
    data = {}
    max_length = 0
    with open(filename, 'r') as file:
        lines = file.readlines()
        for line in lines:
            match = re.search(r"(\{.*?\})", line)
            if match:
                cells_data = eval(match.group(1))
                for cell, value in cells_data.items():
                    if cell not in data:
                        data[cell] = []
                    data[cell].append(value)
                max_length = max(max_length, len(cells_data))
    
    # Ensure all lists are of the same length
    for cell in data:
        if len(data[cell]) < max_length:
            data[cell].extend([np.nan] * (max_length - len(data[cell])))
    
    return data

# Parse the cells.txt file
data = parse_cells_file('cells.txt')

# Create a DataFrame
df = pd.DataFrame(data)

# Initialize the plot
fig, ax = plt.subplots()

# Plot all c initially
lines = {}
for cell in df.columns:
    lines[cell], = ax.plot(df.index, df[cell], label=cell)

# Add legend
legend = ax.legend(loc='upper right', bbox_to_anchor=(1.15, 1.0))

# Function to update the visibility of the lines
def update_visibility(**kwargs):
    for cell, visible in kwargs.items():
        lines[cell].set_visible(visible)
    plt.draw()

# Create a dictionary of checkboxes for each cell
checkboxes = {cell: Checkbox(value=True, description=cell) for cell in df.columns}

# Create an interactive widget to control visibility
interact(update_visibility, **checkboxes)

# Display the plot
plt.show()
