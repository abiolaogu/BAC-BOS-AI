.PHONY: help install dev build start test lint format clean docker-build docker-run docker-stop

# Variables
APP_NAME=idaas
VERSION?=1.0.0
DOCKER_IMAGE=nexus/$(APP_NAME):$(VERSION)

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\\033[36m%-20s\\033[0m %s\\n", $$1, $$2}'

install: ## Install dependencies
	@echo "📦 Installing dependencies..."
	@npm install

dev: ## Run in development mode
	@echo "🚀 Starting development server..."
	@npm run dev

build: ## Build TypeScript
	@echo "🔨 Building application..."
	@npm run build

start: build ## Run in production mode
	@echo "🚀 Starting production server..."
	@npm start

test: ## Run tests
	@echo "🧪 Running tests..."
	@npm test

test-watch: ## Run tests in watch mode
	@echo "🧪 Running tests in watch mode..."
	@npm run test:watch

lint: ## Run linter
	@echo "🔍 Running linter..."
	@npm run lint

format: ## Format code
	@echo "✨ Formatting code..."
	@npm run format

clean: ## Clean build artifacts
	@echo "🧹 Cleaning..."
	@rm -rf dist/
	@rm -rf node_modules/
	@rm -rf logs/
	@rm -rf coverage/

# Docker commands
docker-build: ## Build Docker image
	@echo "🐳 Building Docker image..."
	@docker build -t $(DOCKER_IMAGE) .
	@docker tag $(DOCKER_IMAGE) nexus/$(APP_NAME):latest

docker-run: ## Run Docker container
	@echo "🐳 Running Docker container..."
	@docker-compose up -d

docker-stop: ## Stop Docker container
	@echo "🛑 Stopping Docker container..."
	@docker-compose down

docker-logs: ## Show Docker logs
	@docker-compose logs -f idaas

docker-shell: ## Open shell in container
	@docker exec -it idaas-app sh

# Database commands
db-init: ## Initialize database
	@echo "🗄️ Initializing database..."
	@docker-compose exec postgres psql -U nexus -d idaas -f /docker-entrypoint-initdb.d/01-schema.sql

db-reset: ## Reset database
	@echo "🗄️ Resetting database..."
	@docker-compose exec postgres psql -U nexus -d idaas -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@$(MAKE) db-init

db-shell: ## Open database shell
	@docker-compose exec postgres psql -U nexus -d idaas

# Redis commands
redis-cli: ## Open Redis CLI
	@docker-compose exec redis redis-cli -a nexus_password

redis-flush: ## Flush Redis cache
	@docker-compose exec redis redis-cli -a nexus_password FLUSHDB

# Development helpers
logs: ## Show application logs
	@tail -f logs/*.log

setup: ## Initial setup (install + env file)
	@echo "🔧 Setting up IDaaS..."
	@cp .env.example .env
	@npm install
	@echo "✅ Setup complete! Edit .env file and run 'make docker-run'"

all: clean install lint test build ## Run all checks and build

.DEFAULT_GOAL := help
