import subprocess

def run_shell_command(command):
    """Run a shell command and print the output."""
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")

def check_postgres_status():
    """Check if PostgreSQL is running."""
    print("Checking PostgreSQL status...")
    result = subprocess.run(["pg_isready", "-q"], capture_output=True)
    if result.returncode == 0:
        print("PostgreSQL is running.")
    else:
        print("PostgreSQL is not running.")
        start_database()

def start_database():
    """Run the shell script to start the database."""
    print("Starting the database...")
    run_shell_command(["../backend-processing/telemetry_database_pi_script.sh"])

def build_docker():
    """Build Docker using docker-compose."""
    print("Building Docker containers...")
    run_shell_command(["docker compose", "build"])

def run_docker(detached=False):
    """Run Docker using docker-compose, ensuring the database is running first."""
    check_postgres_status()
    print("Starting Docker containers...")
    command = ["docker compose", "up"]
    if detached:
        command.append("-d")
    run_shell_command(command)

def view_docker_logs():
    """View logs for a selected service."""
    service = input("Which service logs do you want to view? (frontend/backend): ").strip().lower()
    if service in ["frontend", "backend"]:
        print(f"Viewing logs for {service}...")
        run_shell_command(["docker compose", "logs", service])
    else:
        print("Invalid service selection.")

def quit_program():
    """Exit"""
    print("Exiting program...")
    exit()

def main_menu():
    while True:
        print("\n UCalgary Racing Telemetry Menu:")
        print("1. Check database status")
        print("2. Start database")
        print("3. PostgreSQL commands")
        print("4. Build and run Docker")
        print("5. Run Docker in detached mode")
        print("6. View Docker logs")
        print("7. Exit")
        choice = input("Enter your choice: ")
        
        if choice == "1":
            check_database_status()
        elif choice == "2":
            start_database()
        elif choice == "3":
            show_postgres_info()
        elif choice == "4":
            build_and_run_docker()
        elif choice == "5":
            build_and_run_docker(detached=True)
        elif choice == "6":
            view_docker_logs()
        elif choice == "7":
            quit_program()
        else:
            print("Invalid choice, please try again.")

if __name__ == "__main__":
    main_menu()






