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

type SlideRepository interface {
	Create(ctx context.Context, slide *model.Slide) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Slide, error)
	GetByPresentation(ctx context.Context, presentationID uuid.UUID) ([]*model.Slide, error)
	Update(ctx context.Context, slide *model.Slide) error
	Delete(ctx context.Context, id uuid.UUID) error
	Duplicate(ctx context.Context, slideID uuid.UUID) (*model.Slide, error)
	Reorder(ctx context.Context, presentationID uuid.UUID, slideIDs []uuid.UUID) error
	GetMaxOrder(ctx context.Context, presentationID uuid.UUID) (int, error)
}

type slideRepository struct {
	db *sqlx.DB
}

func NewSlideRepository(db *sqlx.DB) SlideRepository {
	return &slideRepository{db: db}
}

func (r *slideRepository) Create(ctx context.Context, slide *model.Slide) error {
	query := `
		INSERT INTO slides (
			id, presentation_id, "order", title, notes, background,
			elements, transition, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10
		)
	`

	_, err := r.db.ExecContext(ctx, query,
		slide.ID, slide.PresentationID, slide.Order, slide.Title, slide.Notes,
		slide.Background, slide.Elements, slide.Transition,
		slide.CreatedAt, slide.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create slide: %w", err)
	}

	return nil
}

func (r *slideRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Slide, error) {
	var slide model.Slide
	query := `SELECT * FROM slides WHERE id = $1`

	err := r.db.GetContext(ctx, &slide, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("slide not found")
		}
		return nil, fmt.Errorf("failed to get slide: %w", err)
	}

	return &slide, nil
}

func (r *slideRepository) GetByPresentation(ctx context.Context, presentationID uuid.UUID) ([]*model.Slide, error) {
	var slides []*model.Slide
	query := `
		SELECT * FROM slides
		WHERE presentation_id = $1
		ORDER BY "order" ASC
	`

	err := r.db.SelectContext(ctx, &slides, query, presentationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get slides: %w", err)
	}

	return slides, nil
}

func (r *slideRepository) Update(ctx context.Context, slide *model.Slide) error {
	query := `
		UPDATE slides SET
			title = $2, notes = $3, background = $4, elements = $5,
			transition = $6, updated_at = $7
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query,
		slide.ID, slide.Title, slide.Notes, slide.Background,
		slide.Elements, slide.Transition, time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to update slide: %w", err)
	}

	return nil
}

func (r *slideRepository) Delete(ctx context.Context, id uuid.UUID) error {
	// Get slide to know presentation ID and order
	slide, err := r.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Delete the slide
	query := `DELETE FROM slides WHERE id = $1`
	_, err = r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete slide: %w", err)
	}

	// Reorder remaining slides
	reorderQuery := `
		UPDATE slides
		SET "order" = "order" - 1
		WHERE presentation_id = $1 AND "order" > $2
	`
	_, err = r.db.ExecContext(ctx, reorderQuery, slide.PresentationID, slide.Order)
	if err != nil {
		return fmt.Errorf("failed to reorder slides: %w", err)
	}

	return nil
}

func (r *slideRepository) Duplicate(ctx context.Context, slideID uuid.UUID) (*model.Slide, error) {
	// Get original slide
	original, err := r.GetByID(ctx, slideID)
	if err != nil {
		return nil, err
	}

	// Create new slide with same content but new ID and order
	maxOrder, err := r.GetMaxOrder(ctx, original.PresentationID)
	if err != nil {
		return nil, err
	}

	newSlide := &model.Slide{
		ID:             uuid.New(),
		PresentationID: original.PresentationID,
		Order:          maxOrder + 1,
		Title:          original.Title,
		Notes:          original.Notes,
		Background:     original.Background,
		Elements:       original.Elements,
		Transition:     original.Transition,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := r.Create(ctx, newSlide); err != nil {
		return nil, err
	}

	return newSlide, nil
}

func (r *slideRepository) Reorder(ctx context.Context, presentationID uuid.UUID, slideIDs []uuid.UUID) error {
	// Start a transaction
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Update order for each slide
	updateQuery := `UPDATE slides SET "order" = $1, updated_at = $2 WHERE id = $3 AND presentation_id = $4`

	for i, slideID := range slideIDs {
		_, err := tx.ExecContext(ctx, updateQuery, i, time.Now(), slideID, presentationID)
		if err != nil {
			return fmt.Errorf("failed to update slide order: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (r *slideRepository) GetMaxOrder(ctx context.Context, presentationID uuid.UUID) (int, error) {
	var maxOrder int
	query := `SELECT COALESCE(MAX("order"), -1) FROM slides WHERE presentation_id = $1`

	err := r.db.GetContext(ctx, &maxOrder, query, presentationID)
	if err != nil {
		return 0, fmt.Errorf("failed to get max order: %w", err)
	}

	return maxOrder, nil
}
