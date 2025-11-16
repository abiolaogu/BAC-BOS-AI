package handler

import (
	"net/http"
	"strconv"

	"nexus-mail-service/internal/model"
	"nexus-mail-service/internal/repository"
	"nexus-mail-service/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

// EmailHandler handles HTTP requests for emails
type EmailHandler struct {
	emailService  *service.EmailService
	folderRepo    *repository.FolderRepository
	labelRepo     *repository.LabelRepository
}

// NewEmailHandler creates a new email handler
func NewEmailHandler(
	emailService *service.EmailService,
	folderRepo *repository.FolderRepository,
	labelRepo *repository.LabelRepository,
) *EmailHandler {
	return &EmailHandler{
		emailService: emailService,
		folderRepo:   folderRepo,
		labelRepo:    labelRepo,
	}
}

// RegisterRoutes registers HTTP routes
func (h *EmailHandler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api/v1")
	{
		// Email routes
		emails := api.Group("/emails")
		{
			emails.POST("/send", h.SendEmail)
			emails.POST("/draft", h.SaveDraft)
			emails.GET("", h.ListEmails)
			emails.GET("/:id", h.GetEmail)
			emails.POST("/search", h.SearchEmails)
			emails.PUT("/:id/read", h.MarkAsRead)
			emails.PUT("/:id/star", h.MarkAsStarred)
			emails.PUT("/:id/move", h.MoveToFolder)
			emails.DELETE("/:id", h.DeleteEmail)
			emails.GET("/:id/thread", h.GetThread)
			emails.POST("/bulk", h.BulkAction)
		}

		// Folder routes
		folders := api.Group("/folders")
		{
			folders.GET("", h.ListFolders)
			folders.POST("", h.CreateFolder)
			folders.GET("/:id", h.GetFolder)
			folders.PUT("/:id", h.UpdateFolder)
			folders.DELETE("/:id", h.DeleteFolder)
		}

		// Label routes
		labels := api.Group("/labels")
		{
			labels.GET("", h.ListLabels)
			labels.POST("", h.CreateLabel)
			labels.GET("/:id", h.GetLabel)
			labels.PUT("/:id", h.UpdateLabel)
			labels.DELETE("/:id", h.DeleteLabel)
		}

		// Attachment routes
		attachments := api.Group("/attachments")
		{
			attachments.GET("/:id/download", h.DownloadAttachment)
		}
	}
}

// Email Handlers

// SendEmail sends an email
func (h *EmailHandler) SendEmail(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user" // TODO: Get from JWT token
	}

	var req model.ComposeEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	email, err := h.emailService.SendEmail(userID, &req)
	if err != nil {
		log.Error().Err(err).Msg("Failed to send email")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send email"})
		return
	}

	c.JSON(http.StatusOK, email)
}

// SaveDraft saves an email as draft
func (h *EmailHandler) SaveDraft(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	var req model.ComposeEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	email, err := h.emailService.SaveDraft(userID, &req)
	if err != nil {
		log.Error().Err(err).Msg("Failed to save draft")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save draft"})
		return
	}

	c.JSON(http.StatusOK, email)
}

// ListEmails lists emails with pagination
func (h *EmailHandler) ListEmails(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	folderID := c.Query("folder_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))

	// Parse filters
	filters := make(map[string]interface{})
	if isRead := c.Query("is_read"); isRead != "" {
		filters["is_read"] = isRead == "true"
	}
	if isStarred := c.Query("is_starred"); isStarred != "" {
		filters["is_starred"] = isStarred == "true"
	}
	if hasAttachments := c.Query("has_attachments"); hasAttachments != "" {
		filters["has_attachments"] = hasAttachments == "true"
	}

	response, err := h.emailService.ListEmails(userID, folderID, page, pageSize, filters)
	if err != nil {
		log.Error().Err(err).Msg("Failed to list emails")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list emails"})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetEmail retrieves an email by ID
func (h *EmailHandler) GetEmail(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	emailID := c.Param("id")

	email, err := h.emailService.GetEmail(emailID, userID)
	if err != nil {
		log.Error().Err(err).Str("emailID", emailID).Msg("Failed to get email")
		c.JSON(http.StatusNotFound, gin.H{"error": "Email not found"})
		return
	}

	// Auto-mark as read when opened
	if !email.IsRead {
		h.emailService.MarkAsRead(emailID, userID, true)
	}

	c.JSON(http.StatusOK, email)
}

// SearchEmails searches emails
func (h *EmailHandler) SearchEmails(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	var req model.SearchEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Page == 0 {
		req.Page = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 50
	}

	response, err := h.emailService.SearchEmails(userID, &req)
	if err != nil {
		log.Error().Err(err).Msg("Failed to search emails")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search emails"})
		return
	}

	c.JSON(http.StatusOK, response)
}

// MarkAsRead marks an email as read/unread
func (h *EmailHandler) MarkAsRead(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	emailID := c.Param("id")

	var req struct {
		IsRead bool `json:"is_read"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.emailService.MarkAsRead(emailID, userID, req.IsRead)
	if err != nil {
		log.Error().Err(err).Msg("Failed to mark email as read")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// MarkAsStarred marks an email as starred/unstarred
func (h *EmailHandler) MarkAsStarred(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	emailID := c.Param("id")

	var req struct {
		IsStarred bool `json:"is_starred"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.emailService.MarkAsStarred(emailID, userID, req.IsStarred)
	if err != nil {
		log.Error().Err(err).Msg("Failed to mark email as starred")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// MoveToFolder moves an email to a different folder
func (h *EmailHandler) MoveToFolder(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	emailID := c.Param("id")

	var req struct {
		FolderID string `json:"folder_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.emailService.MoveToFolder(emailID, userID, req.FolderID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to move email")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to move email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// DeleteEmail deletes an email
func (h *EmailHandler) DeleteEmail(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	emailID := c.Param("id")

	err := h.emailService.DeleteEmail(emailID, userID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to delete email")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetThread retrieves all emails in a thread
func (h *EmailHandler) GetThread(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	threadID := c.Param("id")

	emails, err := h.emailService.GetThread(threadID, userID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get thread")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get thread"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"emails": emails})
}

// BulkAction performs bulk actions on emails
func (h *EmailHandler) BulkAction(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	var req model.BulkActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.emailService.BulkAction(userID, &req)
	if err != nil {
		log.Error().Err(err).Msg("Failed to perform bulk action")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to perform bulk action"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Folder Handlers

// ListFolders lists all folders
func (h *EmailHandler) ListFolders(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	folders, err := h.folderRepo.List(userID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to list folders")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list folders"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"folders": folders})
}

// CreateFolder creates a new folder
func (h *EmailHandler) CreateFolder(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	var folder model.Folder
	if err := c.ShouldBindJSON(&folder); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	folder.UserID = userID
	folder.Type = "custom"

	err := h.folderRepo.Create(&folder)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create folder")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create folder"})
		return
	}

	c.JSON(http.StatusCreated, folder)
}

// GetFolder retrieves a folder by ID
func (h *EmailHandler) GetFolder(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	folderID := c.Param("id")

	folder, err := h.folderRepo.GetByID(folderID, userID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get folder")
		c.JSON(http.StatusNotFound, gin.H{"error": "Folder not found"})
		return
	}

	c.JSON(http.StatusOK, folder)
}

// UpdateFolder updates a folder
func (h *EmailHandler) UpdateFolder(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	folderID := c.Param("id")

	var folder model.Folder
	if err := c.ShouldBindJSON(&folder); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	folder.ID = folderID
	folder.UserID = userID

	err := h.folderRepo.Update(&folder)
	if err != nil {
		log.Error().Err(err).Msg("Failed to update folder")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update folder"})
		return
	}

	c.JSON(http.StatusOK, folder)
}

// DeleteFolder deletes a folder
func (h *EmailHandler) DeleteFolder(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	folderID := c.Param("id")

	err := h.folderRepo.Delete(folderID, userID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to delete folder")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete folder"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Label Handlers

// ListLabels lists all labels
func (h *EmailHandler) ListLabels(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	labels, err := h.labelRepo.List(userID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to list labels")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list labels"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"labels": labels})
}

// CreateLabel creates a new label
func (h *EmailHandler) CreateLabel(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	var label model.Label
	if err := c.ShouldBindJSON(&label); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	label.UserID = userID

	err := h.labelRepo.Create(&label)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create label")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create label"})
		return
	}

	c.JSON(http.StatusCreated, label)
}

// GetLabel retrieves a label by ID
func (h *EmailHandler) GetLabel(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	labelID := c.Param("id")

	label, err := h.labelRepo.GetByID(labelID, userID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get label")
		c.JSON(http.StatusNotFound, gin.H{"error": "Label not found"})
		return
	}

	c.JSON(http.StatusOK, label)
}

// UpdateLabel updates a label
func (h *EmailHandler) UpdateLabel(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	labelID := c.Param("id")

	var label model.Label
	if err := c.ShouldBindJSON(&label); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	label.ID = labelID
	label.UserID = userID

	err := h.labelRepo.Update(&label)
	if err != nil {
		log.Error().Err(err).Msg("Failed to update label")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update label"})
		return
	}

	c.JSON(http.StatusOK, label)
}

// DeleteLabel deletes a label
func (h *EmailHandler) DeleteLabel(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	labelID := c.Param("id")

	err := h.labelRepo.Delete(labelID, userID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to delete label")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete label"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// DownloadAttachment downloads an attachment
func (h *EmailHandler) DownloadAttachment(c *gin.Context) {
	// TODO: Implement attachment download
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}
