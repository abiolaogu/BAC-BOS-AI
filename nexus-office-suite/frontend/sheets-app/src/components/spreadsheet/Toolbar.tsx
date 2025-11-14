'use client';

import { useSpreadsheetStore } from '@/store';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  PaintBrushIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface ToolbarProps {
  onFormatChange: (format: any) => void;
}

export default function Toolbar({ onFormatChange }: ToolbarProps) {
  const { selectedCell } = useSpreadsheetStore();

  const handleBold = () => {
    onFormatChange({ bold: true });
  };

  const handleItalic = () => {
    onFormatChange({ italic: true });
  };

  const handleUnderline = () => {
    onFormatChange({ underline: true });
  };

  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-white border-b border-gray-200">
      {/* Text formatting */}
      <button
        onClick={handleBold}
        disabled={!selectedCell}
        className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
        title="Bold"
      >
        <BoldIcon className="w-5 h-5" />
      </button>

      <button
        onClick={handleItalic}
        disabled={!selectedCell}
        className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
        title="Italic"
      >
        <ItalicIcon className="w-5 h-5" />
      </button>

      <button
        onClick={handleUnderline}
        disabled={!selectedCell}
        className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
        title="Underline"
      >
        <UnderlineIcon className="w-5 h-5" />
      </button>

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Fill color */}
      <button
        disabled={!selectedCell}
        className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
        title="Fill color"
      >
        <PaintBrushIcon className="w-5 h-5" />
      </button>

      {/* Insert chart */}
      <button
        className="p-2 hover:bg-gray-100 rounded"
        title="Insert chart"
      >
        <ChartBarIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
