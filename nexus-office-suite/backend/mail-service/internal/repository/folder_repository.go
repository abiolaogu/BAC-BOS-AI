package repository

import (
	"database/sql"
	"time"

	"nexus-mail-service/internal/model"

	"github.com/google/uuid"
)

type FolderRepository struct {
	db *sql.DB
}

func NewFolderRepository(db *sql.DB) *FolderRepository {
	return &FolderRepository{db: db}
}

// Create creates a new folder
func (r *FolderRepository) Create(folder *model.Folder) error {
	if folder.ID == "" {
		folder.ID = uuid.New().String()
	}

	now := time.Now()
	folder.CreatedAt = now
	folder.UpdatedAt = now

	query := `
		INSERT INTO folders (id, user_id, name, type, parent_id, icon, color, sort_order, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at, updated_at
	`

	return r.db.QueryRow(
		query,
		folder.ID, folder.UserID, folder.Name, folder.Type, folder.ParentID,
		folder.Icon, folder.Color, folder.Order, folder.CreatedAt, folder.UpdatedAt,
	).Scan(&folder.ID, &folder.CreatedAt, &folder.UpdatedAt)
}

// GetByID retrieves a folder by ID
func (r *FolderRepository) GetByID(folderID, userID string) (*model.Folder, error) {
	folder := &model.Folder{}
	query := `
		SELECT id, user_id, name, type, parent_id, icon, color, sort_order, created_at, updated_at
		FROM folders
		WHERE id = $1 AND user_id = $2
	`

	err := r.db.QueryRow(query, folderID, userID).Scan(
		&folder.ID, &folder.UserID, &folder.Name, &folder.Type, &folder.ParentID,
		&folder.Icon, &folder.Color, &folder.Order, &folder.CreatedAt, &folder.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	// Get counts
	folder.UnreadCount = r.GetUnreadCount(folderID, userID)
	folder.TotalCount = r.GetTotalCount(folderID, userID)

	return folder, nil
}

// GetByType retrieves a folder by type (inbox, sent, drafts, etc.)
func (r *FolderRepository) GetByType(folderType, userID string) (*model.Folder, error) {
	folder := &model.Folder{}
	query := `
		SELECT id, user_id, name, type, parent_id, icon, color, sort_order, created_at, updated_at
		FROM folders
		WHERE type = $1 AND user_id = $2
	`

	err := r.db.QueryRow(query, folderType, userID).Scan(
		&folder.ID, &folder.UserID, &folder.Name, &folder.Type, &folder.ParentID,
		&folder.Icon, &folder.Color, &folder.Order, &folder.CreatedAt, &folder.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	// Get counts
	folder.UnreadCount = r.GetUnreadCount(folder.ID, userID)
	folder.TotalCount = r.GetTotalCount(folder.ID, userID)

	return folder, nil
}

// List retrieves all folders for a user
func (r *FolderRepository) List(userID string) ([]model.Folder, error) {
	query := `
		SELECT id, user_id, name, type, parent_id, icon, color, sort_order, created_at, updated_at
		FROM folders
		WHERE user_id = $1
		ORDER BY sort_order ASC, name ASC
	`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []model.Folder
	for rows.Next() {
		var folder model.Folder
		err := rows.Scan(
			&folder.ID, &folder.UserID, &folder.Name, &folder.Type, &folder.ParentID,
			&folder.Icon, &folder.Color, &folder.Order, &folder.CreatedAt, &folder.UpdatedAt,
		)
		if err != nil {
			continue
		}

		// Get counts
		folder.UnreadCount = r.GetUnreadCount(folder.ID, userID)
		folder.TotalCount = r.GetTotalCount(folder.ID, userID)

		folders = append(folders, folder)
	}

	return folders, nil
}

// Update updates a folder
func (r *FolderRepository) Update(folder *model.Folder) error {
	folder.UpdatedAt = time.Now()

	query := `
		UPDATE folders SET
			name = $1, parent_id = $2, icon = $3, color = $4, sort_order = $5, updated_at = $6
		WHERE id = $7 AND user_id = $8
	`

	_, err := r.db.Exec(
		query,
		folder.Name, folder.ParentID, folder.Icon, folder.Color, folder.Order, folder.UpdatedAt,
		folder.ID, folder.UserID,
	)

	return err
}

// Delete deletes a folder
func (r *FolderRepository) Delete(folderID, userID string) error {
	// Don't allow deleting system folders
	var folderType string
	err := r.db.QueryRow("SELECT type FROM folders WHERE id = $1 AND user_id = $2", folderID, userID).Scan(&folderType)
	if err != nil {
		return err
	}

	if folderType != "custom" {
		return sql.ErrNoRows // Can't delete system folders
	}

	query := `DELETE FROM folders WHERE id = $1 AND user_id = $2`
	_, err = r.db.Exec(query, folderID, userID)
	return err
}

// InitializeDefaultFolders creates default folders for a new user
func (r *FolderRepository) InitializeDefaultFolders(userID string) error {
	defaultFolders := []model.Folder{
		{
			UserID: userID,
			Name:   "Inbox",
			Type:   "inbox",
			Icon:   "inbox",
			Color:  "#1976d2",
			Order:  1,
		},
		{
			UserID: userID,
			Name:   "Sent",
			Type:   "sent",
			Icon:   "send",
			Color:  "#388e3c",
			Order:  2,
		},
		{
			UserID: userID,
			Name:   "Drafts",
			Type:   "drafts",
			Icon:   "draft",
			Color:  "#f57c00",
			Order:  3,
		},
		{
			UserID: userID,
			Name:   "Trash",
			Type:   "trash",
			Icon:   "delete",
			Color:  "#d32f2f",
			Order:  4,
		},
		{
			UserID: userID,
			Name:   "Spam",
			Type:   "spam",
			Icon:   "report",
			Color:  "#c62828",
			Order:  5,
		},
		{
			UserID: userID,
			Name:   "Starred",
			Type:   "starred",
			Icon:   "star",
			Color:  "#fbc02d",
			Order:  6,
		},
	}

	for _, folder := range defaultFolders {
		err := r.Create(&folder)
		if err != nil {
			return err
		}
	}

	return nil
}

// GetUnreadCount gets the unread email count for a folder
func (r *FolderRepository) GetUnreadCount(folderID, userID string) int {
	var count int
	query := `
		SELECT COUNT(*)
		FROM emails
		WHERE folder_id = $1 AND user_id = $2 AND is_read = false AND is_deleted = false
	`
	r.db.QueryRow(query, folderID, userID).Scan(&count)
	return count
}

// GetTotalCount gets the total email count for a folder
func (r *FolderRepository) GetTotalCount(folderID, userID string) int {
	var count int
	query := `
		SELECT COUNT(*)
		FROM emails
		WHERE folder_id = $1 AND user_id = $2 AND is_deleted = false
	`
	r.db.QueryRow(query, folderID, userID).Scan(&count)
	return count
}

// Label Repository

type LabelRepository struct {
	db *sql.DB
}

func NewLabelRepository(db *sql.DB) *LabelRepository {
	return &LabelRepository{db: db}
}

// Create creates a new label
func (r *LabelRepository) Create(label *model.Label) error {
	if label.ID == "" {
		label.ID = uuid.New().String()
	}

	now := time.Now()
	label.CreatedAt = now
	label.UpdatedAt = now

	query := `
		INSERT INTO labels (id, user_id, name, color, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`

	return r.db.QueryRow(
		query,
		label.ID, label.UserID, label.Name, label.Color, label.CreatedAt, label.UpdatedAt,
	).Scan(&label.ID, &label.CreatedAt, &label.UpdatedAt)
}

// GetByID retrieves a label by ID
func (r *LabelRepository) GetByID(labelID, userID string) (*model.Label, error) {
	label := &model.Label{}
	query := `
		SELECT id, user_id, name, color, created_at, updated_at
		FROM labels
		WHERE id = $1 AND user_id = $2
	`

	err := r.db.QueryRow(query, labelID, userID).Scan(
		&label.ID, &label.UserID, &label.Name, &label.Color, &label.CreatedAt, &label.UpdatedAt,
	)

	return label, err
}

// List retrieves all labels for a user
func (r *LabelRepository) List(userID string) ([]model.Label, error) {
	query := `
		SELECT id, user_id, name, color, created_at, updated_at
		FROM labels
		WHERE user_id = $1
		ORDER BY name ASC
	`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var labels []model.Label
	for rows.Next() {
		var label model.Label
		err := rows.Scan(
			&label.ID, &label.UserID, &label.Name, &label.Color, &label.CreatedAt, &label.UpdatedAt,
		)
		if err != nil {
			continue
		}
		labels = append(labels, label)
	}

	return labels, nil
}

// Update updates a label
func (r *LabelRepository) Update(label *model.Label) error {
	label.UpdatedAt = time.Now()

	query := `
		UPDATE labels SET
			name = $1, color = $2, updated_at = $3
		WHERE id = $4 AND user_id = $5
	`

	_, err := r.db.Exec(
		query,
		label.Name, label.Color, label.UpdatedAt, label.ID, label.UserID,
	)

	return err
}

// Delete deletes a label
func (r *LabelRepository) Delete(labelID, userID string) error {
	query := `DELETE FROM labels WHERE id = $1 AND user_id = $2`
	_, err := r.db.Exec(query, labelID, userID)
	return err
}
