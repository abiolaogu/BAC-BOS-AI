package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/nexus/drive-service/internal/model"
	"github.com/nexus/drive-service/internal/service"
)

type DriveHandler struct {
	service       service.DriveService
	maxUploadSize int64
}

func NewDriveHandler(service service.DriveService, maxUploadSize int64) *DriveHandler {
	return &DriveHandler{
		service:       service,
		maxUploadSize: maxUploadSize,
	}
}

// UploadFile handles file upload
func (h *DriveHandler) UploadFile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID, userID := getTenantAndUserID(r)

	// Parse multipart form
	if err := r.ParseMultipartForm(h.maxUploadSize); err != nil {
		respondError(w, http.StatusBadRequest, "Failed to parse form: "+err.Error())
		return
	}

	// Get file from form
	file, header, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "No file provided")
		return
	}
	defer file.Close()

	// Get folder ID if provided
	var folderID *uuid.UUID
	if folderIDStr := r.FormValue("folder_id"); folderIDStr != "" {
		id, err := uuid.Parse(folderIDStr)
		if err == nil {
			folderID = &id
		}
	}

	// Upload file
	uploadedFile, err := h.service.UploadFile(
		ctx,
		tenantID,
		userID,
		folderID,
		header.Filename,
		file,
		header.Size,
		header.Header.Get("Content-Type"),
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, uploadedFile)
}

// GetFile retrieves file metadata
func (h *DriveHandler) GetFile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	fileID := getUUID(r, "id")

	file, err := h.service.GetFile(ctx, fileID, userID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, file)
}

// DownloadFile downloads a file
func (h *DriveHandler) DownloadFile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	fileID := getUUID(r, "id")

	reader, file, err := h.service.DownloadFile(ctx, fileID, userID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	defer reader.Close()

	// Set headers
	w.Header().Set("Content-Type", file.MimeType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", file.Name))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", file.Size))

	// Stream file
	_, _ = io.Copy(w, reader)
}

// UpdateFile updates file metadata
func (h *DriveHandler) UpdateFile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	fileID := getUUID(r, "id")

	var req model.UpdateFileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	file, err := h.service.UpdateFile(ctx, fileID, userID, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, file)
}

// DeleteFile deletes a file (moves to trash)
func (h *DriveHandler) DeleteFile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	fileID := getUUID(r, "id")

	if err := h.service.DeleteFile(ctx, fileID, userID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "File moved to trash"})
}

// ListFiles lists files in a folder
func (h *DriveHandler) ListFiles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID, userID := getTenantAndUserID(r)

	// Get folder ID from query
	var folderID *uuid.UUID
	if folderIDStr := r.URL.Query().Get("folder_id"); folderIDStr != "" {
		id, err := uuid.Parse(folderIDStr)
		if err == nil {
			folderID = &id
		}
	}

	// Get includeShared flag
	includeShared := r.URL.Query().Get("include_shared") == "true"

	files, err := h.service.ListFiles(ctx, tenantID, userID, folderID, includeShared)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, files)
}

// SearchFiles searches for files
func (h *DriveHandler) SearchFiles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID, _ := getTenantAndUserID(r)

	query := r.URL.Query().Get("q")
	if query == "" {
		respondError(w, http.StatusBadRequest, "Search query is required")
		return
	}

	var fileType *model.FileType
	if fileTypeStr := r.URL.Query().Get("type"); fileTypeStr != "" {
		ft := model.FileType(fileTypeStr)
		fileType = &ft
	}

	files, err := h.service.SearchFiles(ctx, tenantID, query, fileType)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, files)
}

// GetStarredFiles gets starred files
func (h *DriveHandler) GetStarredFiles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID, userID := getTenantAndUserID(r)

	files, err := h.service.GetStarredFiles(ctx, tenantID, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, files)
}

// GetRecentFiles gets recently accessed files
func (h *DriveHandler) GetRecentFiles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID, userID := getTenantAndUserID(r)

	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	files, err := h.service.GetRecentFiles(ctx, tenantID, userID, limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, files)
}

// CreateFolder creates a new folder
func (h *DriveHandler) CreateFolder(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID, userID := getTenantAndUserID(r)

	var req model.CreateFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	folder, err := h.service.CreateFolder(ctx, tenantID, userID, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, folder)
}

// GetFolder retrieves a folder
func (h *DriveHandler) GetFolder(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	folderID := getUUID(r, "id")

	folder, err := h.service.GetFolder(ctx, folderID, userID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, folder)
}

// UpdateFolder updates a folder
func (h *DriveHandler) UpdateFolder(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	folderID := getUUID(r, "id")

	var req model.UpdateFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	folder, err := h.service.UpdateFolder(ctx, folderID, userID, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, folder)
}

// DeleteFolder deletes a folder
func (h *DriveHandler) DeleteFolder(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	folderID := getUUID(r, "id")

	if err := h.service.DeleteFolder(ctx, folderID, userID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Folder moved to trash"})
}

// ListFolders lists folders
func (h *DriveHandler) ListFolders(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID, userID := getTenantAndUserID(r)

	var parentID *uuid.UUID
	if parentIDStr := r.URL.Query().Get("parent_id"); parentIDStr != "" {
		id, err := uuid.Parse(parentIDStr)
		if err == nil {
			parentID = &id
		}
	}

	includeShared := r.URL.Query().Get("include_shared") == "true"

	folders, err := h.service.ListFolders(ctx, tenantID, userID, parentID, includeShared)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, folders)
}

// MoveFile moves a file to a different folder
func (h *DriveHandler) MoveFile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	fileID := getUUID(r, "id")

	var req struct {
		FolderID *uuid.UUID `json:"folder_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	file, err := h.service.MoveFile(ctx, fileID, userID, req.FolderID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, file)
}

// CopyFile copies a file
func (h *DriveHandler) CopyFile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	fileID := getUUID(r, "id")

	var req struct {
		FolderID *uuid.UUID `json:"folder_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	file, err := h.service.CopyFile(ctx, fileID, userID, req.FolderID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, file)
}

// ListTrashed lists trashed items
func (h *DriveHandler) ListTrashed(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID, userID := getTenantAndUserID(r)

	items, err := h.service.ListTrashed(ctx, tenantID, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, items)
}

// RestoreFromTrash restores an item from trash
func (h *DriveHandler) RestoreFromTrash(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)

	var req struct {
		ResourceID   uuid.UUID            `json:"resource_id"`
		ResourceType model.ResourceType   `json:"resource_type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.service.RestoreFromTrash(ctx, req.ResourceID, req.ResourceType, userID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Item restored"})
}

// EmptyTrash permanently deletes all trashed items
func (h *DriveHandler) EmptyTrash(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID, userID := getTenantAndUserID(r)

	if err := h.service.EmptyTrash(ctx, tenantID, userID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Trash emptied"})
}

// GrantPermission grants permission to a user
func (h *DriveHandler) GrantPermission(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID, userID := getTenantAndUserID(r)

	var req model.CreatePermissionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	permission, err := h.service.GrantPermission(ctx, tenantID, userID, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, permission)
}

// RevokePermission revokes a permission
func (h *DriveHandler) RevokePermission(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	permissionID := getUUID(r, "id")

	if err := h.service.RevokePermission(ctx, permissionID, userID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Permission revoked"})
}

// ListPermissions lists permissions for a resource
func (h *DriveHandler) ListPermissions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	resourceID := getUUID(r, "resource_id")
	resourceType := model.ResourceType(mux.Vars(r)["resource_type"])

	permissions, err := h.service.ListPermissions(ctx, resourceID, resourceType, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, permissions)
}

// CreateShareLink creates a share link
func (h *DriveHandler) CreateShareLink(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID, userID := getTenantAndUserID(r)

	var req model.CreateShareLinkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	link, err := h.service.CreateShareLink(ctx, tenantID, userID, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, link)
}

// GetShareLink gets a share link by token
func (h *DriveHandler) GetShareLink(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	token := mux.Vars(r)["token"]

	link, err := h.service.GetShareLink(ctx, token)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, link)
}

// DeleteShareLink deletes a share link
func (h *DriveHandler) DeleteShareLink(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	linkID := getUUID(r, "id")

	if err := h.service.DeleteShareLink(ctx, linkID, userID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Share link deleted"})
}

// ListVersions lists file versions
func (h *DriveHandler) ListVersions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	fileID := getUUID(r, "file_id")

	versions, err := h.service.ListVersions(ctx, fileID, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, versions)
}

// RestoreVersion restores a file version
func (h *DriveHandler) RestoreVersion(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	fileID := getUUID(r, "file_id")

	var req struct {
		VersionNum int `json:"version_num"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	file, err := h.service.RestoreVersion(ctx, fileID, req.VersionNum, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, file)
}

// Helper functions

func getUUID(r *http.Request, key string) uuid.UUID {
	vars := mux.Vars(r)
	id, _ := uuid.Parse(vars[key])
	return id
}

func getUserID(r *http.Request) uuid.UUID {
	userID := r.Context().Value("user_id")
	if userID == nil {
		return uuid.Nil
	}
	return userID.(uuid.UUID)
}

func getTenantAndUserID(r *http.Request) (uuid.UUID, uuid.UUID) {
	tenantID := r.Context().Value("tenant_id")
	userID := r.Context().Value("user_id")

	var tid, uid uuid.UUID
	if tenantID != nil {
		tid = tenantID.(uuid.UUID)
	}
	if userID != nil {
		uid = userID.(uuid.UUID)
	}

	return tid, uid
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}
