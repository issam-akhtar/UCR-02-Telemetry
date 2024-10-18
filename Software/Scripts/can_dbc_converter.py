import cantools
import csv
import os
import shutil

col = -2
cells = True


class CanFrame:
    def __init__(self, timestamp, channel, can_id, flags, dlc, data) -> None:
        self.timestamp = timestamp
        self.channel = channel
        self.can_id = can_id
        self.flags = flags
        self.dlc = dlc
        self.data = data  # each element is one byte

    def __str__(self) -> str:
        return f"""
            Timestamp: {self.timestamp}
            Channel: {self.channel}
            CAN ID: {self.can_id}
            Flags: {self.flags}
            DLC: {self.dlc}
            Data: {self.data}
        """


def sort_key(header):
    if header.startswith("Cell") and header[4:].isdigit():
        return (0, int(header[4:]))  # Sort numerically for Cell#
    else:
        return (1, header)  # Sort alphabetically for others


# csv_folder = "./09-30"
if cells:
    csv_folder = "./Long_Run"
    dir_name = "cell_data"
    dbc_path = "./UCR-01.dbc"
else:
    csv_folder = input("Enter Directory Path with Kvaser Logs: ")
    dir_name = input("Enter Directory Name you would like to store logs at: ")
    dbc_path = "./UCR-01.dbc"

cell_ids = range(50, 58)

db = cantools.database.load_file(dbc_path)

for filename in os.listdir(csv_folder):
    if filename.endswith(".csv"):
        csv_path = os.path.join(csv_folder, filename)
        print(f"Processing file: {csv_path}")

        if not os.path.exists(f"./Decoded_Logs/{dir_name}"):
            os.makedirs(f"./Decoded_Logs/{dir_name}")
        output_csv_path = os.path.join(
            f"./Decoded_Logs/{dir_name}", f"decoded_{filename}"
        )

        with open(output_csv_path, mode="w", newline="") as output_csv_file:
            csv_writer = csv.writer(output_csv_file)

            header_set = set()

            with open(csv_path, newline="") as csv_file:
                can_data = csv.reader(csv_file)
                for i, row in enumerate(can_data):
                    if i >= 8:
                        row = [item for item in row if item != ""]
                        try:
                            data = bytes([(int(i, 16)) for i in row[5:col]])
                        except Exception as e:
                            print(f"Error converting data: {e}")
                            continue
                        can_id = int(row[2])

                        if can_id:
                            try:
                                frame = CanFrame(
                                    row[0], row[1], can_id, row[3], row[4], data
                                )
                                msg = db.decode_message(can_id, data)
                                if cells and can_id in cell_ids:
                                    # Start with the timestamp
                                    output = f"{frame.timestamp},"

                                    output += "".join(
                                        f"{cell} {{{value}}},"
                                        for cell, value in msg.items()
                                    )

                                    # Print the final output, removing the trailing comma
                                    print(output.rstrip(","))
                                else:
                                    header_set.update(msg.keys())

                            except Exception as e:
                                continue
                            except IndexError as e:
                                continue

            if not cells:

                sorted_headers = sorted(header_set, key=sort_key)

                header_row = [
                    "Timestamp",
                    "Channel",
                    "CAN ID",
                    "Flags",
                    "DLC",
                ] + sorted_headers
                csv_writer.writerow(header_row)

                with open(csv_path, newline="") as csv_file:
                    can_data = csv.reader(csv_file)
                    for i, row in enumerate(can_data):
                        if i >= 8:
                            row = [item for item in row if item != ""]
                            try:
                                data = bytes([(int(i, 16)) for i in row[5:col]])
                            except Exception as e:
                                print(f"Error converting data: {e}")
                                continue
                            can_id = int(row[2])

                            if can_id:
                                try:
                                    frame = CanFrame(
                                        row[0], row[1], can_id, row[3], row[4], data
                                    )
                                    msg = db.decode_message(can_id, data)

                                    row_data = [
                                        frame.timestamp,
                                        frame.channel,
                                        frame.can_id,
                                        frame.flags,
                                        frame.dlc,
                                    ]

                                    row_data += [
                                        msg.get(key, "") for key in sorted_headers
                                    ]
                                    csv_writer.writerow(row_data)

                                except Exception as e:
                                    continue
                                except IndexError as e:
                                    continue
    if not cells:
        print(f"Decoded data has been exported to {output_csv_path}")
    else:
        shutil.rmtree(f"./Decoded_Logs/{dir_name}")
