# NEXUS Office Suite Makefile

.PHONY: help build up down logs clean install migrate test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

logs: ## Show logs from all services
	docker-compose logs -f

clean: ## Remove all containers, volumes, and images
	docker-compose down -v --rmi all

install: ## Install dependencies for all services
	@echo "Installing API Gateway dependencies..."
	cd backend/api-gateway && npm install
	@echo "Installing Auth Service dependencies..."
	cd backend/auth-service && npm install
	@echo "Installing Notification Service dependencies..."
	cd backend/notification-service && npm install
	@echo "Installing Collaboration Service dependencies..."
	cd backend/collaboration-service && npm install
	@echo "Done!"

migrate: ## Run database migrations
	@echo "Running migrations..."
	docker-compose exec postgres psql -U postgres -d nexus_auth -f /docker-entrypoint-initdb.d/auth-schema.sql
	docker-compose exec postgres psql -U postgres -d nexus_notifications -f /docker-entrypoint-initdb.d/notification-schema.sql
	@echo "Migrations complete!"

status: ## Show status of all services
	docker-compose ps

restart: ## Restart all services
	docker-compose restart

restart-service: ## Restart a specific service (usage: make restart-service SERVICE=api-gateway)
	docker-compose restart $(SERVICE)

logs-service: ## Show logs for a specific service (usage: make logs-service SERVICE=api-gateway)
	docker-compose logs -f $(SERVICE)

shell-service: ## Open shell in a service container (usage: make shell-service SERVICE=api-gateway)
	docker-compose exec $(SERVICE) /bin/sh

db-shell: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U postgres

redis-cli: ## Open Redis CLI
	docker-compose exec redis redis-cli

test: ## Run tests for all services
	@echo "Running tests..."
	cd backend/api-gateway && npm test
	cd backend/auth-service && npm test
	cd backend/notification-service && npm test
	cd backend/collaboration-service && npm test
	@echo "Tests complete!"

dev-api-gateway: ## Run API Gateway in development mode
	cd backend/api-gateway && npm run dev

dev-auth: ## Run Auth Service in development mode
	cd backend/auth-service && npm run dev

dev-notification: ## Run Notification Service in development mode
	cd backend/notification-service && npm run dev

dev-collaboration: ## Run Collaboration Service in development mode
	cd backend/collaboration-service && npm run dev

health: ## Check health of all services
	@echo "Checking service health..."
	@curl -s http://localhost:8000/health/system | jq .
