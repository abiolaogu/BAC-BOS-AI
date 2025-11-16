.PHONY: help build run test clean docker-build docker-run migrate-up migrate-down

# Variables
APP_NAME=writer-service
DOCKER_IMAGE=nexus/writer-service
PORT=8091

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build the application
	@echo "Building $(APP_NAME)..."
	@go build -o bin/$(APP_NAME) ./cmd/main.go

run: ## Run the application
	@echo "Running $(APP_NAME)..."
	@go run ./cmd/main.go

test: ## Run tests
	@echo "Running tests..."
	@go test -v -cover ./...

test-coverage: ## Run tests with coverage
	@echo "Running tests with coverage..."
	@go test -v -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html

clean: ## Clean build artifacts
	@echo "Cleaning..."
	@rm -rf bin/
	@rm -f coverage.out coverage.html

deps: ## Download dependencies
	@echo "Downloading dependencies..."
	@go mod download
	@go mod tidy

lint: ## Run linter
	@echo "Running linter..."
	@golangci-lint run

docker-build: ## Build Docker image
	@echo "Building Docker image..."
	@docker build -t $(DOCKER_IMAGE):latest .

docker-run: ## Run Docker container
	@echo "Running Docker container..."
	@docker run -p $(PORT):$(PORT) --env-file .env $(DOCKER_IMAGE):latest

docker-stop: ## Stop Docker container
	@docker stop $$(docker ps -q --filter ancestor=$(DOCKER_IMAGE):latest)

migrate-up: ## Run database migrations up
	@echo "Running migrations..."
	@psql $(DATABASE_URL) -f ../../database/migrations/001_create_writer_tables.sql

migrate-down: ## Run database migrations down
	@echo "Rolling back migrations..."
	@echo "Implement rollback SQL"

dev: ## Run in development mode with hot reload
	@echo "Starting development server..."
	@air

.DEFAULT_GOAL := help
