.PHONY: help build run test clean docker-build docker-run

# Variables
APP_NAME=vas
VERSION?=1.0.0
DOCKER_IMAGE=nexus/$(APP_NAME):$(VERSION)
GO_FILES=$(shell find . -name '*.go' -not -path "./vendor/*")

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build the application
	@echo "Building $(APP_NAME)..."
	@go build -o bin/$(APP_NAME) ./cmd/server

run: ## Run the application
	@echo "Running $(APP_NAME)..."
	@go run ./cmd/server/main.go

test: ## Run tests
	@echo "Running tests..."
	@go test -v -race -coverprofile=coverage.txt -covermode=atomic ./...

test-coverage: test ## Run tests with coverage report
	@go tool cover -html=coverage.txt -o coverage.html
	@echo "Coverage report generated: coverage.html"

lint: ## Run linter
	@echo "Running linter..."
	@golangci-lint run ./...

fmt: ## Format code
	@echo "Formatting code..."
	@go fmt ./...
	@goimports -w $(GO_FILES)

vet: ## Run go vet
	@echo "Running go vet..."
	@go vet ./...

clean: ## Clean build artifacts
	@echo "Cleaning..."
	@rm -rf bin/
	@rm -rf coverage.txt coverage.html
	@go clean

docker-build: ## Build Docker image
	@echo "Building Docker image $(DOCKER_IMAGE)..."
	@docker build -t $(DOCKER_IMAGE) .
	@docker tag $(DOCKER_IMAGE) nexus/$(APP_NAME):latest

docker-run: ## Run Docker container
	@echo "Running Docker container..."
	@docker run -d \
		--name $(APP_NAME) \
		-p 8200:8200 \
		--env-file .env \
		$(DOCKER_IMAGE)

docker-stop: ## Stop Docker container
	@docker stop $(APP_NAME)
	@docker rm $(APP_NAME)

docker-logs: ## Show Docker logs
	@docker logs -f $(APP_NAME)

bench: ## Run benchmarks
	@echo "Running benchmarks..."
	@go test -bench=. -benchmem ./...

deps: ## Download dependencies
	@echo "Downloading dependencies..."
	@go mod download
	@go mod tidy

migrate-up: ## Run database migrations up
	@echo "Running migrations up..."
	@migrate -path ./migrations -database "$(DATABASE_URL)" up

migrate-down: ## Run database migrations down
	@echo "Running migrations down..."
	@migrate -path ./migrations -database "$(DATABASE_URL)" down

migrate-create: ## Create new migration (use: make migrate-create NAME=migration_name)
	@migrate create -ext sql -dir ./migrations -seq $(NAME)

install-tools: ## Install development tools
	@echo "Installing development tools..."
	@go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	@go install golang.org/x/tools/cmd/goimports@latest
	@go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest

all: clean fmt vet lint test build ## Run all checks and build

.DEFAULT_GOAL := help
