package service

import (
	"bytes"
	"context"
	"fmt"
	"time"

	"nexus-mail-service/config"
	"nexus-mail-service/internal/model"
	"nexus-mail-service/internal/repository"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/rs/zerolog/log"
	"gopkg.in/gomail.v2"
)

// EmailService handles email business logic
type EmailService struct {
	config      *config.Config
	emailRepo   *repository.EmailRepository
	folderRepo  *repository.FolderRepository
	minioClient *minio.Client
}

// NewEmailService creates a new email service
func NewEmailService(
	cfg *config.Config,
	emailRepo *repository.EmailRepository,
	folderRepo *repository.FolderRepository,
) (*EmailService, error) {
	// Initialize MinIO client for attachments
	minioClient, err := minio.New(cfg.Storage.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.Storage.AccessKeyID, cfg.Storage.SecretAccessKey, ""),
		Secure: cfg.Storage.UseSSL,
		Region: cfg.Storage.Region,
	})
	if err != nil {
		log.Warn().Err(err).Msg("Failed to initialize MinIO client")
	}

	// Ensure bucket exists
	if minioClient != nil {
		ctx := context.Background()
		exists, err := minioClient.BucketExists(ctx, cfg.Storage.BucketName)
		if err == nil && !exists {
			err = minioClient.MakeBucket(ctx, cfg.Storage.BucketName, minio.MakeBucketOptions{Region: cfg.Storage.Region})
			if err != nil {
				log.Warn().Err(err).Msg("Failed to create bucket")
			}
		}
	}

	return &EmailService{
		config:      cfg,
		emailRepo:   emailRepo,
		folderRepo:  folderRepo,
		minioClient: minioClient,
	}, nil
}

// SendEmail sends an email
func (s *EmailService) SendEmail(userID string, req *model.ComposeEmailRequest) (*model.Email, error) {
	// Get sent folder
	sentFolder, err := s.folderRepo.GetByType("sent", userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get sent folder: %w", err)
	}

	// Get user profile
	userProfile, err := s.getUserProfile(userID)
	fromName := userID
	fromEmail := fmt.Sprintf("%s@nexusmail.local", userID)

	if err == nil && userProfile != nil {
		if userProfile.FirstName != "" || userProfile.LastName != "" {
			fromName = fmt.Sprintf("%s %s", userProfile.FirstName, userProfile.LastName)
		}
		// Optionally use user's real email if configured, but for internal mail service we might want to stick to internal domain
		// or use the user's username/email prefix.
		// For now, we keep the internal domain logic but update the name.
	} else {
		log.Warn().Err(err).Str("userID", userID).Msg("Failed to fetch user profile, using defaults")
	}

	// Create email object
	email := &model.Email{
		ID:             uuid.New().String(),
		UserID:         userID,
		From:           fromEmail,
		FromName:       fromName,
		To:             model.StringArray(req.To),
		CC:             model.StringArray(req.CC),
		BCC:            model.StringArray(req.BCC),
		Subject:        req.Subject,
		Body:           req.Body,
		BodyHTML:       req.BodyHTML,
		FolderID:       sentFolder.ID,
		IsRead:         true,
		IsDraft:        false,
		HasAttachments: len(req.Attachments) > 0,
		Priority:       req.Priority,
		SentAt:         nil,
		ScheduledAt:    req.ScheduledAt,
		Headers:        make(model.Headers),
	}

	if email.Priority == "" {
		email.Priority = "normal"
	}

	// Handle threading (reply/forward)
	if req.InReplyTo != "" {
		email.InReplyTo = &req.InReplyTo
		email.ThreadID = req.InReplyTo
		email.References = model.StringArray(req.References)
	}

	// Calculate size
	email.Size = int64(len(email.Body) + len(email.BodyHTML))

	// If scheduled, save as draft
	if req.ScheduledAt != nil && req.ScheduledAt.After(time.Now()) {
		draftsFolder, _ := s.folderRepo.GetByType("drafts", userID)
		if draftsFolder != nil {
			email.FolderID = draftsFolder.ID
			email.IsDraft = true
		}
	}

	// Save to database
	err = s.emailRepo.Create(email)
	if err != nil {
		return nil, fmt.Errorf("failed to save email: %w", err)
	}

	// Send email (if not scheduled)
	if req.ScheduledAt == nil || req.ScheduledAt.Before(time.Now()) {
		// Send asynchronously to improve performance
		go func(e *model.Email) {
			err := s.sendViaSMTP(e)
			if err != nil {
				log.Error().Err(err).Msg("Failed to send email via SMTP")
			} else {
				now := time.Now()
				e.SentAt = &now
				s.emailRepo.Update(e)
			}
		}(email)
	}

	log.Info().
		Str("emailID", email.ID).
		Str("from", email.From).
		Strs("to", email.To).
		Str("subject", email.Subject).
		Msg("Email sent successfully")

	return email, nil
}

// sendViaSMTP sends email via external SMTP (for outgoing mail)
func (s *EmailService) sendViaSMTP(email *model.Email) error {
	m := gomail.NewMessage()
	m.SetHeader("From", email.From)
	m.SetHeader("To", email.To...)
	if len(email.CC) > 0 {
		m.SetHeader("Cc", email.CC...)
	}
	if len(email.BCC) > 0 {
		m.SetHeader("Bcc", email.BCC...)
	}
	m.SetHeader("Subject", email.Subject)

	if email.BodyHTML != "" {
		m.SetBody("text/html", email.BodyHTML)
		if email.Body != "" {
			m.AddAlternative("text/plain", email.Body)
		}
	} else {
		m.SetBody("text/plain", email.Body)
	}

	// Set priority
	switch email.Priority {
	case "high":
		m.SetHeader("X-Priority", "1")
	case "low":
		m.SetHeader("X-Priority", "5")
	}

	// In production, configure proper SMTP credentials for outgoing mail
	// For now, this is a placeholder
	d := gomail.NewDialer(s.config.SMTP.Host, 587, "", "")

	// Send email
	if err := d.DialAndSend(m); err != nil {
		return err
	}

	return nil
}

// SaveDraft saves an email as a draft
func (s *EmailService) SaveDraft(userID string, req *model.ComposeEmailRequest) (*model.Email, error) {
	draftsFolder, err := s.folderRepo.GetByType("drafts", userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get drafts folder: %w", err)
	}

	email := &model.Email{
		UserID:         userID,
		From:           fmt.Sprintf("%s@nexusmail.local", userID),
		FromName:       userID,
		To:             model.StringArray(req.To),
		CC:             model.StringArray(req.CC),
		BCC:            model.StringArray(req.BCC),
		Subject:        req.Subject,
		Body:           req.Body,
		BodyHTML:       req.BodyHTML,
		FolderID:       draftsFolder.ID,
		IsDraft:        true,
		IsRead:         true,
		HasAttachments: len(req.Attachments) > 0,
		Priority:       req.Priority,
	}

	err = s.emailRepo.Create(email)
	if err != nil {
		return nil, fmt.Errorf("failed to save draft: %w", err)
	}

	log.Info().Str("emailID", email.ID).Msg("Draft saved successfully")
	return email, nil
}

// GetEmail retrieves an email by ID
func (s *EmailService) GetEmail(emailID, userID string) (*model.Email, error) {
	return s.emailRepo.GetByID(emailID, userID)
}

// ListEmails lists emails with pagination and filtering
func (s *EmailService) ListEmails(userID, folderID string, page, pageSize int, filters map[string]interface{}) (*model.EmailListResponse, error) {
	emails, total, err := s.emailRepo.List(userID, folderID, page, pageSize, filters)
	if err != nil {
		return nil, err
	}

	hasMore := (page * pageSize) < total

	return &model.EmailListResponse{
		Emails:   emails,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		HasMore:  hasMore,
	}, nil
}

// SearchEmails searches emails
func (s *EmailService) SearchEmails(userID string, req *model.SearchEmailRequest) (*model.EmailListResponse, error) {
	emails, total, err := s.emailRepo.Search(userID, req.Query, req.Page, req.PageSize)
	if err != nil {
		return nil, err
	}

	hasMore := (req.Page * req.PageSize) < total

	return &model.EmailListResponse{
		Emails:   emails,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
		HasMore:  hasMore,
	}, nil
}

// MarkAsRead marks an email as read
func (s *EmailService) MarkAsRead(emailID, userID string, isRead bool) error {
	return s.emailRepo.MarkAsRead(emailID, userID, isRead)
}

// MarkAsStarred marks an email as starred
func (s *EmailService) MarkAsStarred(emailID, userID string, isStarred bool) error {
	return s.emailRepo.MarkAsStarred(emailID, userID, isStarred)
}

// MoveToFolder moves an email to a different folder
func (s *EmailService) MoveToFolder(emailID, userID, folderID string) error {
	return s.emailRepo.MoveToFolder(emailID, userID, folderID)
}

// DeleteEmail soft deletes an email (moves to trash)
func (s *EmailService) DeleteEmail(emailID, userID string) error {
	// Get trash folder
	trashFolder, err := s.folderRepo.GetByType("trash", userID)
	if err != nil {
		return fmt.Errorf("failed to get trash folder: %w", err)
	}

	// Move to trash
	return s.emailRepo.MoveToFolder(emailID, userID, trashFolder.ID)
}

// PermanentDelete permanently deletes an email
func (s *EmailService) PermanentDelete(emailID, userID string) error {
	return s.emailRepo.PermanentDelete(emailID, userID)
}

// GetThread retrieves all emails in a thread
func (s *EmailService) GetThread(threadID, userID string) ([]model.Email, error) {
	return s.emailRepo.GetThread(threadID, userID)
}

// BulkAction performs bulk actions on multiple emails
func (s *EmailService) BulkAction(userID string, req *model.BulkActionRequest) error {
	switch req.Action {
	case "mark_read":
		return s.emailRepo.BulkMarkAsRead(req.EmailIDs, userID, true)
	case "mark_unread":
		return s.emailRepo.BulkMarkAsRead(req.EmailIDs, userID, false)
	case "delete":
		// Move to trash
		trashFolder, err := s.folderRepo.GetByType("trash", userID)
		if err != nil {
			return err
		}
		for _, emailID := range req.EmailIDs {
			s.emailRepo.MoveToFolder(emailID, userID, trashFolder.ID)
		}
		return nil
	case "move":
		if req.FolderID == "" {
			return fmt.Errorf("folder_id required for move action")
		}
		for _, emailID := range req.EmailIDs {
			s.emailRepo.MoveToFolder(emailID, userID, req.FolderID)
		}
		return nil
	case "add_label":
		for _, emailID := range req.EmailIDs {
			for _, labelID := range req.LabelIDs {
				s.emailRepo.AddLabel(emailID, labelID)
			}
		}
		return nil
	default:
		return fmt.Errorf("unsupported action: %s", req.Action)
	}
}

// SaveAttachment saves an attachment to MinIO/S3
func (s *EmailService) SaveAttachment(emailID, filename string, data []byte) (string, error) {
	if s.minioClient == nil {
		return "", fmt.Errorf("storage not configured")
	}

	objectName := fmt.Sprintf("%s/%s/%s", emailID, uuid.New().String(), filename)

	ctx := context.Background()
	_, err := s.minioClient.PutObject(
		ctx,
		s.config.Storage.BucketName,
		objectName,
		bytes.NewReader(data),
		int64(len(data)),
		minio.PutObjectOptions{},
	)

	if err != nil {
		return "", err
	}

	return objectName, nil
}

// GetAttachment retrieves an attachment from MinIO/S3
func (s *EmailService) GetAttachment(storagePath string) ([]byte, error) {
	if s.minioClient == nil {
		return nil, fmt.Errorf("storage not configured")
	}

	ctx := context.Background()
	object, err := s.minioClient.GetObject(ctx, s.config.Storage.BucketName, storagePath, minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	defer object.Close()

	buf := new(bytes.Buffer)
	_, err = buf.ReadFrom(object)
	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}
