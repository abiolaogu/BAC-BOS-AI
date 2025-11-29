FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod ./
# COPY go.sum ./
RUN go mod download

COPY . .
RUN go build -o inventory-service ./cmd/main.go

FROM alpine:latest

WORKDIR /app
COPY --from=builder /app/inventory-service .

EXPOSE 8085

CMD ["./inventory-service"]
