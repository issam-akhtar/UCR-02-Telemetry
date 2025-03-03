import subprocess

def run_shell_command(command):
    """Run a shell command and print the output."""
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        print(result.stdout)
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
    run_shell_command(["bash", "../backend-processing/telemetry_database_pi_script.sh"])

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

def run_docker(detached=False):
    """Run Docker using docker-compose, ensuring the database is running first."""
    if not check_postgres_status():
        start_database()
    
    print(" Starting Docker containers...")
    command = ["docker", "compose", "up"]
    if detached:
        command.append("-d")
    run_shell_command(command)

# def view_docker_logs():
#     """View logs for a selected service."""
#     service = input("Which service logs do you want to view? (frontend/backend): ").strip().lower()
#     if service in ["frontend", "backend"]:
#         print(f" Viewing logs for {service}...")
#         run_shell_command(["docker", "compose", "logs", service])
#     else:
#         print(" Invalid service selection.")

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
        print("3. Run Docker")
        #print("6 Run Docker in detached mode")
        #print("7 View Docker logs")
        print("4. Exit")
        
        choice = input("Enter your choice: ").strip()
        
        if choice == "1":
            start_database()
        elif choice == "2":
            build_docker()
        elif choice == "3":
            run_docker()
        elif choice == "4":
            quit_program()
        else:
            print("Invalid choice, please try again.")

if __name__ == "__main__":
    main_menu()
