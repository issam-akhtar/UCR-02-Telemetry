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

# def check_postgres_status():
#     """Check if PostgreSQL is running."""
#     print("Checking PostgreSQL status...")
#     result = subprocess.run(["pg_isready"], capture_output=True, text=True)
    
#     if result.returncode == 0:
#         print("PostgreSQL is running.")
#         return True
#     else:
#         print("PostgreSQL is not running.")
#         return False

def start_database():
    """Run the shell script to start the database."""
    print("Starting the database...")
    # Run the database script in a new terminal
    run_shell_command(["bash", "../backend-processing/telemetry_database_pi_script.sh"], wait_for_output=False)
    global dbstarted
    dbstarted = True

# def get_database_name():
#     """Retrieve the current database name."""
#     try:
#         print("Retrieving current database name...")
#         result = subprocess.run(
#             ["psql", "-U", "your_db_user", "-d", "your_db_name", "-t", "-c", "SELECT current_database();"],
#             capture_output=True, text=True
#         )
#         db_name = result.stdout.strip()
#         if db_name:
#             print(f" Current database name: {db_name}")
#         else:
#             print(" Could not retrieve the database name.")
#     except FileNotFoundError:
#         print(" psql command not found. Make sure PostgreSQL client tools are installed.")

def build_docker():
    """Build Docker using docker-compose."""
    print(" Building Docker containers...")
    run_shell_command(["docker", "compose", "build"])
    
def rebuild_docker():
    """Rebuild Docker with no cache to ensure new dependencies are installed."""
    print("Rebuilding Docker containers with no cache...\n")

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

def quit_program():
    """Exit"""
    print(" Exiting program...")
    exit()

def main_menu():
    while True:
        print("\n UCalgary Racing Telemetry Menu:")
        #print("1 Check database status")
        print("1. Start database")
        #print("3 Show database name")
        print("2. Build Docker")
        print("3. Rebuild Docker (new dependencies)")
        print("4. Run Docker")
        #print("6 Run Docker in detached mode")
        print("5. View Docker logs")
        print("6. Exit")
        
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
            quit_program()
        else:
            print("Invalid choice, please try again.")

if __name__ == "__main__":
    main_menu()
