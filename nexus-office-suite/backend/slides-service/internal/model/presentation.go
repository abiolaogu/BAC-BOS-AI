package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Presentation represents a complete presentation
type Presentation struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	TenantID    uuid.UUID  `json:"tenant_id" db:"tenant_id"`
	OwnerID     uuid.UUID  `json:"owner_id" db:"owner_id"`
	Title       string     `json:"title" db:"title"`
	Description *string    `json:"description,omitempty" db:"description"`
	ThemeID     *uuid.UUID `json:"theme_id,omitempty" db:"theme_id"`
	SlideCount  int        `json:"slide_count" db:"slide_count"`
	Width       int        `json:"width" db:"width"`
	Height      int        `json:"height" db:"height"`
	IsPublic    bool       `json:"is_public" db:"is_public"`
	ThumbnailURL *string   `json:"thumbnail_url,omitempty" db:"thumbnail_url"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

// Slide represents a single slide in a presentation
type Slide struct {
	ID             uuid.UUID     `json:"id" db:"id"`
	PresentationID uuid.UUID     `json:"presentation_id" db:"presentation_id"`
	Order          int           `json:"order" db:"order"`
	Title          *string       `json:"title,omitempty" db:"title"`
	Notes          *string       `json:"notes,omitempty" db:"notes"`
	Background     *Background   `json:"background,omitempty" db:"background"`
	Elements       Elements      `json:"elements" db:"elements"`
	Transition     *Transition   `json:"transition,omitempty" db:"transition"`
	ThumbnailURL   *string       `json:"thumbnail_url,omitempty" db:"thumbnail_url"`
	CreatedAt      time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time     `json:"updated_at" db:"updated_at"`
}

// Background represents a slide background
type Background struct {
	Type  string  `json:"type"` // "solid", "gradient", "image"
	Color *string `json:"color,omitempty"`
	Image *string `json:"image,omitempty"`
	Gradient *Gradient `json:"gradient,omitempty"`
}

// Gradient represents a gradient background
type Gradient struct {
	Type   string   `json:"type"` // "linear", "radial"
	Colors []string `json:"colors"`
	Angle  *int     `json:"angle,omitempty"`
}

// Value implements the driver.Valuer interface for Background
func (b Background) Value() (driver.Value, error) {
	return json.Marshal(b)
}

// Scan implements the sql.Scanner interface for Background
func (b *Background) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, b)
}

// Transition represents a slide transition effect
type Transition struct {
	Type     string  `json:"type"` // "none", "fade", "slide", "zoom", etc.
	Duration float64 `json:"duration"` // in seconds
	Direction *string `json:"direction,omitempty"` // "left", "right", "up", "down"
}

// Value implements the driver.Valuer interface for Transition
func (t Transition) Value() (driver.Value, error) {
	return json.Marshal(t)
}

// Scan implements the sql.Scanner interface for Transition
func (t *Transition) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, t)
}

// Elements is a collection of slide elements
type Elements []Element

// Element represents a single element on a slide
type Element struct {
	ID       string       `json:"id"`
	Type     string       `json:"type"` // "text", "image", "shape", "video", "chart"
	Position Position     `json:"position"`
	Size     Size         `json:"size"`
	Style    *Style       `json:"style,omitempty"`
	Content  *Content     `json:"content,omitempty"`
	ZIndex   int          `json:"z_index"`
	Rotation float64      `json:"rotation"` // in degrees
	Locked   bool         `json:"locked"`
}

// Position represents element position on the slide
type Position struct {
	X float64 `json:"x"` // in pixels
	Y float64 `json:"y"` // in pixels
}

// Size represents element dimensions
type Size struct {
	Width  float64 `json:"width"`  // in pixels
	Height float64 `json:"height"` // in pixels
}

// Style represents element styling
type Style struct {
	BackgroundColor *string  `json:"background_color,omitempty"`
	BorderColor     *string  `json:"border_color,omitempty"`
	BorderWidth     *float64 `json:"border_width,omitempty"`
	BorderRadius    *float64 `json:"border_radius,omitempty"`
	Opacity         *float64 `json:"opacity,omitempty"`
	Shadow          *Shadow  `json:"shadow,omitempty"`
}

// Shadow represents a drop shadow effect
type Shadow struct {
	OffsetX float64 `json:"offset_x"`
	OffsetY float64 `json:"offset_y"`
	Blur    float64 `json:"blur"`
	Color   string  `json:"color"`
}

// Content represents element-specific content
type Content struct {
	// Text content
	Text           *string `json:"text,omitempty"`
	FontFamily     *string `json:"font_family,omitempty"`
	FontSize       *int    `json:"font_size,omitempty"`
	FontWeight     *string `json:"font_weight,omitempty"`
	FontStyle      *string `json:"font_style,omitempty"`
	Color          *string `json:"color,omitempty"`
	TextAlign      *string `json:"text_align,omitempty"`
	LineHeight     *float64 `json:"line_height,omitempty"`

	// Image/Video content
	URL            *string `json:"url,omitempty"`
	Alt            *string `json:"alt,omitempty"`

	// Shape content
	ShapeType      *string `json:"shape_type,omitempty"` // "rectangle", "circle", "triangle", etc.
	FillColor      *string `json:"fill_color,omitempty"`

	// Chart content (stored as JSON for flexibility)
	ChartData      map[string]interface{} `json:"chart_data,omitempty"`
}

// Value implements the driver.Valuer interface for Elements
func (e Elements) Value() (driver.Value, error) {
	if e == nil {
		return json.Marshal([]Element{})
	}
	return json.Marshal(e)
}

// Scan implements the sql.Scanner interface for Elements
func (e *Elements) Scan(value interface{}) error {
	if value == nil {
		*e = []Element{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, e)
}

// Theme represents a presentation theme
type Theme struct {
	ID          uuid.UUID      `json:"id" db:"id"`
	TenantID    *uuid.UUID     `json:"tenant_id,omitempty" db:"tenant_id"`
	Name        string         `json:"name" db:"name"`
	Description *string        `json:"description,omitempty" db:"description"`
	IsDefault   bool           `json:"is_default" db:"is_default"`
	IsPublic    bool           `json:"is_public" db:"is_public"`
	Colors      ThemeColors    `json:"colors" db:"colors"`
	Fonts       ThemeFonts     `json:"fonts" db:"fonts"`
	Layouts     []SlideLayout  `json:"layouts" db:"layouts"`
	CreatedAt   time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at" db:"updated_at"`
}

// ThemeColors represents theme color palette
type ThemeColors struct {
	Primary     string   `json:"primary"`
	Secondary   string   `json:"secondary"`
	Accent      string   `json:"accent"`
	Background  string   `json:"background"`
	Text        string   `json:"text"`
	Custom      []string `json:"custom,omitempty"`
}

// Value implements the driver.Valuer interface for ThemeColors
func (t ThemeColors) Value() (driver.Value, error) {
	return json.Marshal(t)
}

// Scan implements the sql.Scanner interface for ThemeColors
func (t *ThemeColors) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, t)
}

// ThemeFonts represents theme font settings
type ThemeFonts struct {
	Heading string `json:"heading"`
	Body    string `json:"body"`
	Code    string `json:"code"`
}

// Value implements the driver.Valuer interface for ThemeFonts
func (t ThemeFonts) Value() (driver.Value, error) {
	return json.Marshal(t)
}

// Scan implements the sql.Scanner interface for ThemeFonts
func (t *ThemeFonts) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, t)
}

// SlideLayout represents a predefined slide layout
type SlideLayout struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Preview  *string   `json:"preview,omitempty"`
	Elements []Element `json:"elements"`
}

// SlideLayouts is a collection of slide layouts
type SlideLayouts []SlideLayout

// Value implements the driver.Valuer interface for SlideLayouts
func (s SlideLayouts) Value() (driver.Value, error) {
	if s == nil {
		return json.Marshal([]SlideLayout{})
	}
	return json.Marshal(s)
}

// Scan implements the sql.Scanner interface for SlideLayouts
func (s *SlideLayouts) Scan(value interface{}) error {
	if value == nil {
		*s = []SlideLayout{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, s)
}

// Request/Response types

// CreatePresentationRequest represents a request to create a presentation
type CreatePresentationRequest struct {
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`
	ThemeID     *uuid.UUID `json:"theme_id,omitempty"`
	Width       *int       `json:"width,omitempty"`
	Height      *int       `json:"height,omitempty"`
}

// UpdatePresentationRequest represents a request to update a presentation
type UpdatePresentationRequest struct {
	Title       *string    `json:"title,omitempty"`
	Description *string    `json:"description,omitempty"`
	ThemeID     *uuid.UUID `json:"theme_id,omitempty"`
	IsPublic    *bool      `json:"is_public,omitempty"`
}

// CreateSlideRequest represents a request to create a slide
type CreateSlideRequest struct {
	PresentationID uuid.UUID    `json:"presentation_id"`
	Order          *int         `json:"order,omitempty"`
	Title          *string      `json:"title,omitempty"`
	Background     *Background  `json:"background,omitempty"`
	LayoutID       *string      `json:"layout_id,omitempty"` // Use predefined layout
}

// UpdateSlideRequest represents a request to update a slide
type UpdateSlideRequest struct {
	Title      *string      `json:"title,omitempty"`
	Notes      *string      `json:"notes,omitempty"`
	Background *Background  `json:"background,omitempty"`
	Elements   *Elements    `json:"elements,omitempty"`
	Transition *Transition  `json:"transition,omitempty"`
}

// ReorderSlidesRequest represents a request to reorder slides
type ReorderSlidesRequest struct {
	SlideIDs []uuid.UUID `json:"slide_ids"` // Ordered list of slide IDs
}

// CreateThemeRequest represents a request to create a theme
type CreateThemeRequest struct {
	Name        string       `json:"name"`
	Description *string      `json:"description,omitempty"`
	IsPublic    bool         `json:"is_public"`
	Colors      ThemeColors  `json:"colors"`
	Fonts       ThemeFonts   `json:"fonts"`
	Layouts     []SlideLayout `json:"layouts,omitempty"`
}

// UpdateThemeRequest represents a request to update a theme
type UpdateThemeRequest struct {
	Name        *string       `json:"name,omitempty"`
	Description *string       `json:"description,omitempty"`
	IsPublic    *bool         `json:"is_public,omitempty"`
	Colors      *ThemeColors  `json:"colors,omitempty"`
	Fonts       *ThemeFonts   `json:"fonts,omitempty"`
	Layouts     *[]SlideLayout `json:"layouts,omitempty"`
}
