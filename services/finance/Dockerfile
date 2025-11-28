FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o finance-service ./cmd/main.go

FROM alpine:latest

WORKDIR /app
COPY --from=builder /app/finance-service .

EXPOSE 8082

CMD ["./finance-service"]
