# Multi-stage build for optimal image size and security

# Stage 1: Build
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git make gcc musl-dev

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build binary with optimizations
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags='-w -s -extldflags "-static"' \
    -a -installsuffix cgo \
    -o /app/vas \
    ./cmd/server

# Stage 2: Runtime
FROM alpine:3.19

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user
RUN addgroup -g 1000 nexus && \
    adduser -D -u 1000 -G nexus nexus

# Set working directory
WORKDIR /home/nexus

# Copy binary from builder
COPY --from=builder --chown=nexus:nexus /app/vas ./vas

# Copy configs (if any)
COPY --chown=nexus:nexus configs ./configs

# Switch to non-root user
USER nexus

# Expose port
EXPOSE 8200

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8200/health || exit 1

# Run
ENTRYPOINT ["./vas"]
