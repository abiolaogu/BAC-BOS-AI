// config/config.go
package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	// Server
	Port        string
	Host        string
	Environment string

	// Database
	DatabaseURL            string
	DatabaseMaxConnections int
	DatabaseMaxIdle        int

	// Redis
	RedisAddr     string
	RedisPassword string
	RedisDB       int

	// JWT
	JWTSecret            string
	JWTExpiration        time.Duration
	JWTRefreshExpiration time.Duration

	// MinIO/S3
	MinIOEndpoint  string
	MinIOAccessKey string
	MinIOSecretKey string
	MinIOUseSSL    bool
	MinIOBucket    string

	// Kafka
	KafkaBrokers        []string
	KafkaTopicDocuments string

	// CORS
	CORSAllowedOrigins []string
	CORSAllowedMethods []string
	CORSAllowedHeaders []string

	// Rate Limiting
	RateLimit RateLimitConfig

	// File Upload
	MaxUploadSize   int64
	MaxDocumentSize int64

	// Export
	ExportTempDir string
	ExportTimeout time.Duration

	// Logging
	LogLevel  string
	LogFormat string
}

type RateLimitConfig struct {
	Requests int
	Window   time.Duration
}

func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8091"),
		Host:        getEnv("HOST", "0.0.0.0"),
		Environment: getEnv("ENV", "development"),

		DatabaseURL:            getEnv("DATABASE_URL", "postgres://nexus:nexus_password@localhost:5432/nexus_writer?sslmode=disable"),
		DatabaseMaxConnections: getEnvAsInt("DATABASE_MAX_CONNECTIONS", 25),
		DatabaseMaxIdle:        getEnvAsInt("DATABASE_MAX_IDLE_CONNECTIONS", 5),

		RedisAddr:     getEnv("REDIS_URL", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvAsInt("REDIS_DB", 0),

		JWTSecret:            getEnv("JWT_SECRET", "your-secret-key-change-this-in-production"),
		JWTExpiration:        getEnvAsDuration("JWT_EXPIRATION", 24*time.Hour),
		JWTRefreshExpiration: getEnvAsDuration("JWT_REFRESH_EXPIRATION", 168*time.Hour),

		MinIOEndpoint:  getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinIOAccessKey: getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinIOSecretKey: getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinIOUseSSL:    getEnvAsBool("MINIO_USE_SSL", false),
		MinIOBucket:    getEnv("MINIO_BUCKET", "nexus-documents"),

		KafkaBrokers:        getEnvAsSlice("KAFKA_BROKERS", []string{"localhost:9092"}),
		KafkaTopicDocuments: getEnv("KAFKA_TOPIC_DOCUMENTS", "documents.events"),

		CORSAllowedOrigins: getEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000"}),
		CORSAllowedMethods: getEnvAsSlice("CORS_ALLOWED_METHODS", []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"}),
		CORSAllowedHeaders: getEnvAsSlice("CORS_ALLOWED_HEADERS", []string{"Content-Type", "Authorization"}),

		RateLimit: RateLimitConfig{
			Requests: getEnvAsInt("RATE_LIMIT_REQUESTS", 1000),
			Window:   getEnvAsDuration("RATE_LIMIT_WINDOW", time.Hour),
		},

		MaxUploadSize:   getEnvAsInt64("MAX_UPLOAD_SIZE", 10485760),
		MaxDocumentSize: getEnvAsInt64("MAX_DOCUMENT_SIZE", 52428800),

		ExportTempDir: getEnv("EXPORT_TEMP_DIR", "/tmp/nexus-exports"),
		ExportTimeout: getEnvAsDuration("EXPORT_TIMEOUT", 30*time.Second),

		LogLevel:  getEnv("LOG_LEVEL", "info"),
		LogFormat: getEnv("LOG_FORMAT", "json"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsInt64(key string, defaultValue int64) int64 {
	valueStr := getEnv(key, "")
	if value, err := strconv.ParseInt(valueStr, 10, 64); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := getEnv(key, "")
	if value, err := strconv.ParseBool(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
	valueStr := getEnv(key, "")
	if value, err := time.ParseDuration(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	return strings.Split(valueStr, ",")
}
