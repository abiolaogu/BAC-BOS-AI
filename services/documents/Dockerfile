FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod ./
# COPY go.sum ./ # No dependencies yet
RUN go mod download

COPY . .
RUN go build -o documents-service ./cmd/main.go

FROM alpine:latest

WORKDIR /app
COPY --from=builder /app/documents-service .

EXPOSE 8083

CMD ["./documents-service"]
