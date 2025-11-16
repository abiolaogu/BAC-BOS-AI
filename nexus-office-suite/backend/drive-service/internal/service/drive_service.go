package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"mime"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/nexus/drive-service/internal/model"
	"github.com/nexus/drive-service/internal/repository"
	"github.com/nexus/drive-service/internal/storage"
	"golang.org/x/crypto/bcrypt"
)

type DriveService interface {
	// File operations
	UploadFile(ctx context.Context, tenantID, userID uuid.UUID, folderID *uuid.UUID, filename string, reader io.Reader, size int64, contentType string) (*model.File, error)
	GetFile(ctx context.Context, fileID uuid.UUID, userID uuid.UUID) (*model.File, error)
	DownloadFile(ctx context.Context, fileID uuid.UUID, userID uuid.UUID) (io.ReadCloser, *model.File, error)
	UpdateFile(ctx context.Context, fileID uuid.UUID, userID uuid.UUID, req *model.UpdateFileRequest) (*model.File, error)
	DeleteFile(ctx context.Context, fileID uuid.UUID, userID uuid.UUID) error
	MoveFile(ctx context.Context, fileID uuid.UUID, userID uuid.UUID, targetFolderID *uuid.UUID) (*model.File, error)
	CopyFile(ctx context.Context, fileID uuid.UUID, userID uuid.UUID, targetFolderID *uuid.UUID) (*model.File, error)
	ListFiles(ctx context.Context, tenantID, userID uuid.UUID, folderID *uuid.UUID, includeShared bool) ([]*model.File, error)
	SearchFiles(ctx context.Context, tenantID uuid.UUID, query string, fileType *model.FileType) ([]*model.File, error)
	GetStarredFiles(ctx context.Context, tenantID, userID uuid.UUID) ([]*model.File, error)
	GetRecentFiles(ctx context.Context, tenantID, userID uuid.UUID, limit int) ([]*model.File, error)

	// Folder operations
	CreateFolder(ctx context.Context, tenantID, userID uuid.UUID, req *model.CreateFolderRequest) (*model.Folder, error)
	GetFolder(ctx context.Context, folderID uuid.UUID, userID uuid.UUID) (*model.Folder, error)
	UpdateFolder(ctx context.Context, folderID uuid.UUID, userID uuid.UUID, req *model.UpdateFolderRequest) (*model.Folder, error)
	DeleteFolder(ctx context.Context, folderID uuid.UUID, userID uuid.UUID) error
	ListFolders(ctx context.Context, tenantID, userID uuid.UUID, parentID *uuid.UUID, includeShared bool) ([]*model.Folder, error)
	GetFolderPath(ctx context.Context, folderID uuid.UUID) (string, error)

	// Trash operations
	MoveToTrash(ctx context.Context, resourceID uuid.UUID, resourceType model.ResourceType, userID uuid.UUID) error
	RestoreFromTrash(ctx context.Context, resourceID uuid.UUID, resourceType model.ResourceType, userID uuid.UUID) error
	EmptyTrash(ctx context.Context, tenantID, userID uuid.UUID) error
	ListTrashed(ctx context.Context, tenantID, userID uuid.UUID) ([]*model.FileInfo, error)

	// Permission operations
	GrantPermission(ctx context.Context, tenantID, userID uuid.UUID, req *model.CreatePermissionRequest) (*model.Permission, error)
	RevokePermission(ctx context.Context, permissionID uuid.UUID, userID uuid.UUID) error
	ListPermissions(ctx context.Context, resourceID uuid.UUID, resourceType model.ResourceType, userID uuid.UUID) ([]*model.Permission, error)

	// Share link operations
	CreateShareLink(ctx context.Context, tenantID, userID uuid.UUID, req *model.CreateShareLinkRequest) (*model.ShareLink, error)
	GetShareLink(ctx context.Context, token string) (*model.ShareLink, error)
	DeleteShareLink(ctx context.Context, linkID uuid.UUID, userID uuid.UUID) error

	// Version operations
	ListVersions(ctx context.Context, fileID uuid.UUID, userID uuid.UUID) ([]*model.FileVersion, error)
	RestoreVersion(ctx context.Context, fileID uuid.UUID, versionNum int, userID uuid.UUID) (*model.File, error)
}

type driveService struct {
	fileRepo       repository.FileRepository
	folderRepo     repository.FolderRepository
	permissionRepo repository.PermissionRepository
	shareLinkRepo  repository.ShareLinkRepository
	versionRepo    repository.VersionRepository
	storage        storage.StorageService
}

func NewDriveService(
	fileRepo repository.FileRepository,
	folderRepo repository.FolderRepository,
	permissionRepo repository.PermissionRepository,
	shareLinkRepo repository.ShareLinkRepository,
	versionRepo repository.VersionRepository,
	storage storage.StorageService,
) DriveService {
	return &driveService{
		fileRepo:       fileRepo,
		folderRepo:     folderRepo,
		permissionRepo: permissionRepo,
		shareLinkRepo:  shareLinkRepo,
		versionRepo:    versionRepo,
		storage:        storage,
	}
}

// UploadFile uploads a new file
func (s *driveService) UploadFile(ctx context.Context, tenantID, userID uuid.UUID, folderID *uuid.UUID, filename string, reader io.Reader, size int64, contentType string) (*model.File, error) {
	fileID := uuid.New()

	// Determine MIME type
	if contentType == "" {
		contentType = mime.TypeByExtension(filepath.Ext(filename))
		if contentType == "" {
			contentType = "application/octet-stream"
		}
	}

	// Upload to storage
	storagePath, err := s.storage.UploadFile(ctx, tenantID, fileID, filename, reader, size, contentType)
	if err != nil {
		return nil, err
	}

	// Create file record
	file := &model.File{
		ID:           fileID,
		TenantID:     tenantID,
		OwnerID:      userID,
		FolderID:     folderID,
		Name:         filename,
		OriginalName: filename,
		MimeType:     contentType,
		FileType:     determineFileType(contentType, filename),
		Size:         size,
		StoragePath:  storagePath,
		Version:      1,
		IsStarred:    false,
		IsTrashed:    false,
		Tags:         model.Tags{},
		Metadata:     model.Metadata{},
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.fileRepo.Create(ctx, file); err != nil {
		// Cleanup storage on failure
		_ = s.storage.DeleteFile(ctx, storagePath)
		return nil, err
	}

	// Create initial version
	version := &model.FileVersion{
		ID:          uuid.New(),
		FileID:      fileID,
		VersionNum:  1,
		Size:        size,
		StoragePath: storagePath,
		CreatedBy:   userID,
		CreatedAt:   time.Now(),
	}
	_ = s.versionRepo.Create(ctx, version)

	return file, nil
}

// GetFile retrieves a file by ID
func (s *driveService) GetFile(ctx context.Context, fileID uuid.UUID, userID uuid.UUID) (*model.File, error) {
	file, err := s.fileRepo.GetByID(ctx, fileID)
	if err != nil {
		return nil, err
	}

	// Check permission
	if file.OwnerID != userID {
		hasPermission, err := s.permissionRepo.HasPermission(ctx, fileID, model.ResourceTypeFile, userID, model.PermissionViewer)
		if err != nil || !hasPermission {
			return nil, fmt.Errorf("permission denied")
		}
	}

	// Update access time
	_ = s.fileRepo.UpdateAccessTime(ctx, fileID)

	return file, nil
}

// DownloadFile downloads a file
func (s *driveService) DownloadFile(ctx context.Context, fileID uuid.UUID, userID uuid.UUID) (io.ReadCloser, *model.File, error) {
	file, err := s.GetFile(ctx, fileID, userID)
	if err != nil {
		return nil, nil, err
	}

	reader, err := s.storage.DownloadFile(ctx, file.StoragePath)
	if err != nil {
		return nil, nil, err
	}

	return reader, file, nil
}

// UpdateFile updates file metadata
func (s *driveService) UpdateFile(ctx context.Context, fileID uuid.UUID, userID uuid.UUID, req *model.UpdateFileRequest) (*model.File, error) {
	file, err := s.fileRepo.GetByID(ctx, fileID)
	if err != nil {
		return nil, err
	}

	// Check permission
	if file.OwnerID != userID {
		hasPermission, err := s.permissionRepo.HasPermission(ctx, fileID, model.ResourceTypeFile, userID, model.PermissionEditor)
		if err != nil || !hasPermission {
			return nil, fmt.Errorf("permission denied")
		}
	}

	// Update fields
	if req.Name != nil {
		file.Name = *req.Name
	}
	if req.FolderID != nil {
		file.FolderID = req.FolderID
	}
	if req.Description != nil {
		file.Description = req.Description
	}
	if req.Tags != nil {
		file.Tags = *req.Tags
	}
	if req.IsStarred != nil {
		file.IsStarred = *req.IsStarred
	}

	if err := s.fileRepo.Update(ctx, file); err != nil {
		return nil, err
	}

	return file, nil
}

// DeleteFile moves a file to trash
func (s *driveService) DeleteFile(ctx context.Context, fileID uuid.UUID, userID uuid.UUID) error {
	return s.MoveToTrash(ctx, fileID, model.ResourceTypeFile, userID)
}

// MoveFile moves a file to a different folder
func (s *driveService) MoveFile(ctx context.Context, fileID uuid.UUID, userID uuid.UUID, targetFolderID *uuid.UUID) (*model.File, error) {
	return s.UpdateFile(ctx, fileID, userID, &model.UpdateFileRequest{
		FolderID: targetFolderID,
	})
}

// CopyFile creates a copy of a file
func (s *driveService) CopyFile(ctx context.Context, fileID uuid.UUID, userID uuid.UUID, targetFolderID *uuid.UUID) (*model.File, error) {
	// Get original file
	originalFile, err := s.GetFile(ctx, fileID, userID)
	if err != nil {
		return nil, err
	}

	// Generate new ID and storage path
	newFileID := uuid.New()
	newStoragePath := storage.GetStoragePath(originalFile.TenantID, newFileID, originalFile.Name)

	// Copy in storage
	if err := s.storage.CopyFile(ctx, originalFile.StoragePath, newStoragePath); err != nil {
		return nil, err
	}

	// Create new file record
	newFile := &model.File{
		ID:           newFileID,
		TenantID:     originalFile.TenantID,
		OwnerID:      userID,
		FolderID:     targetFolderID,
		Name:         "Copy of " + originalFile.Name,
		OriginalName: originalFile.OriginalName,
		MimeType:     originalFile.MimeType,
		FileType:     originalFile.FileType,
		Size:         originalFile.Size,
		StoragePath:  newStoragePath,
		Version:      1,
		IsStarred:    false,
		IsTrashed:    false,
		Tags:         originalFile.Tags,
		Metadata:     originalFile.Metadata,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.fileRepo.Create(ctx, newFile); err != nil {
		_ = s.storage.DeleteFile(ctx, newStoragePath)
		return nil, err
	}

	return newFile, nil
}

// ListFiles lists files in a folder
func (s *driveService) ListFiles(ctx context.Context, tenantID, userID uuid.UUID, folderID *uuid.UUID, includeShared bool) ([]*model.File, error) {
	return s.fileRepo.GetByTenant(ctx, tenantID, userID, folderID, includeShared)
}

// SearchFiles searches for files
func (s *driveService) SearchFiles(ctx context.Context, tenantID uuid.UUID, query string, fileType *model.FileType) ([]*model.File, error) {
	return s.fileRepo.Search(ctx, tenantID, query, fileType)
}

// GetStarredFiles gets starred files
func (s *driveService) GetStarredFiles(ctx context.Context, tenantID, userID uuid.UUID) ([]*model.File, error) {
	return s.fileRepo.GetStarred(ctx, tenantID, userID)
}

// GetRecentFiles gets recently accessed files
func (s *driveService) GetRecentFiles(ctx context.Context, tenantID, userID uuid.UUID, limit int) ([]*model.File, error) {
	return s.fileRepo.GetRecent(ctx, tenantID, userID, limit)
}

// CreateFolder creates a new folder
func (s *driveService) CreateFolder(ctx context.Context, tenantID, userID uuid.UUID, req *model.CreateFolderRequest) (*model.Folder, error) {
	folder := &model.Folder{
		ID:          uuid.New(),
		TenantID:    tenantID,
		OwnerID:     userID,
		ParentID:    req.ParentID,
		Name:        req.Name,
		Color:       req.Color,
		IsStarred:   false,
		IsTrashed:   false,
		Description: req.Description,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.folderRepo.Create(ctx, folder); err != nil {
		return nil, err
	}

	return folder, nil
}

// GetFolder retrieves a folder by ID
func (s *driveService) GetFolder(ctx context.Context, folderID uuid.UUID, userID uuid.UUID) (*model.Folder, error) {
	folder, err := s.folderRepo.GetByID(ctx, folderID)
	if err != nil {
		return nil, err
	}

	// Check permission
	if folder.OwnerID != userID {
		hasPermission, err := s.permissionRepo.HasPermission(ctx, folderID, model.ResourceTypeFolder, userID, model.PermissionViewer)
		if err != nil || !hasPermission {
			return nil, fmt.Errorf("permission denied")
		}
	}

	return folder, nil
}

// UpdateFolder updates folder metadata
func (s *driveService) UpdateFolder(ctx context.Context, folderID uuid.UUID, userID uuid.UUID, req *model.UpdateFolderRequest) (*model.Folder, error) {
	folder, err := s.folderRepo.GetByID(ctx, folderID)
	if err != nil {
		return nil, err
	}

	// Check permission
	if folder.OwnerID != userID {
		hasPermission, err := s.permissionRepo.HasPermission(ctx, folderID, model.ResourceTypeFolder, userID, model.PermissionEditor)
		if err != nil || !hasPermission {
			return nil, fmt.Errorf("permission denied")
		}
	}

	// Update fields
	if req.Name != nil {
		folder.Name = *req.Name
	}
	if req.ParentID != nil {
		folder.ParentID = req.ParentID
	}
	if req.Color != nil {
		folder.Color = req.Color
	}
	if req.Description != nil {
		folder.Description = req.Description
	}
	if req.IsStarred != nil {
		folder.IsStarred = *req.IsStarred
	}

	if err := s.folderRepo.Update(ctx, folder); err != nil {
		return nil, err
	}

	return folder, nil
}

// DeleteFolder moves a folder to trash
func (s *driveService) DeleteFolder(ctx context.Context, folderID uuid.UUID, userID uuid.UUID) error {
	return s.MoveToTrash(ctx, folderID, model.ResourceTypeFolder, userID)
}

// ListFolders lists folders
func (s *driveService) ListFolders(ctx context.Context, tenantID, userID uuid.UUID, parentID *uuid.UUID, includeShared bool) ([]*model.Folder, error) {
	return s.folderRepo.GetByTenant(ctx, tenantID, userID, parentID, includeShared)
}

// GetFolderPath gets the full path of a folder
func (s *driveService) GetFolderPath(ctx context.Context, folderID uuid.UUID) (string, error) {
	return s.folderRepo.GetPath(ctx, folderID)
}

// MoveToTrash moves a resource to trash
func (s *driveService) MoveToTrash(ctx context.Context, resourceID uuid.UUID, resourceType model.ResourceType, userID uuid.UUID) error {
	if resourceType == model.ResourceTypeFile {
		file, err := s.fileRepo.GetByID(ctx, resourceID)
		if err != nil {
			return err
		}
		if file.OwnerID != userID {
			return fmt.Errorf("permission denied")
		}
		return s.fileRepo.MoveToTrash(ctx, resourceID)
	} else {
		folder, err := s.folderRepo.GetByID(ctx, resourceID)
		if err != nil {
			return err
		}
		if folder.OwnerID != userID {
			return fmt.Errorf("permission denied")
		}
		return s.folderRepo.MoveToTrash(ctx, resourceID)
	}
}

// RestoreFromTrash restores a resource from trash
func (s *driveService) RestoreFromTrash(ctx context.Context, resourceID uuid.UUID, resourceType model.ResourceType, userID uuid.UUID) error {
	if resourceType == model.ResourceTypeFile {
		return s.fileRepo.RestoreFromTrash(ctx, resourceID)
	}
	return s.folderRepo.RestoreFromTrash(ctx, resourceID)
}

// EmptyTrash permanently deletes all trashed items
func (s *driveService) EmptyTrash(ctx context.Context, tenantID, userID uuid.UUID) error {
	// Get trashed files
	files, err := s.fileRepo.GetTrashed(ctx, tenantID, userID)
	if err != nil {
		return err
	}

	// Delete from storage and database
	for _, file := range files {
		_ = s.storage.DeleteFile(ctx, file.StoragePath)
		_ = s.fileRepo.PermanentDelete(ctx, file.ID)
	}

	// Get trashed folders
	folders, err := s.folderRepo.GetTrashed(ctx, tenantID, userID)
	if err != nil {
		return err
	}

	for _, folder := range folders {
		_ = s.folderRepo.PermanentDelete(ctx, folder.ID)
	}

	return nil
}

// ListTrashed lists all trashed items
func (s *driveService) ListTrashed(ctx context.Context, tenantID, userID uuid.UUID) ([]*model.FileInfo, error) {
	var result []*model.FileInfo

	files, _ := s.fileRepo.GetTrashed(ctx, tenantID, userID)
	for _, file := range files {
		result = append(result, &model.FileInfo{
			File: file,
			Type: "file",
		})
	}

	folders, _ := s.folderRepo.GetTrashed(ctx, tenantID, userID)
	for _, folder := range folders {
		result = append(result, &model.FileInfo{
			Folder: folder,
			Type:   "folder",
		})
	}

	return result, nil
}

// GrantPermission grants permission to a user
func (s *driveService) GrantPermission(ctx context.Context, tenantID, userID uuid.UUID, req *model.CreatePermissionRequest) (*model.Permission, error) {
	permission := &model.Permission{
		ID:           uuid.New(),
		TenantID:     tenantID,
		ResourceID:   req.ResourceID,
		ResourceType: req.ResourceType,
		UserID:       req.UserID,
		Email:        req.Email,
		Role:         req.Role,
		GrantedBy:    userID,
		ExpiresAt:    req.ExpiresAt,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.permissionRepo.Create(ctx, permission); err != nil {
		return nil, err
	}

	return permission, nil
}

// RevokePermission revokes a permission
func (s *driveService) RevokePermission(ctx context.Context, permissionID uuid.UUID, userID uuid.UUID) error {
	return s.permissionRepo.Delete(ctx, permissionID)
}

// ListPermissions lists permissions for a resource
func (s *driveService) ListPermissions(ctx context.Context, resourceID uuid.UUID, resourceType model.ResourceType, userID uuid.UUID) ([]*model.Permission, error) {
	return s.permissionRepo.GetByResource(ctx, resourceID, resourceType)
}

// CreateShareLink creates a public share link
func (s *driveService) CreateShareLink(ctx context.Context, tenantID, userID uuid.UUID, req *model.CreateShareLinkRequest) (*model.ShareLink, error) {
	// Generate random token
	token, err := generateToken(32)
	if err != nil {
		return nil, err
	}

	// Hash password if provided
	var passwordHash *string
	if req.Password != nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		hashStr := string(hash)
		passwordHash = &hashStr
	}

	link := &model.ShareLink{
		ID:            uuid.New(),
		TenantID:      tenantID,
		ResourceID:    req.ResourceID,
		ResourceType:  req.ResourceType,
		Token:         token,
		Role:          req.Role,
		Password:      passwordHash,
		ExpiresAt:     req.ExpiresAt,
		MaxDownloads:  req.MaxDownloads,
		DownloadCount: 0,
		CreatedBy:     userID,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := s.shareLinkRepo.Create(ctx, link); err != nil {
		return nil, err
	}

	return link, nil
}

// GetShareLink gets a share link by token
func (s *driveService) GetShareLink(ctx context.Context, token string) (*model.ShareLink, error) {
	return s.shareLinkRepo.GetByToken(ctx, token)
}

// DeleteShareLink deletes a share link
func (s *driveService) DeleteShareLink(ctx context.Context, linkID uuid.UUID, userID uuid.UUID) error {
	return s.shareLinkRepo.Delete(ctx, linkID)
}

// ListVersions lists all versions of a file
func (s *driveService) ListVersions(ctx context.Context, fileID uuid.UUID, userID uuid.UUID) ([]*model.FileVersion, error) {
	// Check permission
	file, err := s.GetFile(ctx, fileID, userID)
	if err != nil {
		return nil, err
	}

	if file.OwnerID != userID {
		hasPermission, err := s.permissionRepo.HasPermission(ctx, fileID, model.ResourceTypeFile, userID, model.PermissionViewer)
		if err != nil || !hasPermission {
			return nil, fmt.Errorf("permission denied")
		}
	}

	return s.versionRepo.GetByFile(ctx, fileID)
}

// RestoreVersion restores a specific version of a file
func (s *driveService) RestoreVersion(ctx context.Context, fileID uuid.UUID, versionNum int, userID uuid.UUID) (*model.File, error) {
	// Get the file and version
	file, err := s.GetFile(ctx, fileID, userID)
	if err != nil {
		return nil, err
	}

	version, err := s.versionRepo.GetByVersion(ctx, fileID, versionNum)
	if err != nil {
		return nil, err
	}

	// Create new version from current
	latestVersion, _ := s.versionRepo.GetLatestVersionNum(ctx, fileID)
	newVersion := &model.FileVersion{
		ID:          uuid.New(),
		FileID:      fileID,
		VersionNum:  latestVersion + 1,
		Size:        file.Size,
		StoragePath: file.StoragePath,
		CreatedBy:   userID,
		Comment:     nil,
		CreatedAt:   time.Now(),
	}
	_ = s.versionRepo.Create(ctx, newVersion)

	// Update file to use old version's storage path
	file.StoragePath = version.StoragePath
	file.Size = version.Size
	file.Version = newVersion.VersionNum
	file.UpdatedAt = time.Now()

	if err := s.fileRepo.Update(ctx, file); err != nil {
		return nil, err
	}

	return file, nil
}

// Helper functions

func determineFileType(mimeType, filename string) model.FileType {
	// Check by MIME type
	if strings.HasPrefix(mimeType, "image/") {
		return model.FileTypeImage
	}
	if strings.HasPrefix(mimeType, "video/") {
		return model.FileTypeVideo
	}
	if strings.HasPrefix(mimeType, "audio/") {
		return model.FileTypeAudio
	}

	// Check by extension
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".doc", ".docx", ".odt", ".txt", ".pdf":
		return model.FileTypeDocument
	case ".xls", ".xlsx", ".ods", ".csv":
		return model.FileTypeSpreadsheet
	case ".ppt", ".pptx", ".odp":
		return model.FileTypePresentation
	case ".zip", ".tar", ".gz", ".rar", ".7z":
		return model.FileTypeArchive
	}

	return model.FileTypeOther
}

func generateToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
