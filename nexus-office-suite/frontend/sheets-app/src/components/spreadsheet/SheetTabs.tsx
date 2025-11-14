'use client';

import { PlusIcon } from '@heroicons/react/24/outline';
import type { Sheet } from '@/types/spreadsheet';

interface SheetTabsProps {
  sheets: Sheet[];
  activeSheetId: string | null;
  onSheetChange: (sheetId: string) => void;
  onAddSheet: () => void;
}

export default function SheetTabs({
  sheets,
  activeSheetId,
  onSheetChange,
  onAddSheet,
}: SheetTabsProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-white border-t border-gray-200">
      {sheets.map((sheet) => (
        <button
          key={sheet.id}
          onClick={() => onSheetChange(sheet.id)}
          className={`
            px-4 py-2 text-sm font-medium rounded-t transition-colors
            ${activeSheetId === sheet.id
              ? 'bg-white border-t-2 border-blue-500 text-blue-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          {sheet.name}
        </button>
      ))}

      <button
        onClick={onAddSheet}
        className="p-2 hover:bg-gray-100 rounded"
        title="Add sheet"
      >
        <PlusIcon className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}
