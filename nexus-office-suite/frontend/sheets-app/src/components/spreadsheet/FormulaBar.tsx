'use client';

import { useState, useEffect } from 'react';
import { useSpreadsheetStore } from '@/store';
import { cellPositionToRef } from '@/types/spreadsheet';

interface FormulaBarProps {
  onFormulaSubmit: (formula: string) => void;
}

export default function FormulaBar({ onFormulaSubmit }: FormulaBarProps) {
  const { selectedCell, getCell, isEditing, editingCell } = useSpreadsheetStore();
  const activeSheetId = useSpreadsheetStore((state) => state.activeSheetId);
  const [formulaValue, setFormulaValue] = useState('');

  // Update formula value when selected cell changes
  useEffect(() => {
    if (selectedCell && activeSheetId && !isEditing) {
      const cell = getCell(activeSheetId, selectedCell.row, selectedCell.col);
      const value = cell?.formula || cell?.formattedValue || '';
      setFormulaValue(value);
    }
  }, [selectedCell, activeSheetId, getCell, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFormulaSubmit(formulaValue);
  };

  const cellRef = selectedCell ? cellPositionToRef(selectedCell.row, selectedCell.col) : '';

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
      {/* Cell reference */}
      <div className="flex items-center gap-2 min-w-[100px]">
        <span className="text-sm font-semibold text-gray-700">{cellRef}</span>
      </div>

      {/* Formula input */}
      <form onSubmit={handleSubmit} className="flex-1">
        <input
          type="text"
          value={formulaValue}
          onChange={(e) => setFormulaValue(e.target.value)}
          placeholder="Enter formula or value..."
          className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!selectedCell}
        />
      </form>
    </div>
  );
}
