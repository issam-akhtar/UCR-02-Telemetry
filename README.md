# UCR-02-Telemetry

# For devs:
When developing a new feature, make a branch titled: Feature_Name_Name
For example: CAN_Transciever_Drivers_Issam

Always update and add documentation to the Notion to explain design decisions or any difficult to understand things

Optimally we want to have what are essentially mini tutorials for each component on the project so anyone can learn and understand

We need to start setting up and making a dev enviroment that can be easily installed/created. Docker container for website and dev env.
CMake build system


# Telemetry Backend System Setup Guide

This project consists of several components that work together to send, store, and process telemetry data. The system is split across multiple devices:

- **Raspberry Pi 5:** Runs the **database**, **backend**, **receiver**, and **frontend** components.
- **Your Computer:** Runs the **sender** (CSV simulator) and a local backend script.

Before you begin, ensure that:
- The configuration file (`configs/config.yaml`) has been updated with the correct settings (database connection, WebSocket URL, ports, mode, etc.).
- The test data file (`data.csv`) is located in the `testdata` folder at `/Capstone/UCR-02-Telemetry-Mine-Current/Software/backend-processing/testdata`.

---

## Component Overview and File Locations

- **Database (on Pi 5):**  
  Script: `/Capstone/UCR-02-Telemetry-Mine-Current/Software/backend-processing/telemetry_database_pi_script.sh`

- **Backend Setup (on Pi 5):**  
  Script: `/Capstone/UCR-02-Telemetry-Mine-Current/Software/backend-processing/telemetry_backend_pi_script.sh`

- **Receiver (Telemetry Server) (on Pi 5):**  
  Source: `/Capstone/UCR-02-Telemetry-Mine-Current/Software/backend-processing/cmd/telemetryserver/main.go`  
  Command:  
  ```bash
  go run main.go
  ```

- **Sender (CSV Simulator) (on Your Computer):**  
  Source: `/Capstone/UCR-02-Telemetry-Mine-Current/Software/backend-processing/cmd/csvserver/simulate_sender.go`  
  Command:  
  ```bash
  go run simulate_sender.go
  ```

- **Frontend (Web Dashboard) (on Pi 5):**  
  Script: `/Capstone/UCR-02-Telemetry-Mine-Current/Software/telemetry-app/telemetry_frontend_pi_script.sh`

---

## Setup and Execution Steps

### 1. Preparation and Configuration

- **Update the Configuration File:**  
  Open `configs/config.yaml` and verify that all settings are correct. For example:

  ```yaml
  database:
    connection_string: "postgres://postgres:H1a2m3z4a5%402003@localhost:5432/telem_db?sslmode=disable"

  websocket:
    # Used by the car (sender) to send raw telemetry data to the receiver.
    url: "ws://205.206.236.222:9091/telemetry"
    ip: "205.206.236.222"
    port: 9091

  mode: "csv"             # Allowed values: "csv" or "live"
  apiport: "9092"         # REST API server port

  dbc_file: "../../configs/UCR-01.dbc"
  json_file: "../../configs/UCR-01.json"

  throttler_interval: 0   # in milliseconds

  # Port for the live data WebSocket (from backend to frontend)
  live_ws_port: 9094
  ```

- **Test Data:**  
  Ensure that `data.csv` is located in the directory:  
  `/Capstone/UCR-02-Telemetry-Mine-Current/Software/backend-processing/testdata`

---

### 2. On the Raspberry Pi 5

1. **Set Up the Database:**  
   Run the database setup script:
   ```bash
   sudo ./Capstone/UCR-02-Telemetry-Mine-Current/Software/backend-processing/telemetry_database_pi_script.sh
   ```

2. **Set Up the Backend Environment:**  
   Run the backend setup script:
   ```bash
   sudo ./Capstone/UCR-02-Telemetry-Mine-Current/Software/backend-processing/telemetry_backend_pi_script.sh
   ```

3. **Start the Receiver:**  
   Navigate to the receiver source directory:
   ```bash
   cd /Capstone/UCR-02-Telemetry-Mine-Current/Software/backend-processing/cmd/telemetryserver
   ```
   Then start the receiver:
   ```bash
   go run main.go
   ```

4. **Start the Frontend (Web Dashboard):**  
   Run the frontend script to launch the dashboard:
   ```bash
   sudo ./Capstone/UCR-02-Telemetry-Mine-Current/Software/telemetry-app/telemetry_frontend_pi_script.sh
   ```
   Open a web browser and navigate to the public IP and port (as configured in your Vite project) to view the dashboard.

---

### 3. On Your Computer

1. **Start the Sender (CSV Simulator):**  
   Navigate to the sender directory:
   ```bash
   cd /Capstone/UCR-02-Telemetry-Mine-Current/Software/backend-processing/cmd/csvserver
   ```
   Then start the sender:
   ```bash
   go run simulate_sender.go
   ```

---

## Final Checklist

- **Configuration:**  
  Ensure `configs/config.yaml` has accurate settings (database connection string, WebSocket URL, ports, mode, etc.).

- **Test Data:**  
  Verify that `data.csv` exists in the `testdata` folder at `/Capstone/UCR-02-Telemetry-Mine-Current/Software/backend-processing/testdata`.

- **Component Roles:**  
  - **Raspberry Pi 5:** Runs the **database**, **backend**, **receiver**, and **frontend**.
  - **Your Computer:** Runs the **sender** (and optionally, a local backend script).

- **Dependencies:**  
  The setup scripts install all required dependencies, including Go 1.24.0, yq, and PostgreSQL client utilities. The system-wide PATH is updated via `/etc/profile`, so you may need to re-login or run `source ~/.profile` after setup.
