FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod ./
# COPY go.sum ./
RUN go mod download

COPY . .
RUN go build -o hr-service ./cmd/main.go

FROM alpine:latest

WORKDIR /app
COPY --from=builder /app/hr-service .

EXPOSE 8084

CMD ["./hr-service"]
