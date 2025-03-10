# Frontend Development Environment Setup

This guide will help you set up and run the development environment for the UCR-02 Telemetry's backend and website.

---

## Required
1. [Docker v28](https://docs.docker.com/get-docker/).
2. [Docker Compose v2.33](https://docs.docker.com/compose/install/).
3. [Visual Studio Code](https://code.visualstudio.com/download)

---

## **Setup Instructions**

### **1. Clone the Repository**

'git clone https://github.com/issam-akhtar/UCR-02-Telemetry.git'

### **2. Run the Docker Environment**

1. Open a terminal and navigate to the `UCR-02-Telemetry/Software/DevEnvSetup` directory.  

2. Run the interaction menu in the terminal (in sudo):  
   `sudo python3 interaction-menu.py` 

3. Use the menu to:
   - **Start the Database**: Initialize and start the PostgreSQL database.
   - **Build Docker**: Build the Docker images for the frontend and backend.
   - **Rebuild Docker (No Cache)**: Force a clean rebuild of Docker images (use this when new dependancies are added or list of dependencies is updated).
   - **Run Docker**: Start the Docker containers.
   - **View Docker Logs**: Check logs for the frontend or backend docker services.

---

## **3. Access the Services**

- **Frontend (React + Vite)**: [http://localhost:9093](http://localhost:9093)
- **Backend (Go API)**: [http://localhost:9091](http://localhost:9091)

---

## **Development Tools (VSCode Extensions)**

Install the following extensions in Visual Studio Code for consistent development:

### **Frontend Development**
- [Vite](https://marketplace.visualstudio.com/items?itemName=antfu.vite): Vite-specific support.
- [ESLint (optional)](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint): JavaScript/TypeScript linting.
- [Prettier (optional)](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode): Code formatting.

### **Backend Development**
- [Go](https://marketplace.visualstudio.com/items?itemName=golang.Go): Go language support & Debugging.
- [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client): Testing API endpoints directly in VSCode.

### **General**
- [Docker](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker): Manage Docker containers from VSCode.
- [GitLens](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens): Enhanced Git functionalities.

---

## **3. Environment Variables (`.env` File)**
The project uses a `.env` file to store sensitive data such as database credentials, ports, and API endpoints. Ensure the `.env` file is properly updated before running the Docker containers.

---

## 🛠️ **4. Troubleshooting**

### **Common Issues**

1. **Docker Issues**:
   - Check Docker logs for errors:  
     "View Docker logs" option in the interaction menu
   - Rebuild Docker images with no cache if dependencies are not updating:  
     "Rebuild Docker (new dependencies)" option in the interaction menu

2. **Database Connection Errors**:
   - Ensure the PostgreSQL database is running before starting Docker:
     Run the interaction menu, choose "Start Database" option, if there's an instance of the database running enter 'Y'
   - Verify that the credentials in the `.env` file match the database configuration.

3. **Port Conflicts**:
   - Ensure ports `9091`, `9092`, and `9093` are not in use by any other programs/services on the pi.

4. **Missing Dependencies**:
   - If new dependencies are added to `package.json` or `package-lock.json` , rebuild Docker with no cache:  
     "Rebuild Docker (new dependencies)" option in the interaction menu

---

## **Additional Documentation**

If you need more explanation about how the software component of the telemetry system is structured, make sure to check the Notion.

---