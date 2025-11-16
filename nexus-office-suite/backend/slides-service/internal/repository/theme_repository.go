package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/nexus/slides-service/internal/model"
)

type ThemeRepository interface {
	Create(ctx context.Context, theme *model.Theme) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Theme, error)
	GetAll(ctx context.Context, tenantID *uuid.UUID) ([]*model.Theme, error)
	GetDefault(ctx context.Context) (*model.Theme, error)
	Update(ctx context.Context, theme *model.Theme) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type themeRepository struct {
	db *sqlx.DB
}

func NewThemeRepository(db *sqlx.DB) ThemeRepository {
	return &themeRepository{db: db}
}

func (r *themeRepository) Create(ctx context.Context, theme *model.Theme) error {
	query := `
		INSERT INTO themes (
			id, tenant_id, name, description, is_default, is_public,
			colors, fonts, layouts, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
	`

	_, err := r.db.ExecContext(ctx, query,
		theme.ID, theme.TenantID, theme.Name, theme.Description,
		theme.IsDefault, theme.IsPublic, theme.Colors, theme.Fonts,
		model.SlideLayouts(theme.Layouts), theme.CreatedAt, theme.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create theme: %w", err)
	}

	return nil
}

func (r *themeRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Theme, error) {
	var theme model.Theme
	query := `SELECT * FROM themes WHERE id = $1`

	err := r.db.GetContext(ctx, &theme, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("theme not found")
		}
		return nil, fmt.Errorf("failed to get theme: %w", err)
	}

	return &theme, nil
}

func (r *themeRepository) GetAll(ctx context.Context, tenantID *uuid.UUID) ([]*model.Theme, error) {
	var themes []*model.Theme
	var query string
	var args []interface{}

	if tenantID != nil {
		// Get tenant-specific and public themes
		query = `
			SELECT * FROM themes
			WHERE (tenant_id = $1 OR is_public = true)
			ORDER BY is_default DESC, name ASC
		`
		args = []interface{}{tenantID}
	} else {
		// Get only public themes
		query = `
			SELECT * FROM themes
			WHERE is_public = true
			ORDER BY is_default DESC, name ASC
		`
	}

	err := r.db.SelectContext(ctx, &themes, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get themes: %w", err)
	}

	return themes, nil
}

func (r *themeRepository) GetDefault(ctx context.Context) (*model.Theme, error) {
	var theme model.Theme
	query := `SELECT * FROM themes WHERE is_default = true LIMIT 1`

	err := r.db.GetContext(ctx, &theme, query)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("no default theme found")
		}
		return nil, fmt.Errorf("failed to get default theme: %w", err)
	}

	return &theme, nil
}

func (r *themeRepository) Update(ctx context.Context, theme *model.Theme) error {
	query := `
		UPDATE themes SET
			name = $2, description = $3, is_public = $4,
			colors = $5, fonts = $6, layouts = $7, updated_at = $8
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query,
		theme.ID, theme.Name, theme.Description, theme.IsPublic,
		theme.Colors, theme.Fonts, model.SlideLayouts(theme.Layouts), time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to update theme: %w", err)
	}

	return nil
}

func (r *themeRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM themes WHERE id = $1 AND is_default = false`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete theme: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("cannot delete default theme or theme not found")
	}

	return nil
}
