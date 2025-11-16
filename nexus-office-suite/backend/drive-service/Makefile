.PHONY: build run test clean docker-build docker-run

# Build the application
build:
	go build -o bin/drive-service cmd/main.go

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

# Build Docker image
docker-build:
	docker build -t nexus-drive-service:latest .

# Run Docker container
docker-run:
	docker run -p 8093:8093 --env-file .env nexus-drive-service:latest

# Run with docker-compose
compose-up:
	docker-compose up -d

compose-down:
	docker-compose down

# Database migrations (placeholder - add migration tool later)
migrate-up:
	@echo "Running migrations..."
	# Add migration commands here

migrate-down:
	@echo "Rolling back migrations..."
	# Add migration rollback commands here

# Development
dev:
	air

# Format code
fmt:
	go fmt ./...

# Lint code
lint:
	golangci-lint run

# Security check
sec:
	gosec ./...
