package config

import (
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server
	Port string
	Host string

	// Database
	DatabaseURL string

	// Redis
	RedisURL string

	// JWT
	JWTSecret string
	JWTExpiry time.Duration

	// CORS
	CORSAllowedOrigins []string

	// Rate Limiting
	RateLimitRequests int
	RateLimitWindow   time.Duration

	// Environment
	Environment string

	// Logging
	LogLevel string
}

func Load() *Config {
	// Load .env file if it exists
	_ = godotenv.Load()

	jwtExpiry, _ := time.ParseDuration(getEnv("JWT_EXPIRY", "24h"))
	rateLimitWindow, _ := time.ParseDuration(getEnv("RATE_LIMIT_WINDOW", "1m"))

	return &Config{
		Port:               getEnv("PORT", "8092"),
		Host:               getEnv("HOST", "0.0.0.0"),
		DatabaseURL:        getEnv("DATABASE_URL", "postgres://nexus:nexus_password@localhost:5432/sheets?sslmode=disable"),
		RedisURL:           getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:          getEnv("JWT_SECRET", "your-super-secret-jwt-key"),
		JWTExpiry:          jwtExpiry,
		CORSAllowedOrigins: []string{getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")},
		RateLimitRequests:  getEnvAsInt("RATE_LIMIT_REQUESTS", 100),
		RateLimitWindow:    rateLimitWindow,
		Environment:        getEnv("ENVIRONMENT", "development"),
		LogLevel:           getEnv("LOG_LEVEL", "info"),
	}
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := os.Getenv(key)
	if valueStr == "" {
		return defaultValue
	}
	value, err := strconv.Atoi(valueStr)
	if err != nil {
		log.Printf("Warning: Invalid integer value for %s, using default %d", key, defaultValue)
		return defaultValue
	}
	return value
}
