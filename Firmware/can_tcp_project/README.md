# _Sample project_

(See the README.md file in the upper level 'examples' directory for more information about examples.)

This is the simplest buildable example. The example is used by command `idf.py create-project`
that copies the project to user specified path and set it's name. For more information follow the [docs page](https://docs.espressif.com/projects/esp-idf/en/latest/api-guides/build-system.html#start-a-new-project)



## How to use example
We encourage the users to use the example as a template for the new projects.
A recommended way is to follow the instructions on a [docs page](https://docs.espressif.com/projects/esp-idf/en/latest/api-guides/build-system.html#start-a-new-project).

## Example folder contents

The project **sample_project** contains one source file in C language [main.c](main/main.c). The file is located in folder [main](main).

ESP-IDF projects are built using CMake. The project build configuration is contained in `CMakeLists.txt`
files that provide set of directives and instructions describing the project's source files and targets
(executable, library, or both). 

Below is short explanation of remaining files in the project folder.

```
├── CMakeLists.txt
├── main
│   ├── CMakeLists.txt
│   └── can_tcp.c
└── README.md                  This is the file you are currently reading
```
Additionally, the sample project contains Makefile and component.mk files, used for the legacy Make based build system. 
They are not used or needed when building with CMake and idf.py.


```markdown
# **ESP32 CAN-to-TCP Telemetry System**

This project configures an **ESP32** to receive **CAN bus messages** and transmit them over **WiFi using TCP**. The ESP32 connects to a specified **TCP server** and forwards real-time CAN data for remote monitoring.

---

## **1. Hardware Requirements**
- **ESP32 Development Board**
- **CAN Transceiver Module** (e.g., **SN65HVD230** or **MCP2551**)
- **120Ω Termination Resistors** (if required for the CAN bus setup)
- **PC or Another ESP32 as TCP Server**

### **Pin Connections**
| ESP32 Pin | CAN Transceiver Pin | CAN Bus |
|-----------|--------------------|---------|
| GPIO21    | TX (CANTX)         | CAN_H  |
| GPIO22    | RX (CANRX)         | CAN_L  |
| GND       | GND                | GND    |
| 3.3V      | VCC                | -      |

---

## **2. Software Requirements**
- **ESP-IDF Installed** ([Installation Guide](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/index.html))
- **Python 3** (For ESP-IDF tools)
- **Linux/Mac/Windows with Terminal Access**

---

## **3. Configuration & Setup**

### **Step 1: Clone the Project**
```sh
cd ~/esp
idf.py create-project can_tcp_project
cd can_tcp_project
```

### **Step 2: Edit WiFi and Server Configuration**
Modify the `main/can_tcp.c` file and update these values:
```c
#define WIFI_SSID "your_wifi_ssid"
#define WIFI_PASS "your_wifi_password"
#define SERVER_IP "192.168.1.100"  // Change to your server's IP
#define SERVER_PORT 5000
```

### **Step 3: Configure ESP32 using Menuconfig**
Run:
```sh
idf.py menuconfig
```
In **Menuconfig**, ensure:
- WiFi credentials are set.
- GPIO pins for CAN are correctly assigned.

### **Step 4: Build and Flash the Firmware**
```sh
idf.py build flash monitor
```
This command compiles the project, flashes it to the ESP32, and starts monitoring logs.

---

## **4. Running the TCP Server**
To receive CAN data, start a TCP server on your PC (Linux/Mac):
```sh
nc -l 5000
```
On Windows, you can use **PuTTY** in raw mode to listen on port **5000**.

---

## **5. Expected Output**
Once the ESP32 connects to WiFi and the CAN bus, you should see logs like:
```log
I (1000) CAN_TCP: Connected to WiFi!
I (2000) CAN_TCP: Connected to TCP Server
I (3000) CAN_TCP: Received CAN ID: 123, Data: 01 02 03 04 05 06 07 08
```
On the TCP server side, the CAN data should be displayed as raw bytes.

---

## **6. Troubleshooting**
### **ESP32 Not Connecting to WiFi?**
- Check if WiFi SSID and password are correctly set.
- Ensure your router is within range.
- Restart the ESP32 and retry.

### **No CAN Data Being Transmitted?**
- Check if the CAN transceiver is correctly connected.
- Ensure CAN_H and CAN_L are properly wired.
- Verify if the CAN bus has termination resistors (120Ω).

### **TCP Server Not Receiving Data?**
- Verify the ESP32 is connected to WiFi (`ping` the ESP32 IP from the PC).
- Ensure the TCP server is listening on the correct port (`5000`).
- Restart the ESP32 and reattempt the connection.

---


