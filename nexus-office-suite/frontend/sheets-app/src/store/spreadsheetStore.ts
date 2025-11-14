import { create } from 'zustand';
import type { Spreadsheet, Sheet, Cell, CellSelection, CellPosition } from '@/types/spreadsheet';

interface SpreadsheetState {
  // Current spreadsheet
  currentSpreadsheet: Spreadsheet | null;
  activeSheetId: string | null;

  // Cell data (sparse storage)
  cells: Map<string, Cell>; // key: "sheetId:row:col"

  // UI state
  selectedCell: CellPosition | null;
  selection: CellSelection | null;
  editingCell: CellPosition | null;
  isEditing: boolean;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  setCurrentSpreadsheet: (spreadsheet: Spreadsheet | null) => void;
  setActiveSheet: (sheetId: string) => void;
  getActiveSheet: () => Sheet | null;

  // Cell operations
  setCells: (cells: Cell[]) => void;
  setCell: (cell: Cell) => void;
  getCell: (sheetId: string, row: number, col: number) => Cell | null;
  clearCells: () => void;

  // Selection
  setSelectedCell: (position: CellPosition | null) => void;
  setSelection: (selection: CellSelection | null) => void;

  // Editing
  startEditing: (position: CellPosition) => void;
  stopEditing: () => void;

  // Loading states
  setLoading: (isLoading: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  currentSpreadsheet: null,
  activeSheetId: null,
  cells: new Map(),
  selectedCell: null,
  selection: null,
  editingCell: null,
  isEditing: false,
  isLoading: false,
  isSaving: false,
  error: null,
};

function cellKey(sheetId: string, row: number, col: number): string {
  return `${sheetId}:${row}:${col}`;
}

export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  ...initialState,

  setCurrentSpreadsheet: (spreadsheet) => {
    set({
      currentSpreadsheet: spreadsheet,
      activeSheetId: spreadsheet?.sheets[0]?.id || null,
      error: null,
    });
  },

  setActiveSheet: (sheetId) => {
    set({ activeSheetId: sheetId });
  },

  getActiveSheet: () => {
    const { currentSpreadsheet, activeSheetId } = get();
    if (!currentSpreadsheet || !activeSheetId) return null;
    return currentSpreadsheet.sheets.find(s => s.id === activeSheetId) || null;
  },

  setCells: (cells) => {
    const cellsMap = new Map();
    cells.forEach(cell => {
      const key = cellKey(cell.sheetId, cell.rowIndex, cell.columnIndex);
      cellsMap.set(key, cell);
    });
    set({ cells: cellsMap });
  },

  setCell: (cell) => {
    set((state) => {
      const newCells = new Map(state.cells);
      const key = cellKey(cell.sheetId, cell.rowIndex, cell.columnIndex);
      newCells.set(key, cell);
      return { cells: newCells };
    });
  },

  getCell: (sheetId, row, col) => {
    const key = cellKey(sheetId, row, col);
    return get().cells.get(key) || null;
  },

  clearCells: () => {
    set({ cells: new Map() });
  },

  setSelectedCell: (position) => {
    set({
      selectedCell: position,
      selection: position ? {
        startRow: position.row,
        startCol: position.col,
        endRow: position.row,
        endCol: position.col,
      } : null,
    });
  },

  setSelection: (selection) => {
    set({ selection });
  },

  startEditing: (position) => {
    set({
      editingCell: position,
      isEditing: true,
    });
  },

  stopEditing: () => {
    set({
      editingCell: null,
      isEditing: false,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setSaving: (isSaving) => set({ isSaving }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
