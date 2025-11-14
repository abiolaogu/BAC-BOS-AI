// internal/service/document_service.go
package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/nexus/writer-service/internal/model"
	"github.com/nexus/writer-service/internal/repository"
)

type DocumentService interface {
	CreateDocument(ctx context.Context, req *model.CreateDocumentRequest, tenantID, userID uuid.UUID) (*model.Document, error)
	GetDocument(ctx context.Context, id, tenantID uuid.UUID) (*model.Document, error)
	UpdateDocument(ctx context.Context, id, tenantID uuid.UUID, req *model.UpdateDocumentRequest) (*model.Document, error)
	DeleteDocument(ctx context.Context, id, tenantID uuid.UUID, permanent bool) error
	ListDocuments(ctx context.Context, tenantID uuid.UUID, query *model.ListDocumentsQuery) (*model.PaginatedResponse, error)
	SearchDocuments(ctx context.Context, tenantID uuid.UUID, searchQuery string, page, limit int) ([]*model.Document, error)
	CreateVersion(ctx context.Context, documentID, tenantID, userID uuid.UUID, changeSummary string) (*model.DocumentVersion, error)
	ListVersions(ctx context.Context, documentID, tenantID uuid.UUID) ([]*model.DocumentVersion, error)
	RestoreVersion(ctx context.Context, documentID, versionID, tenantID, userID uuid.UUID) (*model.Document, error)
	ShareDocument(ctx context.Context, documentID, tenantID, userID uuid.UUID, req *model.ShareDocumentRequest) error
	GetPermissions(ctx context.Context, documentID uuid.UUID) ([]model.Permission, error)
	RevokePermission(ctx context.Context, documentID, userID, tenantID uuid.UUID) error
	GetActivity(ctx context.Context, documentID, tenantID uuid.UUID, limit int) ([]*model.Activity, error)
}

type documentService struct {
	documentRepo repository.DocumentRepository
	versionRepo  repository.VersionRepository
	activityRepo repository.ActivityRepository
	logger       *zap.Logger
}

func NewDocumentService(
	documentRepo repository.DocumentRepository,
	versionRepo repository.VersionRepository,
	activityRepo repository.ActivityRepository,
	logger *zap.Logger,
) DocumentService {
	return &documentService{
		documentRepo: documentRepo,
		versionRepo:  versionRepo,
		activityRepo: activityRepo,
		logger:       logger,
	}
}

func (s *documentService) CreateDocument(ctx context.Context, req *model.CreateDocumentRequest, tenantID, userID uuid.UUID) (*model.Document, error) {
	doc := &model.Document{
		ID:        uuid.New(),
		TenantID:  tenantID,
		Title:     req.Title,
		Content:   req.Content,
		CreatedBy: userID,
		Version:   1,
		Status:    "draft",
		FolderID:  req.FolderID,
	}

	if err := s.documentRepo.Create(ctx, doc); err != nil {
		s.logger.Error("Failed to create document", zap.Error(err))
		return nil, fmt.Errorf("failed to create document: %w", err)
	}

	// Log activity
	_ = s.logActivity(ctx, doc.ID, userID, "document.created", nil)

	return doc, nil
}

func (s *documentService) GetDocument(ctx context.Context, id, tenantID uuid.UUID) (*model.Document, error) {
	doc, err := s.documentRepo.GetByID(ctx, id, tenantID)
	if err != nil {
		s.logger.Error("Failed to get document", zap.Error(err), zap.String("documentId", id.String()))
		return nil, fmt.Errorf("failed to get document: %w", err)
	}

	// Load permissions
	permissions, err := s.documentRepo.GetPermissions(ctx, id)
	if err == nil {
		doc.Permissions = permissions
	}

	return doc, nil
}

func (s *documentService) UpdateDocument(ctx context.Context, id, tenantID uuid.UUID, req *model.UpdateDocumentRequest) (*model.Document, error) {
	doc, err := s.documentRepo.GetByID(ctx, id, tenantID)
	if err != nil {
		return nil, fmt.Errorf("document not found: %w", err)
	}

	// Update fields if provided
	if req.Title != nil {
		doc.Title = *req.Title
	}
	if req.Content != nil {
		doc.Content = *req.Content
	}
	if req.Status != nil {
		doc.Status = *req.Status
	}

	if err := s.documentRepo.Update(ctx, doc); err != nil {
		s.logger.Error("Failed to update document", zap.Error(err))
		return nil, fmt.Errorf("failed to update document: %w", err)
	}

	// Log activity
	_ = s.logActivity(ctx, doc.ID, doc.CreatedBy, "document.updated", map[string]interface{}{
		"version": doc.Version,
	})

	return doc, nil
}

func (s *documentService) DeleteDocument(ctx context.Context, id, tenantID uuid.UUID, permanent bool) error {
	if err := s.documentRepo.Delete(ctx, id, tenantID, permanent); err != nil {
		s.logger.Error("Failed to delete document", zap.Error(err))
		return fmt.Errorf("failed to delete document: %w", err)
	}
	return nil
}

func (s *documentService) ListDocuments(ctx context.Context, tenantID uuid.UUID, query *model.ListDocumentsQuery) (*model.PaginatedResponse, error) {
	documents, total, err := s.documentRepo.List(ctx, tenantID, query)
	if err != nil {
		s.logger.Error("Failed to list documents", zap.Error(err))
		return nil, fmt.Errorf("failed to list documents: %w", err)
	}

	totalPages := (total + query.Limit - 1) / query.Limit

	return &model.PaginatedResponse{
		Data: documents,
		Pagination: model.Pagination{
			Page:       query.Page,
			Limit:      query.Limit,
			Total:      total,
			TotalPages: totalPages,
			HasMore:    query.Page < totalPages,
		},
	}, nil
}

func (s *documentService) SearchDocuments(ctx context.Context, tenantID uuid.UUID, searchQuery string, page, limit int) ([]*model.Document, error) {
	offset := (page - 1) * limit
	documents, err := s.documentRepo.Search(ctx, tenantID, searchQuery, limit, offset)
	if err != nil {
		s.logger.Error("Failed to search documents", zap.Error(err))
		return nil, fmt.Errorf("failed to search documents: %w", err)
	}
	return documents, nil
}

func (s *documentService) CreateVersion(ctx context.Context, documentID, tenantID, userID uuid.UUID, changeSummary string) (*model.DocumentVersion, error) {
	doc, err := s.documentRepo.GetByID(ctx, documentID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("document not found: %w", err)
	}

	version := &model.DocumentVersion{
		ID:            uuid.New(),
		DocumentID:    documentID,
		Version:       doc.Version,
		Content:       doc.Content,
		CreatedBy:     userID,
		ChangeSummary: &changeSummary,
	}

	if err := s.versionRepo.Create(ctx, version); err != nil {
		s.logger.Error("Failed to create version", zap.Error(err))
		return nil, fmt.Errorf("failed to create version: %w", err)
	}

	return version, nil
}

func (s *documentService) ListVersions(ctx context.Context, documentID, tenantID uuid.UUID) ([]*model.DocumentVersion, error) {
	// Verify document exists and user has access
	if _, err := s.documentRepo.GetByID(ctx, documentID, tenantID); err != nil {
		return nil, fmt.Errorf("document not found: %w", err)
	}

	versions, err := s.versionRepo.List(ctx, documentID)
	if err != nil {
		s.logger.Error("Failed to list versions", zap.Error(err))
		return nil, fmt.Errorf("failed to list versions: %w", err)
	}

	return versions, nil
}

func (s *documentService) RestoreVersion(ctx context.Context, documentID, versionID, tenantID, userID uuid.UUID) (*model.Document, error) {
	version, err := s.versionRepo.GetByID(ctx, versionID)
	if err != nil {
		return nil, fmt.Errorf("version not found: %w", err)
	}

	doc, err := s.documentRepo.GetByID(ctx, documentID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("document not found: %w", err)
	}

	doc.Content = version.Content
	if err := s.documentRepo.Update(ctx, doc); err != nil {
		return nil, fmt.Errorf("failed to restore version: %w", err)
	}

	// Log activity
	_ = s.logActivity(ctx, doc.ID, userID, "version.restored", map[string]interface{}{
		"versionId":      versionID.String(),
		"restoredTo":     doc.Version,
		"restoredFrom":   version.Version,
	})

	return doc, nil
}

func (s *documentService) ShareDocument(ctx context.Context, documentID, tenantID, userID uuid.UUID, req *model.ShareDocumentRequest) error {
	// Verify document exists
	if _, err := s.documentRepo.GetByID(ctx, documentID, tenantID); err != nil {
		return fmt.Errorf("document not found: %w", err)
	}

	for _, recipient := range req.Users {
		if recipient.UserID != nil {
			perm := &model.Permission{
				DocumentID: documentID,
				UserID:     *recipient.UserID,
				Permission: recipient.Permission,
				AddedBy:    userID,
			}
			if err := s.documentRepo.AddPermission(ctx, perm); err != nil {
				s.logger.Error("Failed to add permission", zap.Error(err))
				return fmt.Errorf("failed to add permission: %w", err)
			}
		}
	}

	// Log activity
	_ = s.logActivity(ctx, documentID, userID, "document.shared", map[string]interface{}{
		"recipientCount": len(req.Users),
	})

	return nil
}

func (s *documentService) GetPermissions(ctx context.Context, documentID uuid.UUID) ([]model.Permission, error) {
	permissions, err := s.documentRepo.GetPermissions(ctx, documentID)
	if err != nil {
		s.logger.Error("Failed to get permissions", zap.Error(err))
		return nil, fmt.Errorf("failed to get permissions: %w", err)
	}
	return permissions, nil
}

func (s *documentService) RevokePermission(ctx context.Context, documentID, userID, tenantID uuid.UUID) error {
	if err := s.documentRepo.RevokePermission(ctx, documentID, userID); err != nil {
		s.logger.Error("Failed to revoke permission", zap.Error(err))
		return fmt.Errorf("failed to revoke permission: %w", err)
	}
	return nil
}

func (s *documentService) GetActivity(ctx context.Context, documentID, tenantID uuid.UUID, limit int) ([]*model.Activity, error) {
	// Verify document exists
	if _, err := s.documentRepo.GetByID(ctx, documentID, tenantID); err != nil {
		return nil, fmt.Errorf("document not found: %w", err)
	}

	activities, err := s.activityRepo.GetByDocumentID(ctx, documentID, limit)
	if err != nil {
		s.logger.Error("Failed to get activity", zap.Error(err))
		return nil, fmt.Errorf("failed to get activity: %w", err)
	}

	return activities, nil
}

func (s *documentService) logActivity(ctx context.Context, documentID, userID uuid.UUID, action string, metadata map[string]interface{}) error {
	activity := &model.Activity{
		ID:         uuid.New(),
		DocumentID: documentID,
		UserID:     userID,
		Action:     action,
		Metadata:   metadata,
	}
	return s.activityRepo.Create(ctx, activity)
}

// CommentService handles comments
type CommentService interface {
	AddComment(ctx context.Context, documentID, userID uuid.UUID, req *model.CreateCommentRequest) (*model.Comment, error)
	GetComments(ctx context.Context, documentID uuid.UUID) ([]*model.Comment, error)
	UpdateComment(ctx context.Context, id, userID uuid.UUID, req *model.UpdateCommentRequest) (*model.Comment, error)
	DeleteComment(ctx context.Context, id, userID uuid.UUID) error
	ResolveComment(ctx context.Context, id, userID uuid.UUID) error
}

type commentService struct {
	commentRepo repository.CommentRepository
	logger      *zap.Logger
}

func NewCommentService(commentRepo repository.CommentRepository, logger *zap.Logger) CommentService {
	return &commentService{
		commentRepo: commentRepo,
		logger:      logger,
	}
}

func (s *commentService) AddComment(ctx context.Context, documentID, userID uuid.UUID, req *model.CreateCommentRequest) (*model.Comment, error) {
	comment := &model.Comment{
		ID:         uuid.New(),
		DocumentID: documentID,
		UserID:     userID,
		Content:    req.Content,
		Position:   req.Position,
	}

	if err := s.commentRepo.Create(ctx, comment); err != nil {
		s.logger.Error("Failed to create comment", zap.Error(err))
		return nil, fmt.Errorf("failed to create comment: %w", err)
	}

	return comment, nil
}

func (s *commentService) GetComments(ctx context.Context, documentID uuid.UUID) ([]*model.Comment, error) {
	comments, err := s.commentRepo.GetByDocumentID(ctx, documentID)
	if err != nil {
		s.logger.Error("Failed to get comments", zap.Error(err))
		return nil, fmt.Errorf("failed to get comments: %w", err)
	}
	return comments, nil
}

func (s *commentService) UpdateComment(ctx context.Context, id, userID uuid.UUID, req *model.UpdateCommentRequest) (*model.Comment, error) {
	comment := &model.Comment{
		ID:      id,
		Content: req.Content,
	}

	if err := s.commentRepo.Update(ctx, comment); err != nil {
		s.logger.Error("Failed to update comment", zap.Error(err))
		return nil, fmt.Errorf("failed to update comment: %w", err)
	}

	return comment, nil
}

func (s *commentService) DeleteComment(ctx context.Context, id, userID uuid.UUID) error {
	if err := s.commentRepo.Delete(ctx, id); err != nil {
		s.logger.Error("Failed to delete comment", zap.Error(err))
		return fmt.Errorf("failed to delete comment: %w", err)
	}
	return nil
}

func (s *commentService) ResolveComment(ctx context.Context, id, userID uuid.UUID) error {
	if err := s.commentRepo.Resolve(ctx, id, userID); err != nil {
		s.logger.Error("Failed to resolve comment", zap.Error(err))
		return fmt.Errorf("failed to resolve comment: %w", err)
	}
	return nil
}
