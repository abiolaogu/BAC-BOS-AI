package service

import (
	"crypto/tls"
	"fmt"
	"strings"
	"time"

	"nexus-mail-service/config"
	"nexus-mail-service/internal/model"
	"nexus-mail-service/internal/repository"

	"github.com/emersion/go-imap/v2"
	"github.com/emersion/go-imap/v2/imapserver"
	"github.com/rs/zerolog/log"
)

// IMAPServer represents the IMAP server
type IMAPServer struct {
	config     *config.Config
	server     *imapserver.Server
	emailRepo  *repository.EmailRepository
	folderRepo *repository.FolderRepository
}

// NewIMAPServer creates a new IMAP server
func NewIMAPServer(
	cfg *config.Config,
	emailRepo *repository.EmailRepository,
	folderRepo *repository.FolderRepository,
) *IMAPServer {
	s := &IMAPServer{
		config:     cfg,
		emailRepo:  emailRepo,
		folderRepo: folderRepo,
	}

	options := &imapserver.Options{
		NewSession: s.newSession,
	}

	server := imapserver.New(options)

	if cfg.IMAP.TLSEnabled && cfg.IMAP.CertFile != "" && cfg.IMAP.KeyFile != "" {
		cert, err := tls.LoadX509KeyPair(cfg.IMAP.CertFile, cfg.IMAP.KeyFile)
		if err == nil {
			server.TLSConfig = &tls.Config{
				Certificates: []tls.Certificate{cert},
			}
		}
	}

	s.server = server

	return s
}

// Start starts the IMAP server
func (s *IMAPServer) Start() error {
	addr := fmt.Sprintf("%s:%s", s.config.IMAP.Host, s.config.IMAP.Port)
	log.Info().Str("addr", addr).Msg("Starting IMAP server")

	listener, err := s.server.Listen(addr)
	if err != nil {
		return err
	}

	return s.server.Serve(listener)
}

// Stop stops the IMAP server
func (s *IMAPServer) Stop() error {
	log.Info().Msg("Stopping IMAP server")
	return s.server.Close()
}

// newSession creates a new IMAP session
func (s *IMAPServer) newSession(conn *imapserver.Conn) (imapserver.Session, error) {
	return &IMAPSession{
		server: s,
		conn:   conn,
	}, nil
}

// IMAPSession implements imapserver.Session
type IMAPSession struct {
	server   *IMAPServer
	conn     *imapserver.Conn
	userID   string
	username string
}

// Login authenticates the user
func (s *IMAPSession) Login(username, password string) error {
	// TODO: Implement proper authentication with user database
	// For now, accept all logins in development
	s.username = username
	s.userID = username

	log.Info().Str("username", username).Msg("IMAP login successful")
	return nil
}

// Select selects a mailbox
func (s *IMAPSession) Select(mailbox string, options *imap.SelectOptions) (*imap.SelectData, error) {
	if s.userID == "" {
		return nil, fmt.Errorf("not authenticated")
	}

	// Map IMAP mailbox names to folder types
	folderType := s.mapMailboxToFolderType(mailbox)

	folder, err := s.server.folderRepo.GetByType(folderType, s.userID)
	if err != nil {
		// Try getting by name for custom folders
		folders, _ := s.server.folderRepo.List(s.userID)
		for _, f := range folders {
			if strings.EqualFold(f.Name, mailbox) {
				folder = &f
				break
			}
		}
		if folder == nil {
			return nil, fmt.Errorf("mailbox not found")
		}
	}

	// Get email count
	emails, total, err := s.server.emailRepo.List(s.userID, folder.ID, 1, 1000, nil)
	if err != nil {
		return nil, err
	}

	// Count unread
	unreadCount := 0
	for _, email := range emails {
		if !email.IsRead {
			unreadCount++
		}
	}

	selectData := &imap.SelectData{
		Flags: []imap.Flag{
			imap.FlagSeen,
			imap.FlagAnswered,
			imap.FlagFlagged,
			imap.FlagDeleted,
			imap.FlagDraft,
		},
		NumMessages: uint32(total),
		UIDNext:     imap.UID(total + 1),
		UIDValidity: 1,
	}

	log.Info().
		Str("mailbox", mailbox).
		Int("messages", total).
		Int("unread", unreadCount).
		Msg("IMAP mailbox selected")

	return selectData, nil
}

// List lists mailboxes
func (s *IMAPSession) List(w *imapserver.ListWriter, ref string, patterns []string, options *imap.ListOptions) error {
	if s.userID == "" {
		return fmt.Errorf("not authenticated")
	}

	folders, err := s.server.folderRepo.List(s.userID)
	if err != nil {
		return err
	}

	for _, folder := range folders {
		mailboxName := s.mapFolderTypeToMailbox(folder.Type, folder.Name)

		// Check if matches pattern
		matches := false
		if len(patterns) == 0 || patterns[0] == "*" || patterns[0] == "%" {
			matches = true
		} else {
			for _, pattern := range patterns {
				if matchPattern(mailboxName, pattern) {
					matches = true
					break
				}
			}
		}

		if matches {
			data := &imap.ListData{
				Mailbox: mailboxName,
				Attrs:   []imap.MailboxAttr{},
			}

			// Set special attributes
			switch folder.Type {
			case "inbox":
				data.Attrs = append(data.Attrs, imap.MailboxAttrInbox)
			case "sent":
				data.Attrs = append(data.Attrs, imap.MailboxAttrSent)
			case "drafts":
				data.Attrs = append(data.Attrs, imap.MailboxAttrDrafts)
			case "trash":
				data.Attrs = append(data.Attrs, imap.MailboxAttrTrash)
			case "spam":
				data.Attrs = append(data.Attrs, imap.MailboxAttrJunk)
			}

			w.WriteList(data)
		}
	}

	return nil
}

// Fetch fetches messages
func (s *IMAPSession) Fetch(w *imapserver.FetchWriter, numSet imap.NumSet, options *imap.FetchOptions) error {
	if s.userID == "" {
		return fmt.Errorf("not authenticated")
	}

	// This is a simplified implementation
	// In production, you'd need to properly handle sequence numbers, UIDs, etc.

	log.Info().Msg("IMAP FETCH request")
	return nil
}

// Store modifies message flags
func (s *IMAPSession) Store(w *imapserver.FetchWriter, numSet imap.NumSet, flags *imap.StoreFlags, options *imap.StoreOptions) error {
	if s.userID == "" {
		return fmt.Errorf("not authenticated")
	}

	log.Info().Msg("IMAP STORE request")
	return nil
}

// Expunge permanently removes messages marked for deletion
func (s *IMAPSession) Expunge(w *imapserver.ExpungeWriter, uidSet *imap.UIDSet) error {
	if s.userID == "" {
		return fmt.Errorf("not authenticated")
	}

	log.Info().Msg("IMAP EXPUNGE request")
	return nil
}

// Create creates a new mailbox
func (s *IMAPSession) Create(mailbox string, options *imap.CreateOptions) error {
	if s.userID == "" {
		return fmt.Errorf("not authenticated")
	}

	folder := &model.Folder{
		UserID: s.userID,
		Name:   mailbox,
		Type:   "custom",
		Icon:   "folder",
		Color:  "#757575",
	}

	err := s.server.folderRepo.Create(folder)
	if err != nil {
		return err
	}

	log.Info().Str("mailbox", mailbox).Msg("IMAP mailbox created")
	return nil
}

// Delete deletes a mailbox
func (s *IMAPSession) Delete(mailbox string) error {
	if s.userID == "" {
		return fmt.Errorf("not authenticated")
	}

	// Find folder by name
	folders, err := s.server.folderRepo.List(s.userID)
	if err != nil {
		return err
	}

	for _, folder := range folders {
		if strings.EqualFold(folder.Name, mailbox) && folder.Type == "custom" {
			return s.server.folderRepo.Delete(folder.ID, s.userID)
		}
	}

	return fmt.Errorf("mailbox not found or cannot be deleted")
}

// Rename renames a mailbox
func (s *IMAPSession) Rename(existingMailbox, newMailbox string) error {
	if s.userID == "" {
		return fmt.Errorf("not authenticated")
	}

	// Find folder by name
	folders, err := s.server.folderRepo.List(s.userID)
	if err != nil {
		return err
	}

	for _, folder := range folders {
		if strings.EqualFold(folder.Name, existingMailbox) && folder.Type == "custom" {
			folder.Name = newMailbox
			return s.server.folderRepo.Update(&folder)
		}
	}

	return fmt.Errorf("mailbox not found")
}

// Close closes the session
func (s *IMAPSession) Close() error {
	log.Info().Str("username", s.username).Msg("IMAP session closed")
	return nil
}

// Helper functions

func (s *IMAPSession) mapMailboxToFolderType(mailbox string) string {
	mailboxLower := strings.ToLower(mailbox)
	switch mailboxLower {
	case "inbox":
		return "inbox"
	case "sent", "sent items", "sent mail":
		return "sent"
	case "drafts":
		return "drafts"
	case "trash", "deleted items", "deleted":
		return "trash"
	case "spam", "junk", "junk mail":
		return "spam"
	case "starred", "flagged":
		return "starred"
	default:
		return "custom"
	}
}

func (s *IMAPSession) mapFolderTypeToMailbox(folderType, folderName string) string {
	switch folderType {
	case "inbox":
		return "INBOX"
	case "sent":
		return "Sent"
	case "drafts":
		return "Drafts"
	case "trash":
		return "Trash"
	case "spam":
		return "Spam"
	case "starred":
		return "Starred"
	default:
		return folderName
	}
}

func matchPattern(name, pattern string) bool {
	// Simple pattern matching for IMAP LIST command
	// * matches any sequence of characters
	// % matches any sequence of characters except delimiter
	if pattern == "*" || pattern == "%" {
		return true
	}

	pattern = strings.ReplaceAll(pattern, "*", ".*")
	pattern = strings.ReplaceAll(pattern, "%", "[^/]*")

	// Simple case-insensitive comparison
	return strings.Contains(strings.ToLower(name), strings.ToLower(strings.ReplaceAll(pattern, ".*", "")))
}
