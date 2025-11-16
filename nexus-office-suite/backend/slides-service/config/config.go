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
	JWT      JWTConfig
	CORS     CORSConfig
	Slides   SlidesConfig
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

type JWTConfig struct {
	Secret string
	Expiry time.Duration
}

type CORSConfig struct {
	AllowedOrigins []string
}

type SlidesConfig struct {
	DefaultWidth             int
	DefaultHeight            int
	MaxSlidesPerPresentation int
}

func Load() (*Config, error) {
	// Load .env file if it exists
	_ = godotenv.Load()

	jwtExpiry, err := time.ParseDuration(getEnv("JWT_EXPIRY", "24h"))
	if err != nil {
		jwtExpiry = 24 * time.Hour
	}

	defaultWidth, _ := strconv.Atoi(getEnv("DEFAULT_SLIDE_WIDTH", "1920"))
	defaultHeight, _ := strconv.Atoi(getEnv("DEFAULT_SLIDE_HEIGHT", "1080"))
	maxSlides, _ := strconv.Atoi(getEnv("MAX_SLIDES_PER_PRESENTATION", "500"))

	config := &Config{
		Server: ServerConfig{
			Port: getEnv("PORT", "8094"),
			Host: getEnv("HOST", "0.0.0.0"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "nexus"),
			Password: getEnv("DB_PASSWORD", "nexus123"),
			DBName:   getEnv("DB_NAME", "nexus_slides"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", "your-secret-key"),
			Expiry: jwtExpiry,
		},
		CORS: CORSConfig{
			AllowedOrigins: []string{
				getEnv("ALLOWED_ORIGINS", "http://localhost:3003"),
			},
		},
		Slides: SlidesConfig{
			DefaultWidth:             defaultWidth,
			DefaultHeight:            defaultHeight,
			MaxSlidesPerPresentation: maxSlides,
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
