package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Models
type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Email     string    `gorm:"uniqueIndex" json:"email"`
	Name      string    `json:"name"`
	Password  string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type EmailAccount struct {
	ID           uint   `gorm:"primaryKey" json:"id"`
	UserID       uint   `json:"user_id"`
	EmailAddress string `json:"email_address"`
	DisplayName  string `json:"display_name"`
	IMAPHost     string `json:"imap_host"`
	IMAPPort     int    `json:"imap_port"`
	SMTPHost     string `json:"smtp_host"`
	SMTPPort     int    `json:"smtp_port"`
	Password     string `json:"-"`
	IsDefault    bool   `json:"is_default"`
	CreatedAt    time.Time `json:"created_at"`
}

type Email struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	AccountID   uint      `json:"account_id"`
	MessageID   string    `gorm:"uniqueIndex" json:"message_id"`
	ThreadID    string    `gorm:"index" json:"thread_id"`
	From        string    `json:"from"`
	To          string    `json:"to"`
	CC          string    `json:"cc"`
	BCC         string    `json:"bcc"`
	Subject     string    `json:"subject"`
	Body        string    `json:"body"`
	BodyHTML    string    `json:"body_html"`
	IsRead      bool      `json:"is_read"`
	IsStarred   bool      `json:"is_starred"`
	IsDraft     bool      `json:"is_draft"`
	IsSent      bool      `json:"is_sent"`
	IsTrash     bool      `json:"is_trash"`
	IsSpam      bool      `json:"is_spam"`
	Labels      string    `json:"labels"` // JSON array
	ReceivedAt  time.Time `json:"received_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type EmailAttachment struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	EmailID     uint   `json:"email_id"`
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
	Size        int64  `json:"size"`
	StoragePath string `json:"storage_path"`
	CreatedAt   time.Time `json:"created_at"`
}

type Label struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `json:"user_id"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"created_at"`
}

// Database
var db *gorm.DB

func initDatabase() error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "host=localhost user=postgres password=postgres dbname=bac_mail port=5432 sslmode=disable"
	}

	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return err
	}

	// Auto migrate
	return db.AutoMigrate(&User{}, &EmailAccount{}, &Email{}, &EmailAttachment{}, &Label{})
}

// Handlers
func setupRoutes(r *gin.Engine) {
	// Public routes
	public := r.Group("/api/v1")
	{
		public.POST("/auth/login", loginHandler)
		public.POST("/auth/register", registerHandler)
	}

	// Protected routes
	protected := r.Group("/api/v1")
	protected.Use(authMiddleware())
	{
		// Email accounts
		protected.GET("/accounts", listAccountsHandler)
		protected.POST("/accounts", createAccountHandler)
		protected.PUT("/accounts/:id", updateAccountHandler)
		protected.DELETE("/accounts/:id", deleteAccountHandler)

		// Emails
		protected.GET("/emails", listEmailsHandler)
		protected.GET("/emails/:id", getEmailHandler)
		protected.POST("/emails", sendEmailHandler)
		protected.PUT("/emails/:id", updateEmailHandler)
		protected.DELETE("/emails/:id", deleteEmailHandler)
		protected.POST("/emails/:id/star", starEmailHandler)
		protected.POST("/emails/:id/read", markReadHandler)
		protected.POST("/emails/:id/label", addLabelHandler)

		// Threads
		protected.GET("/threads", listThreadsHandler)
		protected.GET("/threads/:id", getThreadHandler)

		// Labels
		protected.GET("/labels", listLabelsHandler)
		protected.POST("/labels", createLabelHandler)
		protected.PUT("/labels/:id", updateLabelHandler)
		protected.DELETE("/labels/:id", deleteLabelHandler)

		// Search
		protected.GET("/search", searchEmailsHandler)

		// Attachments
		protected.GET("/attachments/:id", downloadAttachmentHandler)
	}

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "bac-mail"})
	})
}

// Auth Middleware
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Remove "Bearer " prefix
		if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
			tokenString = tokenString[7:]
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		claims := token.Claims.(jwt.MapClaims)
		c.Set("user_id", uint(claims["user_id"].(float64)))
		c.Next()
	}
}

// Handler implementations
func loginHandler(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user User
	if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// In production, use bcrypt for password hashing
	if user.Password != req.Password {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"exp":     time.Now().Add(time.Hour * 24 * 7).Unix(),
	})

	tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user":  user,
	})
}

func registerHandler(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Name     string `json:"name" binding:"required"`
		Password string `json:"password" binding:"required,min=8"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := User{
		Email:    req.Email,
		Name:     req.Name,
		Password: req.Password, // In production, hash with bcrypt
	}

	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email already exists"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"user": user})
}

func listAccountsHandler(c *gin.Context) {
	userID := c.GetUint("user_id")

	var accounts []EmailAccount
	if err := db.Where("user_id = ?", userID).Find(&accounts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch accounts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"accounts": accounts})
}

func createAccountHandler(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req EmailAccount
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.UserID = userID
	if err := db.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"account": req})
}

func updateAccountHandler(c *gin.Context) {
	// Implementation
	c.JSON(http.StatusOK, gin.H{"message": "Account updated"})
}

func deleteAccountHandler(c *gin.Context) {
	// Implementation
	c.JSON(http.StatusOK, gin.H{"message": "Account deleted"})
}

func listEmailsHandler(c *gin.Context) {
	userID := c.GetUint("user_id")

	// Get query parameters
	folder := c.DefaultQuery("folder", "inbox")
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "50")

	var emails []Email
	query := db.Joins("JOIN email_accounts ON emails.account_id = email_accounts.id").
		Where("email_accounts.user_id = ?", userID)

	// Apply folder filter
	switch folder {
	case "inbox":
		query = query.Where("is_sent = ? AND is_trash = ? AND is_spam = ?", false, false, false)
	case "sent":
		query = query.Where("is_sent = ?", true)
	case "drafts":
		query = query.Where("is_draft = ?", true)
	case "trash":
		query = query.Where("is_trash = ?", true)
	case "spam":
		query = query.Where("is_spam = ?", true)
	case "starred":
		query = query.Where("is_starred = ?", true)
	}

	query = query.Order("received_at DESC").Limit(atoi(limit)).Offset((atoi(page) - 1) * atoi(limit))

	if err := query.Find(&emails).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch emails"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"emails": emails, "page": page, "limit": limit})
}

func getEmailHandler(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetUint("user_id")

	var email Email
	if err := db.Joins("JOIN email_accounts ON emails.account_id = email_accounts.id").
		Where("emails.id = ? AND email_accounts.user_id = ?", id, userID).
		First(&email).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Email not found"})
		return
	}

	// Mark as read
	db.Model(&email).Update("is_read", true)

	// Get attachments
	var attachments []EmailAttachment
	db.Where("email_id = ?", email.ID).Find(&attachments)

	c.JSON(http.StatusOK, gin.H{"email": email, "attachments": attachments})
}

func sendEmailHandler(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		AccountID uint   `json:"account_id" binding:"required"`
		To        string `json:"to" binding:"required"`
		CC        string `json:"cc"`
		BCC       string `json:"bcc"`
		Subject   string `json:"subject" binding:"required"`
		Body      string `json:"body" binding:"required"`
		BodyHTML  string `json:"body_html"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify account ownership
	var account EmailAccount
	if err := db.Where("id = ? AND user_id = ?", req.AccountID, userID).First(&account).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Account not found"})
		return
	}

	email := Email{
		AccountID: req.AccountID,
		MessageID: generateMessageID(),
		ThreadID:  generateThreadID(),
		From:      account.EmailAddress,
		To:        req.To,
		CC:        req.CC,
		BCC:       req.BCC,
		Subject:   req.Subject,
		Body:      req.Body,
		BodyHTML:  req.BodyHTML,
		IsSent:    true,
		ReceivedAt: time.Now(),
	}

	if err := db.Create(&email).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send email"})
		return
	}

	// TODO: Actually send email via SMTP

	c.JSON(http.StatusCreated, gin.H{"email": email})
}

func updateEmailHandler(c *gin.Context) {
	// Implementation
	c.JSON(http.StatusOK, gin.H{"message": "Email updated"})
}

func deleteEmailHandler(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetUint("user_id")

	// Move to trash
	result := db.Model(&Email{}).
		Joins("JOIN email_accounts ON emails.account_id = email_accounts.id").
		Where("emails.id = ? AND email_accounts.user_id = ?", id, userID).
		Update("is_trash", true)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Email moved to trash"})
}

func starEmailHandler(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetUint("user_id")

	var req struct {
		Starred bool `json:"starred"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := db.Model(&Email{}).
		Joins("JOIN email_accounts ON emails.account_id = email_accounts.id").
		Where("emails.id = ? AND email_accounts.user_id = ?", id, userID).
		Update("is_starred", req.Starred)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to star email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Email starred"})
}

func markReadHandler(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetUint("user_id")

	var req struct {
		Read bool `json:"read"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := db.Model(&Email{}).
		Joins("JOIN email_accounts ON emails.account_id = email_accounts.id").
		Where("emails.id = ? AND email_accounts.user_id = ?", id, userID).
		Update("is_read", req.Read)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Email marked"})
}

func addLabelHandler(c *gin.Context) {
	// Implementation
	c.JSON(http.StatusOK, gin.H{"message": "Label added"})
}

func listThreadsHandler(c *gin.Context) {
	// Implementation - group emails by thread_id
	c.JSON(http.StatusOK, gin.H{"threads": []interface{}{}})
}

func getThreadHandler(c *gin.Context) {
	// Implementation
	c.JSON(http.StatusOK, gin.H{"thread": gin.H{}})
}

func listLabelsHandler(c *gin.Context) {
	userID := c.GetUint("user_id")

	var labels []Label
	if err := db.Where("user_id = ?", userID).Find(&labels).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch labels"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"labels": labels})
}

func createLabelHandler(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req Label
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.UserID = userID
	if err := db.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create label"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"label": req})
}

func updateLabelHandler(c *gin.Context) {
	// Implementation
	c.JSON(http.StatusOK, gin.H{"message": "Label updated"})
}

func deleteLabelHandler(c *gin.Context) {
	// Implementation
	c.JSON(http.StatusOK, gin.H{"message": "Label deleted"})
}

func searchEmailsHandler(c *gin.Context) {
	userID := c.GetUint("user_id")
	query := c.Query("q")

	var emails []Email
	result := db.Joins("JOIN email_accounts ON emails.account_id = email_accounts.id").
		Where("email_accounts.user_id = ?", userID).
		Where("subject ILIKE ? OR body ILIKE ? OR \"from\" ILIKE ? OR \"to\" ILIKE ?",
			"%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%").
		Order("received_at DESC").
		Limit(100).
		Find(&emails)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"emails": emails, "query": query})
}

func downloadAttachmentHandler(c *gin.Context) {
	// Implementation
	c.JSON(http.StatusOK, gin.H{"message": "Attachment download"})
}

// Utility functions
func generateMessageID() string {
	return fmt.Sprintf("<%d@bac-mail.com>", time.Now().UnixNano())
}

func generateThreadID() string {
	return fmt.Sprintf("thread-%d", time.Now().UnixNano())
}

func atoi(s string) int {
	var i int
	fmt.Sscanf(s, "%d", &i)
	return i
}

func main() {
	// Initialize database
	if err := initDatabase(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Set JWT secret
	if os.Getenv("JWT_SECRET") == "" {
		os.Setenv("JWT_SECRET", "your-secret-key-change-in-production")
	}

	// Setup Gin router
	r := gin.Default()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	setupRoutes(r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8086"
	}

	log.Printf("BAC Mail Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
