// internal/middleware/middleware.go - All middleware in one file
package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/nexus/writer-service/config"
)

// AuthMiddleware handles JWT authentication
type AuthMiddleware struct {
	jwtSecret []byte
	logger    *zap.Logger
}

func NewAuthMiddleware(jwtSecret string, logger *zap.Logger) *AuthMiddleware {
	return &AuthMiddleware{
		jwtSecret: []byte(jwtSecret),
		logger:    logger,
	}
}

func (m *AuthMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			m.sendError(w, http.StatusUnauthorized, "Authorization header required")
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			m.sendError(w, http.StatusUnauthorized, "Invalid authorization format")
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return m.jwtSecret, nil
		})

		if err != nil || !token.Valid {
			m.sendError(w, http.StatusUnauthorized, "Invalid token")
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			m.sendError(w, http.StatusUnauthorized, "Invalid token claims")
			return
		}

		userID, err := uuid.Parse(claims["sub"].(string))
		if err != nil {
			m.sendError(w, http.StatusUnauthorized, "Invalid user ID")
			return
		}

		tenantID, err := uuid.Parse(claims["tenantId"].(string))
		if err != nil {
			m.sendError(w, http.StatusUnauthorized, "Invalid tenant ID")
			return
		}

		ctx := context.WithValue(r.Context(), "userID", userID)
		ctx = context.WithValue(ctx, "tenantID", tenantID)
		ctx = context.WithValue(ctx, "userEmail", claims["email"])

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m *AuthMiddleware) sendError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	fmt.Fprintf(w, `{"statusCode":%d,"message":"%s"}`, status, message)
}

// TenantMiddleware ensures tenant isolation
type TenantMiddleware struct {
	logger *zap.Logger
}

func NewTenantMiddleware(logger *zap.Logger) *TenantMiddleware {
	return &TenantMiddleware{logger: logger}
}

func (m *TenantMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := r.Context().Value("tenantID").(uuid.UUID)
		if !ok || tenantID == uuid.Nil {
			w.WriteHeader(http.StatusUnauthorized)
			fmt.Fprintf(w, `{"statusCode":401,"message":"Tenant ID required"}`)
			return
		}

		m.logger.Debug("Request from tenant", zap.String("tenantId", tenantID.String()))
		next.ServeHTTP(w, r)
	})
}

// LoggingMiddleware logs all HTTP requests
type LoggingMiddleware struct {
	logger *zap.Logger
}

func NewLoggingMiddleware(logger *zap.Logger) *LoggingMiddleware {
	return &LoggingMiddleware{logger: logger}
}

func (m *LoggingMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap ResponseWriter to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)

		m.logger.Info("HTTP Request",
			zap.String("method", r.Method),
			zap.String("path", r.URL.Path),
			zap.Int("status", wrapped.statusCode),
			zap.Duration("duration", duration),
			zap.String("ip", r.RemoteAddr),
		)
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// RateLimitMiddleware implements rate limiting using Redis
type RateLimitMiddleware struct {
	redis  *redis.Client
	config config.RateLimitConfig
	logger *zap.Logger
}

func NewRateLimitMiddleware(redis *redis.Client, cfg config.RateLimitConfig, logger *zap.Logger) *RateLimitMiddleware {
	return &RateLimitMiddleware{
		redis:  redis,
		config: cfg,
		logger: logger,
	}
}

func (m *RateLimitMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value("userID")
		if userID == nil {
			// Skip rate limiting for unauthenticated requests
			next.ServeHTTP(w, r)
			return
		}

		key := fmt.Sprintf("ratelimit:%s", userID.(uuid.UUID).String())

		count, err := m.redis.Incr(r.Context(), key).Result()
		if err != nil {
			m.logger.Error("Failed to increment rate limit counter", zap.Error(err))
			next.ServeHTTP(w, r)
			return
		}

		if count == 1 {
			m.redis.Expire(r.Context(), key, m.config.Window)
		}

		if count > int64(m.config.Requests) {
			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", m.config.Requests))
			w.Header().Set("X-RateLimit-Remaining", "0")
			w.WriteHeader(http.StatusTooManyRequests)
			fmt.Fprintf(w, `{"statusCode":429,"message":"Rate limit exceeded"}`)
			return
		}

		w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", m.config.Requests))
		w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", m.config.Requests-int(count)))

		next.ServeHTTP(w, r)
	})
}
