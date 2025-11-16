package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/nexus/slides-service/internal/model"
	"github.com/nexus/slides-service/internal/repository"
)

type PresentationService interface {
	// Presentation operations
	CreatePresentation(ctx context.Context, tenantID, userID uuid.UUID, req *model.CreatePresentationRequest) (*model.Presentation, error)
	GetPresentation(ctx context.Context, id uuid.UUID) (*model.Presentation, error)
	ListPresentations(ctx context.Context, tenantID, userID uuid.UUID) ([]*model.Presentation, error)
	UpdatePresentation(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *model.UpdatePresentationRequest) (*model.Presentation, error)
	DeletePresentation(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	SearchPresentations(ctx context.Context, tenantID uuid.UUID, query string) ([]*model.Presentation, error)
	DuplicatePresentation(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*model.Presentation, error)

	// Slide operations
	CreateSlide(ctx context.Context, userID uuid.UUID, req *model.CreateSlideRequest) (*model.Slide, error)
	GetSlide(ctx context.Context, id uuid.UUID) (*model.Slide, error)
	ListSlides(ctx context.Context, presentationID uuid.UUID) ([]*model.Slide, error)
	UpdateSlide(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *model.UpdateSlideRequest) (*model.Slide, error)
	DeleteSlide(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	DuplicateSlide(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*model.Slide, error)
	ReorderSlides(ctx context.Context, presentationID uuid.UUID, userID uuid.UUID, req *model.ReorderSlidesRequest) error

	// Theme operations
	CreateTheme(ctx context.Context, tenantID uuid.UUID, req *model.CreateThemeRequest) (*model.Theme, error)
	GetTheme(ctx context.Context, id uuid.UUID) (*model.Theme, error)
	ListThemes(ctx context.Context, tenantID *uuid.UUID) ([]*model.Theme, error)
	UpdateTheme(ctx context.Context, id uuid.UUID, req *model.UpdateThemeRequest) (*model.Theme, error)
	DeleteTheme(ctx context.Context, id uuid.UUID) error
}

type presentationService struct {
	presentationRepo repository.PresentationRepository
	slideRepo        repository.SlideRepository
	themeRepo        repository.ThemeRepository
	defaultWidth     int
	defaultHeight    int
	maxSlides        int
}

func NewPresentationService(
	presentationRepo repository.PresentationRepository,
	slideRepo repository.SlideRepository,
	themeRepo repository.ThemeRepository,
	defaultWidth, defaultHeight, maxSlides int,
) PresentationService {
	return &presentationService{
		presentationRepo: presentationRepo,
		slideRepo:        slideRepo,
		themeRepo:        themeRepo,
		defaultWidth:     defaultWidth,
		defaultHeight:    defaultHeight,
		maxSlides:        maxSlides,
	}
}

// Presentation operations

func (s *presentationService) CreatePresentation(ctx context.Context, tenantID, userID uuid.UUID, req *model.CreatePresentationRequest) (*model.Presentation, error) {
	width := s.defaultWidth
	height := s.defaultHeight

	if req.Width != nil {
		width = *req.Width
	}
	if req.Height != nil {
		height = *req.Height
	}

	presentation := &model.Presentation{
		ID:          uuid.New(),
		TenantID:    tenantID,
		OwnerID:     userID,
		Title:       req.Title,
		Description: req.Description,
		ThemeID:     req.ThemeID,
		SlideCount:  0,
		Width:       width,
		Height:      height,
		IsPublic:    false,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.presentationRepo.Create(ctx, presentation); err != nil {
		return nil, err
	}

	return presentation, nil
}

func (s *presentationService) GetPresentation(ctx context.Context, id uuid.UUID) (*model.Presentation, error) {
	return s.presentationRepo.GetByID(ctx, id)
}

func (s *presentationService) ListPresentations(ctx context.Context, tenantID, userID uuid.UUID) ([]*model.Presentation, error) {
	return s.presentationRepo.GetByTenant(ctx, tenantID, userID)
}

func (s *presentationService) UpdatePresentation(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *model.UpdatePresentationRequest) (*model.Presentation, error) {
	presentation, err := s.presentationRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if presentation.OwnerID != userID {
		return nil, fmt.Errorf("permission denied")
	}

	if req.Title != nil {
		presentation.Title = *req.Title
	}
	if req.Description != nil {
		presentation.Description = req.Description
	}
	if req.ThemeID != nil {
		presentation.ThemeID = req.ThemeID
	}
	if req.IsPublic != nil {
		presentation.IsPublic = *req.IsPublic
	}

	if err := s.presentationRepo.Update(ctx, presentation); err != nil {
		return nil, err
	}

	return presentation, nil
}

func (s *presentationService) DeletePresentation(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	presentation, err := s.presentationRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if presentation.OwnerID != userID {
		return fmt.Errorf("permission denied")
	}

	return s.presentationRepo.Delete(ctx, id)
}

func (s *presentationService) SearchPresentations(ctx context.Context, tenantID uuid.UUID, query string) ([]*model.Presentation, error) {
	return s.presentationRepo.Search(ctx, tenantID, query)
}

func (s *presentationService) DuplicatePresentation(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*model.Presentation, error) {
	// Get original presentation
	original, err := s.presentationRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Create new presentation
	newPresentation := &model.Presentation{
		ID:          uuid.New(),
		TenantID:    original.TenantID,
		OwnerID:     userID,
		Title:       original.Title + " (Copy)",
		Description: original.Description,
		ThemeID:     original.ThemeID,
		SlideCount:  0,
		Width:       original.Width,
		Height:      original.Height,
		IsPublic:    false,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.presentationRepo.Create(ctx, newPresentation); err != nil {
		return nil, err
	}

	// Duplicate all slides
	slides, err := s.slideRepo.GetByPresentation(ctx, id)
	if err != nil {
		return nil, err
	}

	for _, slide := range slides {
		newSlide := &model.Slide{
			ID:             uuid.New(),
			PresentationID: newPresentation.ID,
			Order:          slide.Order,
			Title:          slide.Title,
			Notes:          slide.Notes,
			Background:     slide.Background,
			Elements:       slide.Elements,
			Transition:     slide.Transition,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}

		if err := s.slideRepo.Create(ctx, newSlide); err != nil {
			return nil, err
		}
	}

	// Update slide count
	if err := s.presentationRepo.UpdateSlideCount(ctx, newPresentation.ID, len(slides)); err != nil {
		return nil, err
	}

	newPresentation.SlideCount = len(slides)
	return newPresentation, nil
}

// Slide operations

func (s *presentationService) CreateSlide(ctx context.Context, userID uuid.UUID, req *model.CreateSlideRequest) (*model.Slide, error) {
	// Verify presentation exists and user has access
	presentation, err := s.presentationRepo.GetByID(ctx, req.PresentationID)
	if err != nil {
		return nil, err
	}

	if presentation.OwnerID != userID {
		return nil, fmt.Errorf("permission denied")
	}

	// Check slide limit
	if presentation.SlideCount >= s.maxSlides {
		return nil, fmt.Errorf("maximum slides limit reached")
	}

	// Determine order
	order := presentation.SlideCount
	if req.Order != nil {
		order = *req.Order
	}

	// Get layout if specified
	var elements model.Elements
	if req.LayoutID != nil && presentation.ThemeID != nil {
		theme, err := s.themeRepo.GetByID(ctx, *presentation.ThemeID)
		if err == nil {
			for _, layout := range theme.Layouts {
				if layout.ID == *req.LayoutID {
					elements = layout.Elements
					break
				}
			}
		}
	}

	if elements == nil {
		elements = model.Elements{}
	}

	slide := &model.Slide{
		ID:             uuid.New(),
		PresentationID: req.PresentationID,
		Order:          order,
		Title:          req.Title,
		Background:     req.Background,
		Elements:       elements,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := s.slideRepo.Create(ctx, slide); err != nil {
		return nil, err
	}

	// Update presentation slide count
	if err := s.presentationRepo.UpdateSlideCount(ctx, req.PresentationID, 1); err != nil {
		return nil, err
	}

	return slide, nil
}

func (s *presentationService) GetSlide(ctx context.Context, id uuid.UUID) (*model.Slide, error) {
	return s.slideRepo.GetByID(ctx, id)
}

func (s *presentationService) ListSlides(ctx context.Context, presentationID uuid.UUID) ([]*model.Slide, error) {
	return s.slideRepo.GetByPresentation(ctx, presentationID)
}

func (s *presentationService) UpdateSlide(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *model.UpdateSlideRequest) (*model.Slide, error) {
	slide, err := s.slideRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Verify user has access to presentation
	presentation, err := s.presentationRepo.GetByID(ctx, slide.PresentationID)
	if err != nil {
		return nil, err
	}

	if presentation.OwnerID != userID {
		return nil, fmt.Errorf("permission denied")
	}

	// Update fields
	if req.Title != nil {
		slide.Title = req.Title
	}
	if req.Notes != nil {
		slide.Notes = req.Notes
	}
	if req.Background != nil {
		slide.Background = req.Background
	}
	if req.Elements != nil {
		slide.Elements = *req.Elements
	}
	if req.Transition != nil {
		slide.Transition = req.Transition
	}

	if err := s.slideRepo.Update(ctx, slide); err != nil {
		return nil, err
	}

	return slide, nil
}

func (s *presentationService) DeleteSlide(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	slide, err := s.slideRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Verify user has access
	presentation, err := s.presentationRepo.GetByID(ctx, slide.PresentationID)
	if err != nil {
		return err
	}

	if presentation.OwnerID != userID {
		return fmt.Errorf("permission denied")
	}

	if err := s.slideRepo.Delete(ctx, id); err != nil {
		return err
	}

	// Update presentation slide count
	return s.presentationRepo.UpdateSlideCount(ctx, slide.PresentationID, -1)
}

func (s *presentationService) DuplicateSlide(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*model.Slide, error) {
	slide, err := s.slideRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Verify user has access
	presentation, err := s.presentationRepo.GetByID(ctx, slide.PresentationID)
	if err != nil {
		return nil, err
	}

	if presentation.OwnerID != userID {
		return nil, fmt.Errorf("permission denied")
	}

	newSlide, err := s.slideRepo.Duplicate(ctx, id)
	if err != nil {
		return nil, err
	}

	// Update presentation slide count
	if err := s.presentationRepo.UpdateSlideCount(ctx, slide.PresentationID, 1); err != nil {
		return nil, err
	}

	return newSlide, nil
}

func (s *presentationService) ReorderSlides(ctx context.Context, presentationID uuid.UUID, userID uuid.UUID, req *model.ReorderSlidesRequest) error {
	// Verify user has access
	presentation, err := s.presentationRepo.GetByID(ctx, presentationID)
	if err != nil {
		return err
	}

	if presentation.OwnerID != userID {
		return fmt.Errorf("permission denied")
	}

	return s.slideRepo.Reorder(ctx, presentationID, req.SlideIDs)
}

// Theme operations

func (s *presentationService) CreateTheme(ctx context.Context, tenantID uuid.UUID, req *model.CreateThemeRequest) (*model.Theme, error) {
	theme := &model.Theme{
		ID:          uuid.New(),
		TenantID:    &tenantID,
		Name:        req.Name,
		Description: req.Description,
		IsDefault:   false,
		IsPublic:    req.IsPublic,
		Colors:      req.Colors,
		Fonts:       req.Fonts,
		Layouts:     req.Layouts,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.themeRepo.Create(ctx, theme); err != nil {
		return nil, err
	}

	return theme, nil
}

func (s *presentationService) GetTheme(ctx context.Context, id uuid.UUID) (*model.Theme, error) {
	return s.themeRepo.GetByID(ctx, id)
}

func (s *presentationService) ListThemes(ctx context.Context, tenantID *uuid.UUID) ([]*model.Theme, error) {
	return s.themeRepo.GetAll(ctx, tenantID)
}

func (s *presentationService) UpdateTheme(ctx context.Context, id uuid.UUID, req *model.UpdateThemeRequest) (*model.Theme, error) {
	theme, err := s.themeRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		theme.Name = *req.Name
	}
	if req.Description != nil {
		theme.Description = req.Description
	}
	if req.IsPublic != nil {
		theme.IsPublic = *req.IsPublic
	}
	if req.Colors != nil {
		theme.Colors = *req.Colors
	}
	if req.Fonts != nil {
		theme.Fonts = *req.Fonts
	}
	if req.Layouts != nil {
		theme.Layouts = *req.Layouts
	}

	if err := s.themeRepo.Update(ctx, theme); err != nil {
		return nil, err
	}

	return theme, nil
}

func (s *presentationService) DeleteTheme(ctx context.Context, id uuid.UUID) error {
	return s.themeRepo.Delete(ctx, id)
}
