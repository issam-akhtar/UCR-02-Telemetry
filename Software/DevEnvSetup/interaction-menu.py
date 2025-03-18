import subprocess
import time

dbstarted = False

def run_shell_command(command, wait_for_output=True):
    """Run a shell command and print the output, or run in the background if needed."""
    try:
        if wait_for_output:
            result = subprocess.run(command, capture_output=True, text=True, check=True)
            print(result.stdout)
        else:
            # Run command without blocking (for commands that open terminals or similar)
            command_str = " ".join(command) if isinstance(command, list) else command
            subprocess.Popen(["lxterminal", "-e", command_str])
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")

def start_database():
    """Run the shell script to start the database."""
    print("Starting the database...")
    # Run the database script in a new terminal
    run_shell_command(["bash", "../backend-processing/telemetry_database_pi_script.sh"], wait_for_output=False)
    global dbstarted
    dbstarted = True

def local_backend_script():
    """Run the shell script to download Go, and dependencies locally."""
    print("Starting the local backend script...\n")
    # Run the backend script in a new terminal
    run_shell_command(["bash", "../backend-processing/telemetry_backend_pi_script.sh"], wait_for_output=False)
    global dbstarted
    dbstarted = True

def local_frontend_script():
    """Run the shell script to download react, npm, and dependencies locally."""
    print("Starting the local frontend script...\n")
    # Run the backend script in a new terminal
    run_shell_command(["bash", "./frontend_dependency_script.sh"], wait_for_output=False)
    global dbstarted
    dbstarted = True

def build_docker():
    """Build Docker using docker-compose."""
    print(" Building Docker containers...")
    run_shell_command(["docker", "compose", "build"])
    
def rebuild_docker():
    """Rebuild Docker with no cache to ensure new dependencies are installed."""
    print("\nWARNING: This operation will delete ALL Docker images on your system. This cannot be undone.\n")")

    confirm = input("Are you sure you want to proceed? (yes/no): ").strip().lower()
    if confirm != "yes":
        print("Rebuild canceled. No changes were made.\n")
        return

    print("\nRebuilding Docker containers with no cache...\n")

    print("\n--Stopping and removing Docker containers...")
    run_shell_command(["docker", "compose", "down"])

    print("--Removing existing Docker images...")
    # Get the list of images
    images = subprocess.run(
        ["docker", "images", "-q"],
        capture_output=True, text=True
    ).stdout.splitlines()

    # Remove each image
    for image in images:
        if image.strip(): 
            run_shell_command(["docker", "rmi", "-f", image.strip()])

    print("--Old images removed. Rebuilding Docker containers with no cache...\n")
    run_shell_command(["docker", "compose", "build", "--no-cache"])

def run_docker(detached=False):
    """Run Docker using docker-compose, ensuring the database is running first."""
    if not dbstarted:
        start_database()
        print("10 seconds for the database to start...")
        time.sleep(10)
    
    print("Starting Docker containers...")
    command = ["docker", "compose", "up"]
    if detached:
        command.append("-d")
    run_shell_command(command, wait_for_output=False)

def view_docker_logs():
    """View logs for a selected service."""
    services = {"1": "frontend", "2": "backend", "3": "return"}

    while True:
        print("\nSelect a service to view logs:")
        print("1. Frontend")
        print("2. Backend")
        print("3. Return to main menu")

        choice = input("Enter the number of your choice: ").strip()

        if choice in services:
            if choice == "3":
                print("Returning to main menu...")
                return  # Exit
            service = services[choice]
            print("\n")
            print('/' * 80)
            print('/' * 80)
            print(f"Viewing logs for {service}...")
            run_shell_command(["docker", "compose", "logs", service])
            print('/' * 80)
            print('/' * 80)
            print("\n\n")
            return  # Exit
        else:
            print("Invalid selection. Please enter 1, 2, or 3.")

def simulate_csv():
    """Simulate a car run using a CSV file."""
    print("\nSimulating a car run requires a CSV file and it has to be called 'data.csv' (case sensitive).")
    print("\nMake sure that you had run step 6 first to install Go and all backend dependencies.")
    while True:
        choice = input("Do you have the backend dependencies installed and want to proceed with the simulation? (yes/no): ").strip().lower()
        if choice == "no":
            print("Returning to main menu...")
            return
        elif choice == "yes":
            break
        else:
            print("Invalid input. Please enter 'yes' or 'no'.")
    
    print("\nBefore proceeding, rename your CSV file to 'data.csv' and place it in:")
    print("./Software/backend-processing/testdata/")
    print("\nIf there exists a csv file in the directory and you need to keep it, move it elsewhere first or rename it.\n")
    
    while True:
        confirm = input("Have you renamed your csv and placed it correctly? (yes/no/cancel): ").strip().lower()
        if confirm == "yes":
            break
        elif confirm == "no":
            print("Please rename and place the file before proceeding.")
        elif confirm == "cancel":
            print("Simulator function canceled. Returning to main menu...")
            return
        else:
            print("Invalid input. Please enter 'yes' or 'no'.")
    
    print("\nStarting simulation...\n")
    run_shell_command(["go","run","../backend-processing/simulate_sender.go"], wait_for_output=False)
    print("Simulation started. Check logs for progress.\n")


def quit_program():
    """Exit"""
    print(" Exiting program...")
    exit()

def main_menu():
    while True:
        print("\n UCalgary Racing Telemetry Menu:")
        print("1. Start database")
        print("2. Build Docker")
        print("3. Rebuild Docker (new dependencies)")
        print("4. Run Docker")
        print("5. View Docker logs")
        print("6. Download Go, postgres utils (pg_isready), yq, and backend dependencies locally")
        print("7. Download React, npm, and frontend dependencies locally")
        print("8. Simulate Run using CSV file")
        print("9. Exit")
        
        choice = input("Enter your choice: ").strip()
        
        if choice == "1":
            start_database()
        elif choice == "2":
            build_docker()
        elif choice == "3":
            rebuild_docker()
        elif choice == "4":
            run_docker()
        elif choice == "5":
            view_docker_logs()
        elif choice == "6":
            local_backend_script()
        elif choice == "7":
            local_frontend_script()
        elif choice == "8":
            simulate_csv()
        elif choice == "9":
            quit_program()
        else:
            print("Invalid choice, please try again.")

if __name__ == "__main__":
    main_menu()
