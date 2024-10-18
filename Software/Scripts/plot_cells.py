import matplotlib.pyplot as plt
import re
import os
import mplcursors  


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
                
                if int(cell[4:]) <= 115:  
                    values[cell] = float(value)
        if values:  
            if time_stamp in data:
                data[time_stamp].update(values)  
            else:
                data[time_stamp] = values
    return data


def plot_data(file_path, data):
    plt.figure(figsize=(14, 10))

    for cell_number in range(1, 116):  
        cell_name = f'Cell{cell_number}'
        cell_times = []
        cell_values = []

        
        for time_stamp, values in sorted(data.items()):  
            if cell_name in values:
                cell_times.append(time_stamp)
                cell_values.append(values[cell_name])

        
        line, = plt.plot(cell_times, cell_values, marker='o', label=cell_name)  

        
        mplcursors.cursor(line, hover=True).connect("add", lambda sel, cell_name=cell_name: sel.annotation.set_text(cell_name))

    
    plt.title(f'Cell Voltages Over Time for {os.path.basename(file_path)}')
    plt.xlabel('Time')
    plt.ylabel('Cell Voltage')
    plt.xticks(rotation=45)  
    plt.grid(True)

    
    plt.legend(loc='upper left', bbox_to_anchor=(1, 1), ncol=4, fontsize='small')

    
    plt.tight_layout()
    plt.subplots_adjust(right=0.7)
    
    plt.show()


def process_text_file(text_file_path):
    with open(text_file_path, 'r') as file:
        lines = file.readlines()

    current_file = None
    current_data = []

    for line in lines:
        line = line.strip()
        if line.startswith("Processing file:"):
            
            if current_file and current_data:
                data = parse_input_data(current_data)
                plot_data(current_file, data)

            
            current_file = line.split(": ")[1]  
            current_data = []  
        else:
            
            current_data.append(line)

    
    if current_file and current_data:
        data = parse_input_data(current_data)
        plot_data(current_file, data)


text_file_path = './cell.plot'  


process_text_file(text_file_path)
