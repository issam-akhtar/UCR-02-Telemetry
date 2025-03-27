import socket
import struct

# Configuration
LISTEN_IP = '0.0.0.0'     # Listen on all interfaces
LISTEN_PORT = 5000        # Must match the port you forwarded to this computer

def start_server():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_sock:
        server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_sock.bind((LISTEN_IP, LISTEN_PORT))
        server_sock.listen(1)
        print(f"Listening for ESP32 CAN messages on port {LISTEN_PORT}...")

        conn, addr = server_sock.accept()
        print(f"Connected by {addr}")

        try:
            while True:
                # First receive 5 bytes: 4 for ID, 1 for DLC
                header = conn.recv(5)
                if not header or len(header) < 5:
                    print("Connection closed or incomplete header.")
                    break

                can_id = struct.unpack(">I", header[:4])[0]  # Big endian 4-byte ID
                dlc = header[4]

                # Now receive the data bytes
                data = conn.recv(dlc)
                if len(data) < dlc:
                    print("Incomplete data received.")
                    break

                # Print the received CAN message
                data_str = ' '.join(f"{b:02X}" for b in data)
                print(f"Received CAN message: ID=0x{can_id:03X}, DLC={dlc}, Data=[{data_str}]")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            conn.close()
            print("Connection closed.")

if __name__ == "__main__":
    start_server()
