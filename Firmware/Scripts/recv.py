#!/usr/bin/env python3
import can


def main():
    # Path to your .blf file
    blf_file = 'output.blf'

    # Open the BLF file with BLFReader
    with can.BLFReader(blf_file) as log_reader:
        for message in log_reader:
            print(message)


if __name__ == '__main__':
    main()
