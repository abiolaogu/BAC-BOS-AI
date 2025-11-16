package handlers

import (
	"nexus-calendar-service/config"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func AuthMiddleware(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing authorization header",
			})
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid authorization header format",
			})
		}

		tokenString := parts[1]

		// Parse and validate token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Verify signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.NewError(fiber.StatusUnauthorized, "Invalid signing method")
			}
			return []byte(cfg.JWT.Secret), nil
		})

		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token",
			})
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			// Extract user ID from claims
			userIDStr, ok := claims["user_id"].(string)
			if !ok {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Invalid token claims",
				})
			}

			userID, err := uuid.Parse(userIDStr)
			if err != nil {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Invalid user ID in token",
				})
			}

			// Store user ID in context
			c.Locals("userID", userID)
			return c.Next()
		}

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid token",
		})
	}
}

func CORSMiddleware(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Set("Access-Control-Allow-Origin", cfg.CORS.AllowOrigins)
		c.Set("Access-Control-Allow-Methods", cfg.CORS.AllowMethods)
		c.Set("Access-Control-Allow-Headers", cfg.CORS.AllowHeaders)

		if c.Method() == "OPTIONS" {
			return c.SendStatus(fiber.StatusNoContent)
		}

		return c.Next()
	}
}
