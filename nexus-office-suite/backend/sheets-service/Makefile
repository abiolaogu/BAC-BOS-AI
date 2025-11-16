.PHONY: build run test clean docker-build docker-run

# Build the application
build:
	go build -o bin/sheets-service cmd/main.go

# Run the application
run:
	go run cmd/main.go

# Run tests
test:
	go test -v ./...

# Clean build artifacts
clean:
	rm -rf bin/

# Install dependencies
deps:
	go mod download
	go mod tidy

# Run with hot reload (requires air)
dev:
	air

# Build Docker image
docker-build:
	docker build -t nexus-sheets-service:latest .

# Run Docker container
docker-run:
	docker run -p 8092:8092 --env-file .env nexus-sheets-service:latest

# Format code
fmt:
	go fmt ./...

# Lint code
lint:
	golangci-lint run

# Generate code (if needed)
generate:
	go generate ./...
