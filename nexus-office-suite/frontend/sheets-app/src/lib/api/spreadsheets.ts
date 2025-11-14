import { apiClient } from './client';
import type {
  Spreadsheet,
  CreateSpreadsheetRequest,
  UpdateSpreadsheetRequest,
  ListSpreadsheetsQuery,
  ListSpreadsheetsResponse,
  CreateSheetRequest,
  UpdateSheetRequest,
  Sheet,
  Cell,
  UpdateCellRequest,
  BatchUpdateCellsRequest,
  GetCellsQuery,
} from '@/types/spreadsheet';

export const spreadsheetsApi = {
  // Spreadsheet operations
  create: async (data: CreateSpreadsheetRequest): Promise<Spreadsheet> => {
    const response = await apiClient.post<Spreadsheet>('/spreadsheets', data);
    return response.data;
  },

  get: async (id: string): Promise<Spreadsheet> => {
    const response = await apiClient.get<Spreadsheet>(`/spreadsheets/${id}`);
    return response.data;
  },

  list: async (query?: ListSpreadsheetsQuery): Promise<ListSpreadsheetsResponse> => {
    const response = await apiClient.get<ListSpreadsheetsResponse>('/spreadsheets', query);
    return response.data;
  },

  update: async (id: string, data: UpdateSpreadsheetRequest): Promise<Spreadsheet> => {
    const response = await apiClient.put<Spreadsheet>(`/spreadsheets/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/spreadsheets/${id}`);
  },

  // Sheet operations
  createSheet: async (spreadsheetId: string, data: CreateSheetRequest): Promise<Sheet> => {
    const response = await apiClient.post<Sheet>(`/spreadsheets/${spreadsheetId}/sheets`, data);
    return response.data;
  },

  updateSheet: async (sheetId: string, data: UpdateSheetRequest): Promise<Sheet> => {
    const response = await apiClient.put<Sheet>(`/sheets/${sheetId}`, data);
    return response.data;
  },

  deleteSheet: async (sheetId: string): Promise<void> => {
    await apiClient.delete(`/sheets/${sheetId}`);
  },

  // Cell operations
  getCells: async (sheetId: string, query: GetCellsQuery): Promise<Cell[]> => {
    const response = await apiClient.get<Cell[]>(`/sheets/${sheetId}/cells`, query);
    return response.data;
  },

  updateCell: async (
    sheetId: string,
    row: number,
    col: number,
    data: UpdateCellRequest
  ): Promise<Cell> => {
    const response = await apiClient.put<Cell>(`/sheets/${sheetId}/cells/${row}/${col}`, data);
    return response.data;
  },

  batchUpdateCells: async (sheetId: string, data: BatchUpdateCellsRequest): Promise<void> => {
    await apiClient.post(`/sheets/${sheetId}/cells`, data);
  },
};
