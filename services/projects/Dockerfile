FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod ./
# COPY go.sum ./
RUN go mod download

COPY . .
RUN go build -o projects-service ./cmd/main.go

FROM alpine:latest

WORKDIR /app
COPY --from=builder /app/projects-service .

EXPOSE 8087

CMD ["./projects-service"]
