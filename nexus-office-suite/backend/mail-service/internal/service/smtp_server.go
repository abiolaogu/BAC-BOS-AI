package service

import (
	"crypto/tls"
	"fmt"
	"io"
	"strings"
	"time"

	"nexus-mail-service/config"
	"nexus-mail-service/internal/model"
	"nexus-mail-service/internal/repository"

	"github.com/emersion/go-smtp"
	"github.com/jhillyerd/enmime"
	"github.com/rs/zerolog/log"
)

// SMTPServer represents the SMTP server
type SMTPServer struct {
	config           *config.Config
	server           *smtp.Server
	emailRepo        *repository.EmailRepository
	folderRepo       *repository.FolderRepository
	emailService     *EmailService
	spamFilter       *SpamFilter
}

// NewSMTPServer creates a new SMTP server
func NewSMTPServer(
	cfg *config.Config,
	emailRepo *repository.EmailRepository,
	folderRepo *repository.FolderRepository,
	emailService *EmailService,
	spamFilter *SpamFilter,
) *SMTPServer {
	s := &SMTPServer{
		config:       cfg,
		emailRepo:    emailRepo,
		folderRepo:   folderRepo,
		emailService: emailService,
		spamFilter:   spamFilter,
	}

	server := smtp.NewServer(&Backend{smtpServer: s})
	server.Addr = fmt.Sprintf("%s:%s", cfg.SMTP.Host, cfg.SMTP.Port)
	server.Domain = cfg.SMTP.Domain
	server.MaxMessageBytes = int(cfg.SMTP.MaxMessageSize)
	server.MaxRecipients = cfg.Email.MaxRecipientsPerEmail
	server.AllowInsecureAuth = !cfg.SMTP.TLSEnabled
	server.ReadTimeout = 10 * time.Second
	server.WriteTimeout = 10 * time.Second

	if cfg.SMTP.TLSEnabled && cfg.SMTP.CertFile != "" && cfg.SMTP.KeyFile != "" {
		cert, err := tls.LoadX509KeyPair(cfg.SMTP.CertFile, cfg.SMTP.KeyFile)
		if err == nil {
			server.TLSConfig = &tls.Config{
				Certificates: []tls.Certificate{cert},
			}
		}
	}

	s.server = server

	return s
}

// Start starts the SMTP server
func (s *SMTPServer) Start() error {
	log.Info().Str("addr", s.server.Addr).Msg("Starting SMTP server")
	return s.server.ListenAndServe()
}

// Stop stops the SMTP server
func (s *SMTPServer) Stop() error {
	log.Info().Msg("Stopping SMTP server")
	return s.server.Close()
}

// Backend implements smtp.Backend
type Backend struct {
	smtpServer *SMTPServer
}

// NewSession creates a new SMTP session
func (b *Backend) NewSession(c *smtp.Conn) (smtp.Session, error) {
	return &Session{
		backend: b,
		conn:    c,
	}, nil
}

// Session implements smtp.Session
type Session struct {
	backend *Backend
	conn    *smtp.Conn
	from    string
	to      []string
}

// AuthPlain authenticates using PLAIN mechanism
func (s *Session) AuthPlain(username, password string) error {
	// TODO: Implement authentication with user database
	// For now, accept all authentication attempts in development
	log.Info().Str("username", username).Msg("SMTP authentication attempt")
	return nil
}

// Mail sets the sender for the email
func (s *Session) Mail(from string, opts *smtp.MailOptions) error {
	s.from = from
	log.Debug().Str("from", from).Msg("SMTP MAIL FROM")
	return nil
}

// Rcpt adds a recipient for the email
func (s *Session) Rcpt(to string, opts *smtp.RcptOptions) error {
	s.to = append(s.to, to)
	log.Debug().Str("to", to).Msg("SMTP RCPT TO")
	return nil
}

// Data receives the email data
func (s *Session) Data(r io.Reader) error {
	// Parse the email
	envelope, err := enmime.ReadEnvelope(r)
	if err != nil {
		log.Error().Err(err).Msg("Failed to parse email")
		return err
	}

	// Extract email details
	email := &model.Email{
		From:     s.from,
		FromName: extractName(envelope.GetHeader("From")),
		To:       model.StringArray(s.to),
		Subject:  envelope.GetHeader("Subject"),
		Body:     envelope.Text,
		BodyHTML: envelope.HTML,
		Priority: "normal",
		Headers:  make(model.Headers),
	}

	// Extract CC and BCC
	if cc := envelope.GetHeader("Cc"); cc != "" {
		email.CC = model.StringArray(parseEmailList(cc))
	}
	if bcc := envelope.GetHeader("Bcc"); bcc != "" {
		email.BCC = model.StringArray(parseEmailList(bcc))
	}

	// Extract message headers
	for key, values := range envelope.Header {
		email.Headers[key] = values
	}

	// Set Message-ID if present
	if msgID := envelope.GetHeader("Message-ID"); msgID != "" {
		email.MessageID = msgID
	}

	// Handle In-Reply-To for threading
	if inReplyTo := envelope.GetHeader("In-Reply-To"); inReplyTo != "" {
		email.InReplyTo = &inReplyTo
		// Try to find the parent email to get thread ID
		// For now, use In-Reply-To as thread ID
		email.ThreadID = inReplyTo
	}

	// Handle References
	if references := envelope.GetHeader("References"); references != "" {
		email.References = model.StringArray(strings.Fields(references))
	}

	// Calculate email size
	email.Size = int64(len(envelope.Text) + len(envelope.HTML))

	// Check for attachments
	if len(envelope.Attachments) > 0 || len(envelope.Inlines) > 0 {
		email.HasAttachments = true
		email.Attachments = []model.Attachment{}

		// Process attachments
		for _, att := range envelope.Attachments {
			email.Size += int64(len(att.Content))
			// Attachments will be saved by EmailService
		}
	}

	// Determine recipient user ID from "To" address
	// In a real system, you'd look up the user from the email address
	userID := s.getUserIDFromEmail(s.to[0])

	// Get inbox folder for the user
	inbox, err := s.backend.smtpServer.folderRepo.GetByType("inbox", userID)
	if err != nil {
		log.Error().Err(err).Str("userID", userID).Msg("Failed to get inbox folder")
		return err
	}

	email.UserID = userID
	email.FolderID = inbox.ID
	email.IsRead = false
	email.ReceivedAt = time.Now()

	// Run spam filter if enabled
	if s.backend.smtpServer.config.Security.EnableSpamFilter {
		spamScore, isSpam := s.backend.smtpServer.spamFilter.CheckSpam(email)
		email.SpamScore = spamScore
		email.IsSpam = isSpam

		if isSpam {
			// Move to spam folder
			spam, err := s.backend.smtpServer.folderRepo.GetByType("spam", userID)
			if err == nil {
				email.FolderID = spam.ID
			}
		}
	}

	// Save email to database
	err = s.backend.smtpServer.emailRepo.Create(email)
	if err != nil {
		log.Error().Err(err).Msg("Failed to save email")
		return err
	}

	// Process and save attachments
	if len(envelope.Attachments) > 0 {
		for _, att := range envelope.Attachments {
			attachment := &model.Attachment{
				EmailID:     email.ID,
				Filename:    att.FileName,
				ContentType: att.ContentType,
				Size:        int64(len(att.Content)),
				IsInline:    false,
			}

			// Save attachment to storage (MinIO/S3)
			storagePath, err := s.backend.smtpServer.emailService.SaveAttachment(email.ID, att.FileName, att.Content)
			if err == nil {
				attachment.StoragePath = storagePath
				s.backend.smtpServer.emailRepo.CreateAttachment(attachment)
			}
		}
	}

	// Process inline images
	if len(envelope.Inlines) > 0 {
		for _, inline := range envelope.Inlines {
			attachment := &model.Attachment{
				EmailID:     email.ID,
				Filename:    inline.FileName,
				ContentType: inline.ContentType,
				Size:        int64(len(inline.Content)),
				IsInline:    true,
			}

			if inline.ContentID != "" {
				attachment.ContentID = &inline.ContentID
			}

			// Save inline attachment
			storagePath, err := s.backend.smtpServer.emailService.SaveAttachment(email.ID, inline.FileName, inline.Content)
			if err == nil {
				attachment.StoragePath = storagePath
				s.backend.smtpServer.emailRepo.CreateAttachment(attachment)
			}
		}
	}

	log.Info().
		Str("emailID", email.ID).
		Str("from", email.From).
		Strs("to", email.To).
		Str("subject", email.Subject).
		Msg("Email received and processed")

	return nil
}

// Reset resets the session state
func (s *Session) Reset() {
	s.from = ""
	s.to = []string{}
}

// Logout closes the session
func (s *Session) Logout() error {
	return nil
}

// Helper functions

func (s *Session) getUserIDFromEmail(email string) string {
	// In a real system, look up user ID from email address in database
	// For now, extract username from email
	parts := strings.Split(email, "@")
	if len(parts) > 0 {
		return parts[0]
	}
	return "default-user"
}

func extractName(fromHeader string) string {
	// Extract name from "Name <email@domain.com>" format
	if idx := strings.Index(fromHeader, "<"); idx > 0 {
		name := strings.TrimSpace(fromHeader[:idx])
		// Remove quotes if present
		name = strings.Trim(name, "\"")
		return name
	}
	return ""
}

func parseEmailList(emails string) []string {
	// Simple email list parser
	parts := strings.Split(emails, ",")
	result := []string{}
	for _, part := range parts {
		part = strings.TrimSpace(part)
		// Extract email from "Name <email>" format
		if idx := strings.Index(part, "<"); idx >= 0 {
			if endIdx := strings.Index(part, ">"); endIdx > idx {
				part = part[idx+1 : endIdx]
			}
		}
		if part != "" {
			result = append(result, part)
		}
	}
	return result
}
