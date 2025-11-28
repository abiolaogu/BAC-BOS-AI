package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Server     ServerConfig
	Database   DatabaseConfig
	SMTP       SMTPConfig
	IMAP       IMAPConfig
	POP3       POP3Config
	Storage    StorageConfig
	Search     SearchConfig
	Security   SecurityConfig
	Email      EmailConfig
	Redis      RedisConfig
	IDaaS      IDaaSConfig
}

type IDaaSConfig struct {
	URL string
}

type ServerConfig struct {
	Port            string
	Environment     string
	AllowedOrigins  []string
	JWTSecret       string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type SMTPConfig struct {
	Enabled       bool
	Host          string
	Port          string
	Domain        string
	MaxMessageSize int64
	TLSEnabled    bool
	CertFile      string
	KeyFile       string
}

type IMAPConfig struct {
	Enabled    bool
	Host       string
	Port       string
	TLSEnabled bool
	CertFile   string
	KeyFile    string
}

type POP3Config struct {
	Enabled    bool
	Host       string
	Port       string
	TLSEnabled bool
}

type StorageConfig struct {
	Type            string // "minio" or "s3"
	Endpoint        string
	AccessKeyID     string
	SecretAccessKey string
	BucketName      string
	UseSSL          bool
	Region          string
}

type SearchConfig struct {
	Enabled       bool
	ElasticsearchURL string
	IndexName     string
}

type SecurityConfig struct {
	SpamAssassinHost    string
	SpamAssassinPort    string
	ClamAVHost          string
	ClamAVPort          string
	EnableSpamFilter    bool
	EnableVirusScanning bool
}

type EmailConfig struct {
	MaxAttachmentSize   int64
	MaxRecipientsPerEmail int
	EnableReadReceipts  bool
	DefaultQuotaMB      int64
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

func Load() (*Config, error) {
	// Load .env file if exists
	_ = godotenv.Load()

	config := &Config{
		Server: ServerConfig{
			Port:        getEnv("SERVER_PORT", "8085"),
			Environment: getEnv("ENVIRONMENT", "development"),
			AllowedOrigins: []string{
				getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3005"),
			},
			JWTSecret: getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			DBName:   getEnv("DB_NAME", "nexus_mail"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		SMTP: SMTPConfig{
			Enabled:        getEnvBool("SMTP_ENABLED", true),
			Host:           getEnv("SMTP_HOST", "0.0.0.0"),
			Port:           getEnv("SMTP_PORT", "1025"),
			Domain:         getEnv("SMTP_DOMAIN", "nexusmail.local"),
			MaxMessageSize: getEnvInt64("SMTP_MAX_MESSAGE_SIZE", 26214400), // 25MB
			TLSEnabled:     getEnvBool("SMTP_TLS_ENABLED", false),
			CertFile:       getEnv("SMTP_CERT_FILE", ""),
			KeyFile:        getEnv("SMTP_KEY_FILE", ""),
		},
		IMAP: IMAPConfig{
			Enabled:    getEnvBool("IMAP_ENABLED", true),
			Host:       getEnv("IMAP_HOST", "0.0.0.0"),
			Port:       getEnv("IMAP_PORT", "1143"),
			TLSEnabled: getEnvBool("IMAP_TLS_ENABLED", false),
			CertFile:   getEnv("IMAP_CERT_FILE", ""),
			KeyFile:    getEnv("IMAP_KEY_FILE", ""),
		},
		POP3: POP3Config{
			Enabled:    getEnvBool("POP3_ENABLED", false),
			Host:       getEnv("POP3_HOST", "0.0.0.0"),
			Port:       getEnv("POP3_PORT", "1110"),
			TLSEnabled: getEnvBool("POP3_TLS_ENABLED", false),
		},
		Storage: StorageConfig{
			Type:            getEnv("STORAGE_TYPE", "minio"),
			Endpoint:        getEnv("MINIO_ENDPOINT", "localhost:9000"),
			AccessKeyID:     getEnv("MINIO_ACCESS_KEY", "minioadmin"),
			SecretAccessKey: getEnv("MINIO_SECRET_KEY", "minioadmin"),
			BucketName:      getEnv("MINIO_BUCKET", "nexus-mail-attachments"),
			UseSSL:          getEnvBool("MINIO_USE_SSL", false),
			Region:          getEnv("MINIO_REGION", "us-east-1"),
		},
		Search: SearchConfig{
			Enabled:          getEnvBool("ELASTICSEARCH_ENABLED", true),
			ElasticsearchURL: getEnv("ELASTICSEARCH_URL", "http://localhost:9200"),
			IndexName:        getEnv("ELASTICSEARCH_INDEX", "nexus_emails"),
		},
		Security: SecurityConfig{
			SpamAssassinHost:    getEnv("SPAMASSASSIN_HOST", "localhost"),
			SpamAssassinPort:    getEnv("SPAMASSASSIN_PORT", "783"),
			ClamAVHost:          getEnv("CLAMAV_HOST", "localhost"),
			ClamAVPort:          getEnv("CLAMAV_PORT", "3310"),
			EnableSpamFilter:    getEnvBool("ENABLE_SPAM_FILTER", false),
			EnableVirusScanning: getEnvBool("ENABLE_VIRUS_SCANNING", false),
		},
		Email: EmailConfig{
			MaxAttachmentSize:     getEnvInt64("MAX_ATTACHMENT_SIZE", 26214400), // 25MB
			MaxRecipientsPerEmail: int(getEnvInt64("MAX_RECIPIENTS_PER_EMAIL", 100)),
			EnableReadReceipts:    getEnvBool("ENABLE_READ_RECEIPTS", true),
			DefaultQuotaMB:        getEnvInt64("DEFAULT_QUOTA_MB", 5120), // 5GB
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       int(getEnvInt64("REDIS_DB", 0)),
		},
		IDaaS: IDaaSConfig{
			URL: getEnv("IDAAS_URL", "http://localhost:8100/api/v1"),
		},
	}

	return config, nil
}

func (c *Config) GetDatabaseDSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Database.Host,
		c.Database.Port,
		c.Database.User,
		c.Database.Password,
		c.Database.DBName,
		c.Database.SSLMode,
	)
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func getEnvBool(key string, defaultValue bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	boolValue, err := strconv.ParseBool(value)
	if err != nil {
		return defaultValue
	}
	return boolValue
}

func getEnvInt64(key string, defaultValue int64) int64 {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	intValue, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return defaultValue
	}
	return intValue
}
