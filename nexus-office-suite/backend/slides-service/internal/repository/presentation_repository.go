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

type PresentationRepository interface {
	Create(ctx context.Context, presentation *model.Presentation) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Presentation, error)
	GetByTenant(ctx context.Context, tenantID, userID uuid.UUID) ([]*model.Presentation, error)
	Update(ctx context.Context, presentation *model.Presentation) error
	Delete(ctx context.Context, id uuid.UUID) error
	UpdateSlideCount(ctx context.Context, presentationID uuid.UUID, delta int) error
	Search(ctx context.Context, tenantID uuid.UUID, query string) ([]*model.Presentation, error)
}

type presentationRepository struct {
	db *sqlx.DB
}

func NewPresentationRepository(db *sqlx.DB) PresentationRepository {
	return &presentationRepository{db: db}
}

func (r *presentationRepository) Create(ctx context.Context, presentation *model.Presentation) error {
	query := `
		INSERT INTO presentations (
			id, tenant_id, owner_id, title, description, theme_id,
			slide_count, width, height, is_public, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
		)
	`

	_, err := r.db.ExecContext(ctx, query,
		presentation.ID, presentation.TenantID, presentation.OwnerID,
		presentation.Title, presentation.Description, presentation.ThemeID,
		presentation.SlideCount, presentation.Width, presentation.Height,
		presentation.IsPublic, presentation.CreatedAt, presentation.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create presentation: %w", err)
	}

	return nil
}

func (r *presentationRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Presentation, error) {
	var presentation model.Presentation
	query := `SELECT * FROM presentations WHERE id = $1`

	err := r.db.GetContext(ctx, &presentation, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("presentation not found")
		}
		return nil, fmt.Errorf("failed to get presentation: %w", err)
	}

	return &presentation, nil
}

func (r *presentationRepository) GetByTenant(ctx context.Context, tenantID, userID uuid.UUID) ([]*model.Presentation, error) {
	var presentations []*model.Presentation
	query := `
		SELECT * FROM presentations
		WHERE tenant_id = $1 AND (owner_id = $2 OR is_public = true)
		ORDER BY updated_at DESC
	`

	err := r.db.SelectContext(ctx, &presentations, query, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get presentations: %w", err)
	}

	return presentations, nil
}

func (r *presentationRepository) Update(ctx context.Context, presentation *model.Presentation) error {
	query := `
		UPDATE presentations SET
			title = $2, description = $3, theme_id = $4,
			is_public = $5, updated_at = $6
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query,
		presentation.ID, presentation.Title, presentation.Description,
		presentation.ThemeID, presentation.IsPublic, time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to update presentation: %w", err)
	}

	return nil
}

func (r *presentationRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM presentations WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete presentation: %w", err)
	}

	return nil
}

func (r *presentationRepository) UpdateSlideCount(ctx context.Context, presentationID uuid.UUID, delta int) error {
	query := `
		UPDATE presentations
		SET slide_count = slide_count + $2, updated_at = $3
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query, presentationID, delta, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update slide count: %w", err)
	}

	return nil
}

func (r *presentationRepository) Search(ctx context.Context, tenantID uuid.UUID, query string) ([]*model.Presentation, error) {
	var presentations []*model.Presentation
	searchQuery := `
		SELECT * FROM presentations
		WHERE tenant_id = $1 AND (title ILIKE $2 OR description ILIKE $2)
		ORDER BY updated_at DESC
		LIMIT 50
	`

	err := r.db.SelectContext(ctx, &presentations, searchQuery, tenantID, "%"+query+"%")
	if err != nil {
		return nil, fmt.Errorf("failed to search presentations: %w", err)
	}

	return presentations, nil
}
