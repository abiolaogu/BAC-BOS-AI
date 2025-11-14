// internal/handler/document_handler.go
package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/nexus/writer-service/internal/model"
	"github.com/nexus/writer-service/internal/service"
)

type DocumentHandler struct {
	documentService service.DocumentService
	exportService   service.ExportService
	importService   service.ImportService
	logger          *zap.Logger
}

func NewDocumentHandler(
	documentService service.DocumentService,
	exportService service.ExportService,
	importService service.ImportService,
	logger *zap.Logger,
) *DocumentHandler {
	return &DocumentHandler{
		documentService: documentService,
		exportService:   exportService,
		importService:   importService,
		logger:          logger,
	}
}

func (h *DocumentHandler) CreateDocument(w http.ResponseWriter, r *http.Request) {
	var req model.CreateDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body", nil)
		return
	}

	tenantID := getTenantID(r)
	userID := getUserID(r)

	doc, err := h.documentService.CreateDocument(r.Context(), &req, tenantID, userID)
	if err != nil {
		h.logger.Error("Failed to create document", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to create document", nil)
		return
	}

	h.sendJSON(w, http.StatusCreated, doc)
}

func (h *DocumentHandler) GetDocument(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid document ID", nil)
		return
	}

	tenantID := getTenantID(r)

	doc, err := h.documentService.GetDocument(r.Context(), id, tenantID)
	if err != nil {
		h.logger.Error("Failed to get document", zap.Error(err))
		h.sendError(w, http.StatusNotFound, "Document not found", nil)
		return
	}

	h.sendJSON(w, http.StatusOK, doc)
}

func (h *DocumentHandler) UpdateDocument(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid document ID", nil)
		return
	}

	var req model.UpdateDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body", nil)
		return
	}

	tenantID := getTenantID(r)

	doc, err := h.documentService.UpdateDocument(r.Context(), id, tenantID, &req)
	if err != nil {
		h.logger.Error("Failed to update document", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to update document", nil)
		return
	}

	h.sendJSON(w, http.StatusOK, doc)
}

func (h *DocumentHandler) DeleteDocument(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid document ID", nil)
		return
	}

	tenantID := getTenantID(r)
	permanent := r.URL.Query().Get("permanent") == "true"

	if err := h.documentService.DeleteDocument(r.Context(), id, tenantID, permanent); err != nil {
		h.logger.Error("Failed to delete document", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to delete document", nil)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *DocumentHandler) ListDocuments(w http.ResponseWriter, r *http.Request) {
	query := &model.ListDocumentsQuery{
		Page:      getIntQueryParam(r, "page", 1),
		Limit:     getIntQueryParam(r, "limit", 20),
		SortBy:    r.URL.Query().Get("sortBy"),
		SortOrder: r.URL.Query().Get("sortOrder"),
	}

	if query.SortBy == "" {
		query.SortBy = "updated_at"
	}
	if query.SortOrder == "" {
		query.SortOrder = "desc"
	}

	if folderID := r.URL.Query().Get("folderId"); folderID != "" {
		id, _ := uuid.Parse(folderID)
		query.FolderID = &id
	}

	if status := r.URL.Query().Get("status"); status != "" {
		query.Status = &status
	}

	if search := r.URL.Query().Get("search"); search != "" {
		query.Search = &search
	}

	tenantID := getTenantID(r)

	result, err := h.documentService.ListDocuments(r.Context(), tenantID, query)
	if err != nil {
		h.logger.Error("Failed to list documents", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to list documents", nil)
		return
	}

	h.sendJSON(w, http.StatusOK, result)
}

func (h *DocumentHandler) SearchDocuments(w http.ResponseWriter, r *http.Request) {
	searchQuery := r.URL.Query().Get("q")
	if searchQuery == "" {
		h.sendError(w, http.StatusBadRequest, "Search query is required", nil)
		return
	}

	page := getIntQueryParam(r, "page", 1)
	limit := getIntQueryParam(r, "limit", 20)
	tenantID := getTenantID(r)

	documents, err := h.documentService.SearchDocuments(r.Context(), tenantID, searchQuery, page, limit)
	if err != nil {
		h.logger.Error("Failed to search documents", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to search documents", nil)
		return
	}

	h.sendJSON(w, http.StatusOK, map[string]interface{}{
		"data": documents,
	})
}

func (h *DocumentHandler) CreateVersion(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid document ID", nil)
		return
	}

	var req model.CreateVersionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body", nil)
		return
	}

	tenantID := getTenantID(r)
	userID := getUserID(r)

	version, err := h.documentService.CreateVersion(r.Context(), id, tenantID, userID, req.ChangeSummary)
	if err != nil {
		h.logger.Error("Failed to create version", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to create version", nil)
		return
	}

	h.sendJSON(w, http.StatusCreated, version)
}

func (h *DocumentHandler) ListVersions(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid document ID", nil)
		return
	}

	tenantID := getTenantID(r)

	versions, err := h.documentService.ListVersions(r.Context(), id, tenantID)
	if err != nil {
		h.logger.Error("Failed to list versions", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to list versions", nil)
		return
	}

	h.sendJSON(w, http.StatusOK, map[string]interface{}{
		"data": versions,
	})
}

func (h *DocumentHandler) RestoreVersion(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid document ID", nil)
		return
	}

	versionID, err := uuid.Parse(vars["versionId"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid version ID", nil)
		return
	}

	tenantID := getTenantID(r)
	userID := getUserID(r)

	doc, err := h.documentService.RestoreVersion(r.Context(), id, versionID, tenantID, userID)
	if err != nil {
		h.logger.Error("Failed to restore version", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to restore version", nil)
		return
	}

	h.sendJSON(w, http.StatusOK, doc)
}

func (h *DocumentHandler) ExportDocument(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid document ID", nil)
		return
	}

	format := vars["format"]
	tenantID := getTenantID(r)

	doc, err := h.documentService.GetDocument(r.Context(), id, tenantID)
	if err != nil {
		h.logger.Error("Failed to get document", zap.Error(err))
		h.sendError(w, http.StatusNotFound, "Document not found", nil)
		return
	}

	var data []byte
	var contentType string

	switch format {
	case "pdf":
		data, err = h.exportService.ExportToPDF(doc)
		contentType = "application/pdf"
	case "docx":
		data, err = h.exportService.ExportToDOCX(doc)
		contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	case "html":
		data, err = h.exportService.ExportToHTML(doc)
		contentType = "text/html"
	case "txt":
		data, err = h.exportService.ExportToTXT(doc)
		contentType = "text/plain"
	case "markdown":
		data, err = h.exportService.ExportToMarkdown(doc)
		contentType = "text/markdown"
	default:
		h.sendError(w, http.StatusBadRequest, "Invalid export format", nil)
		return
	}

	if err != nil {
		h.logger.Error("Failed to export document", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to export document", nil)
		return
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", "attachment; filename="+doc.Title+"."+format)
	w.Write(data)
}

func (h *DocumentHandler) ImportDocument(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10MB max
		h.sendError(w, http.StatusBadRequest, "Failed to parse form", nil)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "File is required", nil)
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		h.sendError(w, http.StatusInternalServerError, "Failed to read file", nil)
		return
	}

	title := r.FormValue("title")
	format := r.FormValue("format")

	var content *model.DocumentContent

	switch format {
	case "docx":
		content, err = h.importService.ImportFromDOCX(data, title)
	case "html":
		content, err = h.importService.ImportFromHTML(data)
	default:
		h.sendError(w, http.StatusBadRequest, "Invalid import format", nil)
		return
	}

	if err != nil {
		h.logger.Error("Failed to import document", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to import document", nil)
		return
	}

	tenantID := getTenantID(r)
	userID := getUserID(r)

	doc, err := h.documentService.CreateDocument(r.Context(), &model.CreateDocumentRequest{
		Title:   title,
		Content: *content,
	}, tenantID, userID)

	if err != nil {
		h.logger.Error("Failed to create document from import", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to create document", nil)
		return
	}

	h.sendJSON(w, http.StatusCreated, doc)
}

func (h *DocumentHandler) ShareDocument(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid document ID", nil)
		return
	}

	var req model.ShareDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body", nil)
		return
	}

	tenantID := getTenantID(r)
	userID := getUserID(r)

	if err := h.documentService.ShareDocument(r.Context(), id, tenantID, userID, &req); err != nil {
		h.logger.Error("Failed to share document", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to share document", nil)
		return
	}

	h.sendJSON(w, http.StatusOK, map[string]string{"message": "Document shared successfully"})
}

func (h *DocumentHandler) GetPermissions(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid document ID", nil)
		return
	}

	permissions, err := h.documentService.GetPermissions(r.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get permissions", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to get permissions", nil)
		return
	}

	h.sendJSON(w, http.StatusOK, map[string]interface{}{
		"data": permissions,
	})
}

func (h *DocumentHandler) RevokePermission(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid document ID", nil)
		return
	}

	userIDStr := vars["userId"]
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid user ID", nil)
		return
	}

	tenantID := getTenantID(r)

	if err := h.documentService.RevokePermission(r.Context(), id, userID, tenantID); err != nil {
		h.logger.Error("Failed to revoke permission", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to revoke permission", nil)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *DocumentHandler) GetActivity(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid document ID", nil)
		return
	}

	limit := getIntQueryParam(r, "limit", 50)
	tenantID := getTenantID(r)

	activities, err := h.documentService.GetActivity(r.Context(), id, tenantID, limit)
	if err != nil {
		h.logger.Error("Failed to get activity", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to get activity", nil)
		return
	}

	h.sendJSON(w, http.StatusOK, map[string]interface{}{
		"data": activities,
	})
}

func (h *DocumentHandler) sendJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (h *DocumentHandler) sendError(w http.ResponseWriter, status int, message string, errors []model.FieldError) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(model.ErrorResponse{
		StatusCode: status,
		Message:    message,
		Errors:     errors,
	})
}

func getTenantID(r *http.Request) uuid.UUID {
	if id, ok := r.Context().Value("tenantID").(uuid.UUID); ok {
		return id
	}
	return uuid.Nil
}

func getUserID(r *http.Request) uuid.UUID {
	if id, ok := r.Context().Value("userID").(uuid.UUID); ok {
		return id
	}
	return uuid.Nil
}

func getIntQueryParam(r *http.Request, key string, defaultValue int) int {
	if valueStr := r.URL.Query().Get(key); valueStr != "" {
		if value, err := strconv.Atoi(valueStr); err == nil {
			return value
		}
	}
	return defaultValue
}
