package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/nexus/sheets-service/internal/model"
	"github.com/nexus/sheets-service/internal/service"
)

type SpreadsheetHandler struct {
	service service.SpreadsheetService
}

func NewSpreadsheetHandler(service service.SpreadsheetService) *SpreadsheetHandler {
	return &SpreadsheetHandler{service: service}
}

func (h *SpreadsheetHandler) CreateSpreadsheet(w http.ResponseWriter, r *http.Request) {
	var req model.CreateSpreadsheetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, http.StatusBadRequest, "Invalid request body", nil)
		return
	}

	tenantID := getTenantID(r)
	userID := getUserID(r)

	spreadsheet, err := h.service.CreateSpreadsheet(r.Context(), &req, tenantID, userID)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "Failed to create spreadsheet", nil)
		return
	}

	sendJSON(w, http.StatusCreated, spreadsheet)
}

func (h *SpreadsheetHandler) GetSpreadsheet(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		sendError(w, http.StatusBadRequest, "Invalid spreadsheet ID", nil)
		return
	}

	tenantID := getTenantID(r)

	spreadsheet, err := h.service.GetSpreadsheet(r.Context(), id, tenantID)
	if err != nil {
		sendError(w, http.StatusNotFound, "Spreadsheet not found", nil)
		return
	}

	sendJSON(w, http.StatusOK, spreadsheet)
}

func (h *SpreadsheetHandler) ListSpreadsheets(w http.ResponseWriter, r *http.Request) {
	tenantID := getTenantID(r)

	// Parse query parameters
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	search := r.URL.Query().Get("search")
	var searchPtr *string
	if search != "" {
		searchPtr = &search
	}

	query := &model.ListSpreadsheetsQuery{
		Page:      page,
		PageSize:  pageSize,
		Search:    searchPtr,
		SortBy:    r.URL.Query().Get("sortBy"),
		SortOrder: r.URL.Query().Get("sortOrder"),
	}

	spreadsheets, total, err := h.service.ListSpreadsheets(r.Context(), tenantID, query)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "Failed to list spreadsheets", nil)
		return
	}

	response := map[string]interface{}{
		"spreadsheets": spreadsheets,
		"total":        total,
		"page":         page,
		"pageSize":     pageSize,
	}

	sendJSON(w, http.StatusOK, response)
}

func (h *SpreadsheetHandler) UpdateSpreadsheet(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		sendError(w, http.StatusBadRequest, "Invalid spreadsheet ID", nil)
		return
	}

	var req model.UpdateSpreadsheetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, http.StatusBadRequest, "Invalid request body", nil)
		return
	}

	tenantID := getTenantID(r)

	spreadsheet, err := h.service.UpdateSpreadsheet(r.Context(), id, tenantID, &req)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "Failed to update spreadsheet", nil)
		return
	}

	sendJSON(w, http.StatusOK, spreadsheet)
}

func (h *SpreadsheetHandler) DeleteSpreadsheet(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		sendError(w, http.StatusBadRequest, "Invalid spreadsheet ID", nil)
		return
	}

	tenantID := getTenantID(r)

	if err := h.service.DeleteSpreadsheet(r.Context(), id, tenantID); err != nil {
		sendError(w, http.StatusInternalServerError, "Failed to delete spreadsheet", nil)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *SpreadsheetHandler) CreateSheet(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	spreadsheetID, err := uuid.Parse(vars["id"])
	if err != nil {
		sendError(w, http.StatusBadRequest, "Invalid spreadsheet ID", nil)
		return
	}

	var req model.CreateSheetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, http.StatusBadRequest, "Invalid request body", nil)
		return
	}

	sheet, err := h.service.CreateSheet(r.Context(), spreadsheetID, &req)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "Failed to create sheet", nil)
		return
	}

	sendJSON(w, http.StatusCreated, sheet)
}

func (h *SpreadsheetHandler) UpdateSheet(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sheetID, err := uuid.Parse(vars["sheetId"])
	if err != nil {
		sendError(w, http.StatusBadRequest, "Invalid sheet ID", nil)
		return
	}

	var req model.UpdateSheetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, http.StatusBadRequest, "Invalid request body", nil)
		return
	}

	sheet, err := h.service.UpdateSheet(r.Context(), sheetID, &req)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "Failed to update sheet", nil)
		return
	}

	sendJSON(w, http.StatusOK, sheet)
}

func (h *SpreadsheetHandler) DeleteSheet(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sheetID, err := uuid.Parse(vars["sheetId"])
	if err != nil {
		sendError(w, http.StatusBadRequest, "Invalid sheet ID", nil)
		return
	}

	if err := h.service.DeleteSheet(r.Context(), sheetID); err != nil {
		sendError(w, http.StatusInternalServerError, "Failed to delete sheet", nil)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *SpreadsheetHandler) UpdateCell(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sheetID, err := uuid.Parse(vars["sheetId"])
	if err != nil {
		sendError(w, http.StatusBadRequest, "Invalid sheet ID", nil)
		return
	}

	rowIndex, err := strconv.Atoi(vars["row"])
	if err != nil {
		sendError(w, http.StatusBadRequest, "Invalid row index", nil)
		return
	}

	colIndex, err := strconv.Atoi(vars["col"])
	if err != nil {
		sendError(w, http.StatusBadRequest, "Invalid column index", nil)
		return
	}

	var req model.UpdateCellRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, http.StatusBadRequest, "Invalid request body", nil)
		return
	}

	cell, err := h.service.UpdateCell(r.Context(), sheetID, rowIndex, colIndex, &req)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "Failed to update cell", nil)
		return
	}

	sendJSON(w, http.StatusOK, cell)
}

func (h *SpreadsheetHandler) BatchUpdateCells(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sheetID, err := uuid.Parse(vars["sheetId"])
	if err != nil {
		sendError(w, http.StatusBadRequest, "Invalid sheet ID", nil)
		return
	}

	var req model.BatchUpdateCellsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, http.StatusBadRequest, "Invalid request body", nil)
		return
	}

	if err := h.service.BatchUpdateCells(r.Context(), sheetID, &req); err != nil {
		sendError(w, http.StatusInternalServerError, "Failed to batch update cells", nil)
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{"message": "Cells updated successfully"})
}

func (h *SpreadsheetHandler) GetCells(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sheetID, err := uuid.Parse(vars["sheetId"])
	if err != nil {
		sendError(w, http.StatusBadRequest, "Invalid sheet ID", nil)
		return
	}

	startRow, _ := strconv.Atoi(r.URL.Query().Get("startRow"))
	endRow, _ := strconv.Atoi(r.URL.Query().Get("endRow"))
	startCol, _ := strconv.Atoi(r.URL.Query().Get("startCol"))
	endCol, _ := strconv.Atoi(r.URL.Query().Get("endCol"))

	query := &model.GetCellsQuery{
		StartRow:    startRow,
		EndRow:      endRow,
		StartColumn: startCol,
		EndColumn:   endCol,
	}

	cells, err := h.service.GetCells(r.Context(), sheetID, query)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "Failed to get cells", nil)
		return
	}

	sendJSON(w, http.StatusOK, cells)
}

// Helper functions
func sendJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func sendError(w http.ResponseWriter, status int, message string, details interface{}) {
	response := map[string]interface{}{
		"error":   message,
		"details": details,
	}
	sendJSON(w, status, response)
}

func getTenantID(r *http.Request) uuid.UUID {
	return r.Context().Value("tenantID").(uuid.UUID)
}

func getUserID(r *http.Request) uuid.UUID {
	return r.Context().Value("userID").(uuid.UUID)
}
