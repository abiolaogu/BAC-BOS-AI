package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"google.golang.org/api/admin/directory/v1"
	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/meet/v2"
	"google.golang.org/api/sheets/v4"
	"google.golang.org/api/slides/v1"
	"google.golang.org/api/docs/v1"
	"google.golang.org/api/forms/v1"
	"google.golang.org/api/option"
)

// GoogleWorkspaceService handles all Google Workspace integrations
type GoogleWorkspaceService struct {
	gmailService    *gmail.Service
	calendarService *calendar.Service
	driveService    *drive.Service
	docsService     *docs.Service
	sheetsService   *sheets.Service
	slidesService   *slides.Service
	formsService    *forms.Service
	adminService    *admin.Service
	meetService     *meet.Service
}

// GmailRequest represents a Gmail API request
type GmailRequest struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Body    string `json:"body"`
	From    string `json:"from"`
}

// CalendarEventRequest represents a Calendar event request
type CalendarEventRequest struct {
	Summary     string   `json:"summary"`
	Description string   `json:"description"`
	Start       string   `json:"start"`
	End         string   `json:"end"`
	Attendees   []string `json:"attendees"`
	Location    string   `json:"location"`
}

// DriveFileRequest represents a Drive file operation request
type DriveFileRequest struct {
	Name     string `json:"name"`
	MimeType string `json:"mimeType"`
	Content  string `json:"content"`
	ParentID string `json:"parentId"`
}

// NewGoogleWorkspaceService creates a new Google Workspace service
func NewGoogleWorkspaceService(ctx context.Context, credentialsJSON string) (*GoogleWorkspaceService, error) {
	options := option.WithCredentialsJSON([]byte(credentialsJSON))

	gmailSvc, err := gmail.NewService(ctx, options)
	if err != nil {
		return nil, fmt.Errorf("failed to create Gmail service: %w", err)
	}

	calendarSvc, err := calendar.NewService(ctx, options)
	if err != nil {
		return nil, fmt.Errorf("failed to create Calendar service: %w", err)
	}

	driveSvc, err := drive.NewService(ctx, options)
	if err != nil {
		return nil, fmt.Errorf("failed to create Drive service: %w", err)
	}

	docsSvc, err := docs.NewService(ctx, options)
	if err != nil {
		return nil, fmt.Errorf("failed to create Docs service: %w", err)
	}

	sheetsSvc, err := sheets.NewService(ctx, options)
	if err != nil {
		return nil, fmt.Errorf("failed to create Sheets service: %w", err)
	}

	slidesSvc, err := slides.NewService(ctx, options)
	if err != nil {
		return nil, fmt.Errorf("failed to create Slides service: %w", err)
	}

	formsSvc, err := forms.NewService(ctx, options)
	if err != nil {
		return nil, fmt.Errorf("failed to create Forms service: %w", err)
	}

	adminSvc, err := admin.NewService(ctx, options)
	if err != nil {
		return nil, fmt.Errorf("failed to create Admin service: %w", err)
	}

	meetSvc, err := meet.NewService(ctx, options)
	if err != nil {
		return nil, fmt.Errorf("failed to create Meet service: %w", err)
	}

	return &GoogleWorkspaceService{
		gmailService:    gmailSvc,
		calendarService: calendarSvc,
		driveService:    driveSvc,
		docsService:     docsSvc,
		sheetsService:   sheetsSvc,
		slidesService:   slidesSvc,
		formsService:    formsSvc,
		adminService:    adminSvc,
		meetService:     meetSvc,
	}, nil
}

// SendEmail sends an email via Gmail
func (gws *GoogleWorkspaceService) SendEmail(w http.ResponseWriter, r *http.Request) {
	var req GmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	message := &gmail.Message{
		Raw: encodeMessage(req.To, req.From, req.Subject, req.Body),
	}

	_, err := gws.gmailService.Users.Messages.Send("me", message).Do()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to send email: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "Email sent successfully"})
}

// CreateCalendarEvent creates a new calendar event
func (gws *GoogleWorkspaceService) CreateCalendarEvent(w http.ResponseWriter, r *http.Request) {
	var req CalendarEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	attendees := make([]*calendar.EventAttendee, len(req.Attendees))
	for i, email := range req.Attendees {
		attendees[i] = &calendar.EventAttendee{Email: email}
	}

	event := &calendar.Event{
		Summary:     req.Summary,
		Description: req.Description,
		Start: &calendar.EventDateTime{
			DateTime: req.Start,
			TimeZone: "UTC",
		},
		End: &calendar.EventDateTime{
			DateTime: req.End,
			TimeZone: "UTC",
		},
		Attendees: attendees,
		Location:  req.Location,
	}

	createdEvent, err := gws.calendarService.Events.Insert("primary", event).Do()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create event: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdEvent)
}

// ListCalendarEvents lists calendar events
func (gws *GoogleWorkspaceService) ListCalendarEvents(w http.ResponseWriter, r *http.Request) {
	events, err := gws.calendarService.Events.List("primary").Do()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list events: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(events.Items)
}

// CreateDriveFile creates a new file in Google Drive
func (gws *GoogleWorkspaceService) CreateDriveFile(w http.ResponseWriter, r *http.Request) {
	var req DriveFileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	file := &drive.File{
		Name:     req.Name,
		MimeType: req.MimeType,
	}

	if req.ParentID != "" {
		file.Parents = []string{req.ParentID}
	}

	createdFile, err := gws.driveService.Files.Create(file).Do()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create file: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdFile)
}

// ListDriveFiles lists files from Google Drive
func (gws *GoogleWorkspaceService) ListDriveFiles(w http.ResponseWriter, r *http.Request) {
	files, err := gws.driveService.Files.List().Do()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list files: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(files.Files)
}

// CreateDocument creates a new Google Doc
func (gws *GoogleWorkspaceService) CreateDocument(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Title string `json:"title"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	doc := &docs.Document{
		Title: req.Title,
	}

	createdDoc, err := gws.docsService.Documents.Create(doc).Do()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create document: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdDoc)
}

// CreateSpreadsheet creates a new Google Sheet
func (gws *GoogleWorkspaceService) CreateSpreadsheet(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Title string `json:"title"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	spreadsheet := &sheets.Spreadsheet{
		Properties: &sheets.SpreadsheetProperties{
			Title: req.Title,
		},
	}

	createdSheet, err := gws.sheetsService.Spreadsheets.Create(spreadsheet).Do()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create spreadsheet: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdSheet)
}

// CreatePresentation creates a new Google Slides presentation
func (gws *GoogleWorkspaceService) CreatePresentation(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Title string `json:"title"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	presentation := &slides.Presentation{
		Title: req.Title,
	}

	createdPresentation, err := gws.slidesService.Presentations.Create(presentation).Do()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create presentation: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdPresentation)
}

// CreateForm creates a new Google Form
func (gws *GoogleWorkspaceService) CreateForm(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Title string `json:"title"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	form := &forms.Form{
		Info: &forms.Info{
			Title: req.Title,
		},
	}

	createdForm, err := gws.formsService.Forms.Create(form).Do()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create form: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdForm)
}

// ListUsers lists users in the organization (Admin SDK)
func (gws *GoogleWorkspaceService) ListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := gws.adminService.Users.List().Customer("my_customer").Do()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list users: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(users.Users)
}

// HealthCheck returns service health status
func (gws *GoogleWorkspaceService) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"service": "google-workspace-integration",
	})
}

// Helper function to encode email message
func encodeMessage(to, from, subject, body string) string {
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s", from, to, subject, body)
	return msg
}

func main() {
	ctx := context.Background()

	// Load credentials from environment
	credentialsJSON := os.Getenv("GOOGLE_CREDENTIALS_JSON")
	if credentialsJSON == "" {
		log.Fatal("GOOGLE_CREDENTIALS_JSON environment variable is required")
	}

	// Initialize service
	service, err := NewGoogleWorkspaceService(ctx, credentialsJSON)
	if err != nil {
		log.Fatalf("Failed to initialize Google Workspace service: %v", err)
	}

	// Setup router
	r := mux.NewRouter()

	// Gmail endpoints
	r.HandleFunc("/api/v1/gmail/send", service.SendEmail).Methods("POST")

	// Calendar endpoints
	r.HandleFunc("/api/v1/calendar/events", service.CreateCalendarEvent).Methods("POST")
	r.HandleFunc("/api/v1/calendar/events", service.ListCalendarEvents).Methods("GET")

	// Drive endpoints
	r.HandleFunc("/api/v1/drive/files", service.CreateDriveFile).Methods("POST")
	r.HandleFunc("/api/v1/drive/files", service.ListDriveFiles).Methods("GET")

	// Docs endpoints
	r.HandleFunc("/api/v1/docs/documents", service.CreateDocument).Methods("POST")

	// Sheets endpoints
	r.HandleFunc("/api/v1/sheets/spreadsheets", service.CreateSpreadsheet).Methods("POST")

	// Slides endpoints
	r.HandleFunc("/api/v1/slides/presentations", service.CreatePresentation).Methods("POST")

	// Forms endpoints
	r.HandleFunc("/api/v1/forms/forms", service.CreateForm).Methods("POST")

	// Admin endpoints
	r.HandleFunc("/api/v1/admin/users", service.ListUsers).Methods("GET")

	// Health check
	r.HandleFunc("/health", service.HealthCheck).Methods("GET")

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Google Workspace Integration Service starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
