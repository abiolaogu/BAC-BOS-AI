.PHONY: build run test clean docker-build docker-run

build:
	go build -o bin/slides-service cmd/main.go

run:
	go run cmd/main.go

test:
	go test -v ./...

clean:
	rm -rf bin/

deps:
	go mod download
	go mod tidy

docker-build:
	docker build -t nexus-slides-service:latest .

docker-run:
	docker run -p 8094:8094 --env-file .env nexus-slides-service:latest

dev:
	air

fmt:
	go fmt ./...

lint:
	golangci-lint run

sec:
	gosec ./...
