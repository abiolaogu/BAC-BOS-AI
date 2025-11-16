package handler

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/nexus/slides-service/internal/model"
	"github.com/nexus/slides-service/internal/service"
)

type PresentationHandler struct {
	service service.PresentationService
}

func NewPresentationHandler(service service.PresentationService) *PresentationHandler {
	return &PresentationHandler{service: service}
}

// Presentation handlers

func (h *PresentationHandler) CreatePresentation(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID, userID := getTenantAndUserID(r)

	var req model.CreatePresentationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	presentation, err := h.service.CreatePresentation(ctx, tenantID, userID, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, presentation)
}

func (h *PresentationHandler) GetPresentation(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := getUUID(r, "id")

	presentation, err := h.service.GetPresentation(ctx, id)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, presentation)
}

func (h *PresentationHandler) ListPresentations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID, userID := getTenantAndUserID(r)

	presentations, err := h.service.ListPresentations(ctx, tenantID, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, presentations)
}

func (h *PresentationHandler) UpdatePresentation(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	id := getUUID(r, "id")

	var req model.UpdatePresentationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	presentation, err := h.service.UpdatePresentation(ctx, id, userID, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, presentation)
}

func (h *PresentationHandler) DeletePresentation(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	id := getUUID(r, "id")

	if err := h.service.DeletePresentation(ctx, id, userID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Presentation deleted"})
}

// Slide handlers

func (h *PresentationHandler) CreateSlide(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)

	var req model.CreateSlideRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	slide, err := h.service.CreateSlide(ctx, userID, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, slide)
}

func (h *PresentationHandler) GetSlide(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := getUUID(r, "id")

	slide, err := h.service.GetSlide(ctx, id)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, slide)
}

func (h *PresentationHandler) ListSlides(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	presentationID := getUUID(r, "presentation_id")

	slides, err := h.service.ListSlides(ctx, presentationID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, slides)
}

func (h *PresentationHandler) UpdateSlide(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	id := getUUID(r, "id")

	var req model.UpdateSlideRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	slide, err := h.service.UpdateSlide(ctx, id, userID, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, slide)
}

func (h *PresentationHandler) DeleteSlide(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	id := getUUID(r, "id")

	if err := h.service.DeleteSlide(ctx, id, userID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Slide deleted"})
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
