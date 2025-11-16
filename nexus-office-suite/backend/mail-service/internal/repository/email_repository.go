package repository

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"nexus-mail-service/internal/model"

	"github.com/google/uuid"
)

type EmailRepository struct {
	db *sql.DB
}

func NewEmailRepository(db *sql.DB) *EmailRepository {
	return &EmailRepository{db: db}
}

// Create creates a new email
func (r *EmailRepository) Create(email *model.Email) error {
	if email.ID == "" {
		email.ID = uuid.New().String()
	}
	if email.MessageID == "" {
		email.MessageID = fmt.Sprintf("<%s@nexusmail>", email.ID)
	}
	if email.ThreadID == "" {
		email.ThreadID = email.ID
	}

	now := time.Now()
	email.CreatedAt = now
	email.UpdatedAt = now
	email.ReceivedAt = now

	query := `
		INSERT INTO emails (
			id, user_id, message_id, thread_id, in_reply_to, references,
			from_address, from_name, to_addresses, cc_addresses, bcc_addresses,
			subject, body, body_html, folder_id, is_read, is_starred, is_draft,
			is_spam, is_deleted, has_attachments, priority, spam_score, size,
			received_at, sent_at, scheduled_at, headers, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
			$16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
		) RETURNING id, created_at, updated_at
	`

	return r.db.QueryRow(
		query,
		email.ID, email.UserID, email.MessageID, email.ThreadID, email.InReplyTo,
		email.References, email.From, email.FromName, email.To, email.CC, email.BCC,
		email.Subject, email.Body, email.BodyHTML, email.FolderID, email.IsRead,
		email.IsStarred, email.IsDraft, email.IsSpam, email.IsDeleted,
		email.HasAttachments, email.Priority, email.SpamScore, email.Size,
		email.ReceivedAt, email.SentAt, email.ScheduledAt, email.Headers,
		email.CreatedAt, email.UpdatedAt,
	).Scan(&email.ID, &email.CreatedAt, &email.UpdatedAt)
}

// GetByID retrieves an email by ID
func (r *EmailRepository) GetByID(emailID string, userID string) (*model.Email, error) {
	email := &model.Email{}
	query := `
		SELECT id, user_id, message_id, thread_id, in_reply_to, references,
			from_address, from_name, to_addresses, cc_addresses, bcc_addresses,
			subject, body, body_html, folder_id, is_read, is_starred, is_draft,
			is_spam, is_deleted, has_attachments, priority, spam_score, size,
			received_at, sent_at, scheduled_at, read_at, headers, created_at, updated_at
		FROM emails
		WHERE id = $1 AND user_id = $2 AND is_deleted = false
	`

	err := r.db.QueryRow(query, emailID, userID).Scan(
		&email.ID, &email.UserID, &email.MessageID, &email.ThreadID, &email.InReplyTo,
		&email.References, &email.From, &email.FromName, &email.To, &email.CC, &email.BCC,
		&email.Subject, &email.Body, &email.BodyHTML, &email.FolderID, &email.IsRead,
		&email.IsStarred, &email.IsDraft, &email.IsSpam, &email.IsDeleted,
		&email.HasAttachments, &email.Priority, &email.SpamScore, &email.Size,
		&email.ReceivedAt, &email.SentAt, &email.ScheduledAt, &email.ReadAt,
		&email.Headers, &email.CreatedAt, &email.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	// Load attachments
	email.Attachments, _ = r.GetAttachments(emailID)

	// Load labels
	email.Labels, _ = r.GetEmailLabels(emailID)

	return email, nil
}

// List retrieves emails with pagination and filtering
func (r *EmailRepository) List(userID, folderID string, page, pageSize int, filters map[string]interface{}) ([]model.Email, int, error) {
	offset := (page - 1) * pageSize

	whereClause := "WHERE user_id = $1 AND is_deleted = false"
	args := []interface{}{userID}
	argIndex := 2

	if folderID != "" {
		whereClause += fmt.Sprintf(" AND folder_id = $%d", argIndex)
		args = append(args, folderID)
		argIndex++
	}

	if isRead, ok := filters["is_read"].(bool); ok {
		whereClause += fmt.Sprintf(" AND is_read = $%d", argIndex)
		args = append(args, isRead)
		argIndex++
	}

	if isStarred, ok := filters["is_starred"].(bool); ok {
		whereClause += fmt.Sprintf(" AND is_starred = $%d", argIndex)
		args = append(args, isStarred)
		argIndex++
	}

	if hasAttachments, ok := filters["has_attachments"].(bool); ok {
		whereClause += fmt.Sprintf(" AND has_attachments = $%d", argIndex)
		args = append(args, hasAttachments)
		argIndex++
	}

	// Count total
	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM emails %s", whereClause)
	err := r.db.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get emails
	query := fmt.Sprintf(`
		SELECT id, user_id, message_id, thread_id, in_reply_to, references,
			from_address, from_name, to_addresses, cc_addresses, bcc_addresses,
			subject, body, body_html, folder_id, is_read, is_starred, is_draft,
			is_spam, is_deleted, has_attachments, priority, spam_score, size,
			received_at, sent_at, scheduled_at, read_at, headers, created_at, updated_at
		FROM emails
		%s
		ORDER BY received_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)

	args = append(args, pageSize, offset)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var emails []model.Email
	for rows.Next() {
		var email model.Email
		err := rows.Scan(
			&email.ID, &email.UserID, &email.MessageID, &email.ThreadID, &email.InReplyTo,
			&email.References, &email.From, &email.FromName, &email.To, &email.CC, &email.BCC,
			&email.Subject, &email.Body, &email.BodyHTML, &email.FolderID, &email.IsRead,
			&email.IsStarred, &email.IsDraft, &email.IsSpam, &email.IsDeleted,
			&email.HasAttachments, &email.Priority, &email.SpamScore, &email.Size,
			&email.ReceivedAt, &email.SentAt, &email.ScheduledAt, &email.ReadAt,
			&email.Headers, &email.CreatedAt, &email.UpdatedAt,
		)
		if err != nil {
			continue
		}
		emails = append(emails, email)
	}

	return emails, total, nil
}

// Update updates an email
func (r *EmailRepository) Update(email *model.Email) error {
	email.UpdatedAt = time.Now()

	query := `
		UPDATE emails SET
			folder_id = $1, is_read = $2, is_starred = $3, is_draft = $4,
			is_spam = $5, is_deleted = $6, read_at = $7, updated_at = $8
		WHERE id = $9 AND user_id = $10
	`

	_, err := r.db.Exec(
		query,
		email.FolderID, email.IsRead, email.IsStarred, email.IsDraft,
		email.IsSpam, email.IsDeleted, email.ReadAt, email.UpdatedAt,
		email.ID, email.UserID,
	)

	return err
}

// MarkAsRead marks an email as read
func (r *EmailRepository) MarkAsRead(emailID, userID string, isRead bool) error {
	var readAt *time.Time
	if isRead {
		now := time.Now()
		readAt = &now
	}

	query := `UPDATE emails SET is_read = $1, read_at = $2, updated_at = $3 WHERE id = $4 AND user_id = $5`
	_, err := r.db.Exec(query, isRead, readAt, time.Now(), emailID, userID)
	return err
}

// MarkAsStarred marks an email as starred
func (r *EmailRepository) MarkAsStarred(emailID, userID string, isStarred bool) error {
	query := `UPDATE emails SET is_starred = $1, updated_at = $2 WHERE id = $3 AND user_id = $4`
	_, err := r.db.Exec(query, isStarred, time.Now(), emailID, userID)
	return err
}

// MoveToFolder moves an email to a different folder
func (r *EmailRepository) MoveToFolder(emailID, userID, folderID string) error {
	query := `UPDATE emails SET folder_id = $1, updated_at = $2 WHERE id = $3 AND user_id = $4`
	_, err := r.db.Exec(query, folderID, time.Now(), emailID, userID)
	return err
}

// Delete soft deletes an email
func (r *EmailRepository) Delete(emailID, userID string) error {
	query := `UPDATE emails SET is_deleted = true, updated_at = $1 WHERE id = $2 AND user_id = $3`
	_, err := r.db.Exec(query, time.Now(), emailID, userID)
	return err
}

// PermanentDelete permanently deletes an email
func (r *EmailRepository) PermanentDelete(emailID, userID string) error {
	query := `DELETE FROM emails WHERE id = $1 AND user_id = $2`
	_, err := r.db.Exec(query, emailID, userID)
	return err
}

// GetThread retrieves all emails in a thread
func (r *EmailRepository) GetThread(threadID, userID string) ([]model.Email, error) {
	query := `
		SELECT id, user_id, message_id, thread_id, in_reply_to, references,
			from_address, from_name, to_addresses, cc_addresses, bcc_addresses,
			subject, body, body_html, folder_id, is_read, is_starred, is_draft,
			is_spam, is_deleted, has_attachments, priority, spam_score, size,
			received_at, sent_at, scheduled_at, read_at, headers, created_at, updated_at
		FROM emails
		WHERE thread_id = $1 AND user_id = $2 AND is_deleted = false
		ORDER BY received_at ASC
	`

	rows, err := r.db.Query(query, threadID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var emails []model.Email
	for rows.Next() {
		var email model.Email
		err := rows.Scan(
			&email.ID, &email.UserID, &email.MessageID, &email.ThreadID, &email.InReplyTo,
			&email.References, &email.From, &email.FromName, &email.To, &email.CC, &email.BCC,
			&email.Subject, &email.Body, &email.BodyHTML, &email.FolderID, &email.IsRead,
			&email.IsStarred, &email.IsDraft, &email.IsSpam, &email.IsDeleted,
			&email.HasAttachments, &email.Priority, &email.SpamScore, &email.Size,
			&email.ReceivedAt, &email.SentAt, &email.ScheduledAt, &email.ReadAt,
			&email.Headers, &email.CreatedAt, &email.UpdatedAt,
		)
		if err != nil {
			continue
		}
		emails = append(emails, email)
	}

	return emails, nil
}

// Search searches emails
func (r *EmailRepository) Search(userID, query string, page, pageSize int) ([]model.Email, int, error) {
	offset := (page - 1) * pageSize

	// Simple full-text search using PostgreSQL
	whereClause := `
		WHERE user_id = $1 AND is_deleted = false
		AND (
			subject ILIKE $2 OR
			body ILIKE $2 OR
			from_address ILIKE $2 OR
			to_addresses::text ILIKE $2
		)
	`
	searchPattern := "%" + query + "%"

	// Count total
	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM emails %s", whereClause)
	err := r.db.QueryRow(countQuery, userID, searchPattern).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get emails
	sqlQuery := fmt.Sprintf(`
		SELECT id, user_id, message_id, thread_id, in_reply_to, references,
			from_address, from_name, to_addresses, cc_addresses, bcc_addresses,
			subject, body, body_html, folder_id, is_read, is_starred, is_draft,
			is_spam, is_deleted, has_attachments, priority, spam_score, size,
			received_at, sent_at, scheduled_at, read_at, headers, created_at, updated_at
		FROM emails
		%s
		ORDER BY received_at DESC
		LIMIT $3 OFFSET $4
	`, whereClause)

	rows, err := r.db.Query(sqlQuery, userID, searchPattern, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var emails []model.Email
	for rows.Next() {
		var email model.Email
		err := rows.Scan(
			&email.ID, &email.UserID, &email.MessageID, &email.ThreadID, &email.InReplyTo,
			&email.References, &email.From, &email.FromName, &email.To, &email.CC, &email.BCC,
			&email.Subject, &email.Body, &email.BodyHTML, &email.FolderID, &email.IsRead,
			&email.IsStarred, &email.IsDraft, &email.IsSpam, &email.IsDeleted,
			&email.HasAttachments, &email.Priority, &email.SpamScore, &email.Size,
			&email.ReceivedAt, &email.SentAt, &email.ScheduledAt, &email.ReadAt,
			&email.Headers, &email.CreatedAt, &email.UpdatedAt,
		)
		if err != nil {
			continue
		}
		emails = append(emails, email)
	}

	return emails, total, nil
}

// Attachment operations

func (r *EmailRepository) CreateAttachment(attachment *model.Attachment) error {
	if attachment.ID == "" {
		attachment.ID = uuid.New().String()
	}

	query := `
		INSERT INTO attachments (id, email_id, filename, content_type, size, storage_path, content_id, is_inline, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at
	`

	return r.db.QueryRow(
		query,
		attachment.ID, attachment.EmailID, attachment.Filename, attachment.ContentType,
		attachment.Size, attachment.StoragePath, attachment.ContentID, attachment.IsInline,
		time.Now(),
	).Scan(&attachment.ID, &attachment.CreatedAt)
}

func (r *EmailRepository) GetAttachments(emailID string) ([]model.Attachment, error) {
	query := `
		SELECT id, email_id, filename, content_type, size, storage_path, content_id, is_inline, created_at
		FROM attachments
		WHERE email_id = $1
		ORDER BY created_at ASC
	`

	rows, err := r.db.Query(query, emailID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attachments []model.Attachment
	for rows.Next() {
		var att model.Attachment
		err := rows.Scan(
			&att.ID, &att.EmailID, &att.Filename, &att.ContentType,
			&att.Size, &att.StoragePath, &att.ContentID, &att.IsInline, &att.CreatedAt,
		)
		if err != nil {
			continue
		}
		attachments = append(attachments, att)
	}

	return attachments, nil
}

// Label operations

func (r *EmailRepository) AddLabel(emailID, labelID string) error {
	query := `INSERT INTO email_labels (email_id, label_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`
	_, err := r.db.Exec(query, emailID, labelID, time.Now())
	return err
}

func (r *EmailRepository) RemoveLabel(emailID, labelID string) error {
	query := `DELETE FROM email_labels WHERE email_id = $1 AND label_id = $2`
	_, err := r.db.Exec(query, emailID, labelID)
	return err
}

func (r *EmailRepository) GetEmailLabels(emailID string) ([]model.Label, error) {
	query := `
		SELECT l.id, l.user_id, l.name, l.color, l.created_at, l.updated_at
		FROM labels l
		INNER JOIN email_labels el ON l.id = el.label_id
		WHERE el.email_id = $1
	`

	rows, err := r.db.Query(query, emailID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var labels []model.Label
	for rows.Next() {
		var label model.Label
		err := rows.Scan(&label.ID, &label.UserID, &label.Name, &label.Color, &label.CreatedAt, &label.UpdatedAt)
		if err != nil {
			continue
		}
		labels = append(labels, label)
	}

	return labels, nil
}

// Bulk operations

func (r *EmailRepository) BulkMarkAsRead(emailIDs []string, userID string, isRead bool) error {
	if len(emailIDs) == 0 {
		return nil
	}

	placeholders := make([]string, len(emailIDs))
	args := make([]interface{}, len(emailIDs)+2)
	args[0] = isRead
	args[1] = userID

	for i, id := range emailIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+3)
		args[i+2] = id
	}

	query := fmt.Sprintf(`
		UPDATE emails
		SET is_read = $1, updated_at = NOW()
		WHERE user_id = $2 AND id IN (%s)
	`, strings.Join(placeholders, ","))

	_, err := r.db.Exec(query, args...)
	return err
}

func (r *EmailRepository) BulkDelete(emailIDs []string, userID string) error {
	if len(emailIDs) == 0 {
		return nil
	}

	placeholders := make([]string, len(emailIDs))
	args := make([]interface{}, len(emailIDs)+1)
	args[0] = userID

	for i, id := range emailIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+2)
		args[i+1] = id
	}

	query := fmt.Sprintf(`
		UPDATE emails
		SET is_deleted = true, updated_at = NOW()
		WHERE user_id = $1 AND id IN (%s)
	`, strings.Join(placeholders, ","))

	_, err := r.db.Exec(query, args...)
	return err
}
