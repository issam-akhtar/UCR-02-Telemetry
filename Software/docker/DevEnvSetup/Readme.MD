# Frontend Development Environment Setup

## Required
1. Download and Install [Docker](https://docs.docker.com/get-docker/).
2. Download and Install [Docker Compose](https://docs.docker.com/compose/install/).
3. Download and Install [Visual Studio Code](https://code.visualstudio.com/download)
4. Download and Install [pgAdmin](https://www.pgadmin.org/download/)

## Clone the Repository
git clone https://github.com/issam-akhtar/UCR-02-Telemetry.git

## Run the docker
change directories to the DevEnvSetup folder and Type "docker-compose up --build" in the cmd/terminal

## How to access
- **Frontend (React + Vite):** [http://localhost:5173](http://localhost:5173)  
- **Backend (Go API):** [http://localhost:8080](http://localhost:8080)  
- **Database (PostgreSQL via pgAdmin):**
  - **Host:** `db`
  - **Port:** `5432`
  - **User:** `postgres`
  - **Password:** `password`
  - **Database:** `triggerstestdb`

---

### **2. VSCode Extensions**
We'll list here any extensions that were important for front end development.

#### **Extensions**
- **UI Development**:
  - [Vite](https://marketplace.visualstudio.com/items?itemName=antfu.vite): Vite-specific support.

- **Backend Development**:
  - [Go](https://marketplace.visualstudio.com/items?itemName=golang.Go): Debugging for Go.
  - [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client): Testing API endpoints.

- **General**:
  - [Docker](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker): Manage containers from within VSCode.
  - [GitLens](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens): Enhanced Git functionalities.

---

### **3. Environment Variables (`.env` File)**
`.env` file with placeholders for sensitive data relating to the db, ports, endpoints,etc.

---

### 🛠️ **4. Troubleshooting**

- **Docker Issues:**
  - Try rebuilding: `docker-compose down && docker-compose up --build`
  - Check logs: `docker-compose logs <service_name>`

- **Database Connection Errors:**
  - Confirm PostgreSQL service is running: `docker ps`
  - Verify `.env` credentials match the database (your pgAdmin setup)

- **Port Conflicts:**
  - Ensure ports `5173`, `8080`, and `5432` are not in use by other programs on the Raspberry Pi.
