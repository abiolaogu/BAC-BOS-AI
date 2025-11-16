'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpreadsheetStore } from '@/store';
import { columnIndexToLetter, cellPositionToRef } from '@/types/spreadsheet';
import type { CellPosition } from '@/types/spreadsheet';

interface SpreadsheetGridProps {
  sheetId: string;
  rowCount: number;
  columnCount: number;
  onCellUpdate: (row: number, col: number, value: string) => void;
}

const CELL_WIDTH = 100;
const CELL_HEIGHT = 28;
const HEADER_HEIGHT = 28;
const ROW_HEADER_WIDTH = 50;

export default function SpreadsheetGrid({
  sheetId,
  rowCount,
  columnCount,
  onCellUpdate,
}: SpreadsheetGridProps) {
  const {
    getCell,
    selectedCell,
    setSelectedCell,
    startEditing,
    stopEditing,
    isEditing,
    editingCell,
  } = useSpreadsheetStore();

  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    setSelectedCell({ row, col });
  };

  // Handle cell double click - start editing
  const handleCellDoubleClick = (row: number, col: number) => {
    const cell = getCell(sheetId, row, col);
    const value = cell?.formula || cell?.formattedValue || '';
    setEditValue(value);
    startEditing({ row, col });
  };

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selectedCell) return;

      const { row, col } = selectedCell;

      // If editing, handle Enter and Escape
      if (isEditing) {
        if (e.key === 'Enter') {
          e.preventDefault();
          onCellUpdate(row, col, editValue);
          stopEditing();
          setSelectedCell({ row: row + 1, col });
        } else if (e.key === 'Escape') {
          e.preventDefault();
          stopEditing();
          setEditValue('');
        }
        return;
      }

      // Navigation keys
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (row > 0) setSelectedCell({ row: row - 1, col });
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (row < rowCount - 1) setSelectedCell({ row: row + 1, col });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (col > 0) setSelectedCell({ row, col: col - 1 });
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (col < columnCount - 1) setSelectedCell({ row, col: col + 1 });
          break;
        case 'Enter':
          e.preventDefault();
          handleCellDoubleClick(row, col);
          break;
        case 'F2':
          e.preventDefault();
          handleCellDoubleClick(row, col);
          break;
        default:
          // Start editing on any alphanumeric key
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            setEditValue(e.key);
            startEditing({ row, col });
          }
      }
    },
    [selectedCell, isEditing, editValue, rowCount, columnCount, onCellUpdate, startEditing, stopEditing, setSelectedCell]
  );

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Render cell content
  const renderCell = (row: number, col: number) => {
    const cell = getCell(sheetId, row, col);
    const isSelected = selectedCell?.row === row && selectedCell?.col === col;
    const isEditingThis = isEditing && editingCell?.row === row && editingCell?.col === col;

    const style: React.CSSProperties = {
      ...cell?.style,
      backgroundColor: cell?.style?.backgroundColor || (isSelected ? '#e3f2fd' : undefined),
      fontWeight: cell?.style?.bold ? 'bold' : undefined,
      fontStyle: cell?.style?.italic ? 'italic' : undefined,
      textDecoration: cell?.style?.underline ? 'underline' : cell?.style?.strikethrough ? 'line-through' : undefined,
      color: cell?.style?.textColor,
      fontSize: cell?.style?.fontSize,
      fontFamily: cell?.style?.fontFamily,
      textAlign: cell?.style?.horizontalAlign || 'left',
    };

    return (
      <div
        key={`${row}-${col}`}
        className={`
          border border-gray-300 cursor-cell select-none overflow-hidden
          ${isSelected ? 'ring-2 ring-blue-500 z-10' : ''}
        `}
        style={{
          position: 'absolute',
          left: ROW_HEADER_WIDTH + col * CELL_WIDTH,
          top: HEADER_HEIGHT + row * CELL_HEIGHT,
          width: CELL_WIDTH,
          height: CELL_HEIGHT,
          ...style,
        }}
        onClick={() => handleCellClick(row, col)}
        onDoubleClick={() => handleCellDoubleClick(row, col)}
      >
        {isEditingThis ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              onCellUpdate(row, col, editValue);
              stopEditing();
            }}
            className="w-full h-full px-1 border-none outline-none"
            style={{ fontSize: style.fontSize }}
          />
        ) : (
          <div className="px-1 truncate leading-7">{cell?.formattedValue || ''}</div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={gridRef}
      className="relative bg-white overflow-auto"
      style={{ height: 'calc(100vh - 200px)' }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Column headers */}
      <div className="sticky top-0 z-20 bg-gray-100">
        {/* Corner cell */}
        <div
          className="absolute bg-gray-200 border border-gray-300 flex items-center justify-center font-semibold"
          style={{
            left: 0,
            top: 0,
            width: ROW_HEADER_WIDTH,
            height: HEADER_HEIGHT,
          }}
        />

        {/* Column letters */}
        {Array.from({ length: columnCount }).map((_, col) => (
          <div
            key={`col-${col}`}
            className="absolute bg-gray-100 border border-gray-300 flex items-center justify-center text-sm font-semibold"
            style={{
              left: ROW_HEADER_WIDTH + col * CELL_WIDTH,
              top: 0,
              width: CELL_WIDTH,
              height: HEADER_HEIGHT,
            }}
          >
            {columnIndexToLetter(col)}
          </div>
        ))}
      </div>

      {/* Row headers */}
      <div className="sticky left-0 z-10">
        {Array.from({ length: rowCount }).map((_, row) => (
          <div
            key={`row-${row}`}
            className="absolute bg-gray-100 border border-gray-300 flex items-center justify-center text-sm font-semibold"
            style={{
              left: 0,
              top: HEADER_HEIGHT + row * CELL_HEIGHT,
              width: ROW_HEADER_WIDTH,
              height: CELL_HEIGHT,
            }}
          >
            {row + 1}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div
        style={{
          width: ROW_HEADER_WIDTH + columnCount * CELL_WIDTH,
          height: HEADER_HEIGHT + rowCount * CELL_HEIGHT,
          position: 'relative',
        }}
      >
        {Array.from({ length: Math.min(rowCount, 100) }).map((_, row) =>
          Array.from({ length: Math.min(columnCount, 26) }).map((_, col) =>
            renderCell(row, col)
          )
        )}
      </div>
    </div>
  );
}
