'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore, useSpreadsheetStore } from '@/store';
import { spreadsheetsApi } from '@/lib/api';
import SpreadsheetGrid from '@/components/spreadsheet/SpreadsheetGrid';
import FormulaBar from '@/components/spreadsheet/FormulaBar';
import Toolbar from '@/components/spreadsheet/Toolbar';
import SheetTabs from '@/components/spreadsheet/SheetTabs';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

export default function SpreadsheetPage() {
  const params = useParams();
  const router = useRouter();
  const spreadsheetId = params.id as string;

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isLoading);

  const {
    currentSpreadsheet,
    setCurrentSpreadsheet,
    activeSheetId,
    setActiveSheet,
    getActiveSheet,
    setCells,
    setCell,
    selectedCell,
  } = useSpreadsheetStore();

  const [isLoading, setIsLoading] = useState(true);

  // Load spreadsheet
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && spreadsheetId) {
      loadSpreadsheet();
    }
  }, [isAuthLoading, isAuthenticated, spreadsheetId]);

  // Load cells when sheet changes
  useEffect(() => {
    if (activeSheetId) {
      loadCells();
    }
  }, [activeSheetId]);

  const loadSpreadsheet = async () => {
    try {
      setIsLoading(true);
      const spreadsheet = await spreadsheetsApi.get(spreadsheetId);
      setCurrentSpreadsheet(spreadsheet);
    } catch (error: any) {
      toast.error('Failed to load spreadsheet');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCells = async () => {
    if (!activeSheetId) return;

    try {
      const cells = await spreadsheetsApi.getCells(activeSheetId, {
        startRow: 0,
        endRow: 99,
        startColumn: 0,
        endColumn: 25,
      });
      setCells(cells);
    } catch (error: any) {
      console.error('Failed to load cells:', error);
    }
  };

  const handleCellUpdate = async (row: number, col: number, value: string) => {
    if (!activeSheetId) return;

    try {
      const updateData: any = {};

      // Check if it's a formula (starts with =)
      if (value.startsWith('=')) {
        updateData.formula = value;
      } else {
        // Parse as number if possible, otherwise string
        const numValue = parseFloat(value);
        updateData.value = isNaN(numValue) ? value : numValue;
      }

      const cell = await spreadsheetsApi.updateCell(activeSheetId, row, col, updateData);
      setCell(cell);
      toast.success('Cell updated');
    } catch (error: any) {
      toast.error('Failed to update cell');
      console.error(error);
    }
  };

  const handleFormulaSubmit = (formula: string) => {
    if (selectedCell && activeSheetId) {
      handleCellUpdate(selectedCell.row, selectedCell.col, formula);
    }
  };

  const handleFormatChange = async (format: any) => {
    if (!selectedCell || !activeSheetId) return;

    try {
      const cell = await spreadsheetsApi.updateCell(
        activeSheetId,
        selectedCell.row,
        selectedCell.col,
        { style: format }
      );
      setCell(cell);
      toast.success('Format applied');
    } catch (error: any) {
      toast.error('Failed to apply format');
    }
  };

  const handleAddSheet = async () => {
    if (!currentSpreadsheet) return;

    try {
      const sheetCount = currentSpreadsheet.sheets.length;
      const sheet = await spreadsheetsApi.createSheet(spreadsheetId, {
        name: `Sheet${sheetCount + 1}`,
        rowCount: 1000,
        columnCount: 26,
      });

      // Reload spreadsheet to get updated sheets
      await loadSpreadsheet();
      setActiveSheet(sheet.id);
      toast.success('Sheet added');
    } catch (error: any) {
      toast.error('Failed to add sheet');
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentSpreadsheet) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Spreadsheet not found
          </h2>
          <p className="text-gray-600">
            The spreadsheet you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  const activeSheet = getActiveSheet();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-semibold text-gray-900">
          {currentSpreadsheet.title}
        </h1>
      </div>

      {/* Toolbar */}
      <Toolbar onFormatChange={handleFormatChange} />

      {/* Formula Bar */}
      <FormulaBar onFormulaSubmit={handleFormulaSubmit} />

      {/* Grid */}
      {activeSheet && (
        <SpreadsheetGrid
          sheetId={activeSheet.id}
          rowCount={activeSheet.rowCount}
          columnCount={activeSheet.columnCount}
          onCellUpdate={handleCellUpdate}
        />
      )}

      {/* Sheet Tabs */}
      <SheetTabs
        sheets={currentSpreadsheet.sheets}
        activeSheetId={activeSheetId}
        onSheetChange={setActiveSheet}
        onAddSheet={handleAddSheet}
      />
    </div>
  );
}
