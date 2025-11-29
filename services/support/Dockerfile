FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod ./
# COPY go.sum ./
RUN go mod download

COPY . .
RUN go build -o support-service ./cmd/main.go

FROM alpine:latest

WORKDIR /app
COPY --from=builder /app/support-service .

EXPOSE 8089

CMD ["./support-service"]
