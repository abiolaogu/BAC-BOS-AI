// internal/handler/handlers.go - Combined handlers for brevity
package handler

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/nexus/writer-service/internal/model"
	"github.com/nexus/writer-service/internal/service"
)

// CommentHandler handles comment-related requests
type CommentHandler struct {
	commentService service.CommentService
	logger         *zap.Logger
}

func NewCommentHandler(commentService service.CommentService, logger *zap.Logger) *CommentHandler {
	return &CommentHandler{
		commentService: commentService,
		logger:         logger,
	}
}

func (h *CommentHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	documentID, err := uuid.Parse(vars["id"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid document ID")
		return
	}

	comments, err := h.commentService.GetComments(r.Context(), documentID)
	if err != nil {
		h.logger.Error("Failed to get comments", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to get comments")
		return
	}

	h.sendJSON(w, http.StatusOK, map[string]interface{}{"data": comments})
}

func (h *CommentHandler) AddComment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	documentID, err := uuid.Parse(vars["id"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid document ID")
		return
	}

	var req model.CreateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	userID := getUserID(r)
	comment, err := h.commentService.AddComment(r.Context(), documentID, userID, &req)
	if err != nil {
		h.logger.Error("Failed to add comment", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to add comment")
		return
	}

	h.sendJSON(w, http.StatusCreated, comment)
}

func (h *CommentHandler) UpdateComment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	commentID, err := uuid.Parse(vars["commentId"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid comment ID")
		return
	}

	var req model.UpdateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	userID := getUserID(r)
	comment, err := h.commentService.UpdateComment(r.Context(), commentID, userID, &req)
	if err != nil {
		h.logger.Error("Failed to update comment", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to update comment")
		return
	}

	h.sendJSON(w, http.StatusOK, comment)
}

func (h *CommentHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	commentID, err := uuid.Parse(vars["commentId"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid comment ID")
		return
	}

	userID := getUserID(r)
	if err := h.commentService.DeleteComment(r.Context(), commentID, userID); err != nil {
		h.logger.Error("Failed to delete comment", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to delete comment")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *CommentHandler) ResolveComment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	commentID, err := uuid.Parse(vars["commentId"])
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid comment ID")
		return
	}

	userID := getUserID(r)
	if err := h.commentService.ResolveComment(r.Context(), commentID, userID); err != nil {
		h.logger.Error("Failed to resolve comment", zap.Error(err))
		h.sendError(w, http.StatusInternalServerError, "Failed to resolve comment")
		return
	}

	h.sendJSON(w, http.StatusOK, map[string]bool{"resolved": true})
}

func (h *CommentHandler) sendJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (h *CommentHandler) sendError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(model.ErrorResponse{
		StatusCode: status,
		Message:    message,
	})
}

// HealthHandler handles health check requests
type HealthHandler struct {
	db     *sqlx.DB
	redis  *redis.Client
	logger *zap.Logger
}

func NewHealthHandler(db *sqlx.DB, redis *redis.Client, logger *zap.Logger) *HealthHandler {
	return &HealthHandler{
		db:     db,
		redis:  redis,
		logger: logger,
	}
}

func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "ok",
		"service": "writer-service",
	})
}

func (h *HealthHandler) Ready(w http.ResponseWriter, r *http.Request) {
	// Check database
	if err := h.db.Ping(); err != nil {
		h.logger.Error("Database health check failed", zap.Error(err))
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{
			"status": "unavailable",
			"reason": "database_connection_failed",
		})
		return
	}

	// Check Redis
	if err := h.redis.Ping(r.Context()).Err(); err != nil {
		h.logger.Error("Redis health check failed", zap.Error(err))
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{
			"status": "unavailable",
			"reason": "redis_connection_failed",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "ready",
	})
}
