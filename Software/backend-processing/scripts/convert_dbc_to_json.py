import json
import os
import cantools

def main():
    # Ensure the DBC and JSON directories exist
    os.makedirs('DBC', exist_ok=True)
    os.makedirs('JSON', exist_ok=True)

    # Path to the DBC file
    dbc_path = '../DBC/UCR-01.dbc'  # Correct path to the DBC file

    # Load the DBC file using cantools
    try:
        db = cantools.database.load_file(dbc_path)
    except FileNotFoundError:
        print(f"Error: DBC file '{dbc_path}' not found.")
        return
    except cantools.database.CanDatabaseError as e:
        print(f"Error loading DBC file: {e}")
        return

    # Prepare a list to hold message dictionaries
    messages_list = []

    for message in db.messages:
        message_dict = {
            'name': message.name,
            'frame_id': message.frame_id,
            'is_extended_frame': message.is_extended_frame,
            'length': message.length,
            'signals': []
        }
        for signal in message.signals:
            signal_dict = {
                'name': signal.name,
                'start_bit': signal.start, 
                'length': signal.length,
                'byte_order': 'little_endian' if signal.byte_order == 'little_endian' else 'big_endian',
                'is_signed': signal.is_signed,
                'is_float': signal.is_float,
                'factor': signal.scale,
                'offset': signal.offset,
                'minimum': signal.minimum,
                'maximum': signal.maximum,
                'unit': signal.unit if signal.unit else "",
                'choices': {choice.name: choice.value for choice in signal.choices} if signal.choices else {},
            }
            message_dict['signals'].append(signal_dict)
        messages_list.append(message_dict)

    # Define the output JSON file path
    json_file_path = 'JSON/UCR-01.json'

    # Save the messages to a JSON file
    try:
        with open(json_file_path, 'w') as f:
            json.dump(messages_list, f, indent=4)
        print(f"Successfully converted '{dbc_path}' to '{json_file_path}'.")
    except IOError as e:
        print(f"Error writing to JSON file: {e}")

if __name__ == "__main__":
    main()
