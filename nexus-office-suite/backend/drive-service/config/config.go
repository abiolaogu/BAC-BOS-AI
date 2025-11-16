package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	MinIO    MinIOConfig
	JWT      JWTConfig
	CORS     CORSConfig
	Upload   UploadConfig
}

type ServerConfig struct {
	Port string
	Host string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type MinIOConfig struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	UseSSL    bool
	Bucket    string
	Region    string
}

type JWTConfig struct {
	Secret string
	Expiry time.Duration
}

type CORSConfig struct {
	AllowedOrigins []string
}

type UploadConfig struct {
	MaxUploadSize int64
	ChunkSize     int64
}

func Load() (*Config, error) {
	// Load .env file if it exists
	_ = godotenv.Load()

	jwtExpiry, err := time.ParseDuration(getEnv("JWT_EXPIRY", "24h"))
	if err != nil {
		jwtExpiry = 24 * time.Hour
	}

	maxUploadSize, _ := strconv.ParseInt(getEnv("MAX_UPLOAD_SIZE", "104857600"), 10, 64)
	chunkSize, _ := strconv.ParseInt(getEnv("CHUNK_SIZE", "5242880"), 10, 64)

	config := &Config{
		Server: ServerConfig{
			Port: getEnv("PORT", "8093"),
			Host: getEnv("HOST", "0.0.0.0"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "nexus"),
			Password: getEnv("DB_PASSWORD", "nexus123"),
			DBName:   getEnv("DB_NAME", "nexus_drive"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		MinIO: MinIOConfig{
			Endpoint:  getEnv("MINIO_ENDPOINT", "localhost:9000"),
			AccessKey: getEnv("MINIO_ACCESS_KEY", "minioadmin"),
			SecretKey: getEnv("MINIO_SECRET_KEY", "minioadmin"),
			UseSSL:    getEnv("MINIO_USE_SSL", "false") == "true",
			Bucket:    getEnv("MINIO_BUCKET", "nexus-drive"),
			Region:    getEnv("MINIO_REGION", "us-east-1"),
		},
		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", "your-secret-key"),
			Expiry: jwtExpiry,
		},
		CORS: CORSConfig{
			AllowedOrigins: []string{
				getEnv("ALLOWED_ORIGINS", "http://localhost:3002"),
			},
		},
		Upload: UploadConfig{
			MaxUploadSize: maxUploadSize,
			ChunkSize:     chunkSize,
		},
	}

	return config, nil
}

func (c *DatabaseConfig) ConnectionString() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.DBName, c.SSLMode,
	)
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
