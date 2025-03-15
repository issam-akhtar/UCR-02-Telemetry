# Golang version used for the the backend
FROM golang:1.23

# working directory inside the container
WORKDIR /go/src

# Copy go.mod and go.sum to install dependencies
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the backend into the container
COPY . .

# Change working directory to the backend (server) folder
WORKDIR /go/src/cmd/telemetryserver

# Expose the port the backend will use (default port for now)
EXPOSE 8080

# Start the backend
CMD ["go", "run", "main.go"]
