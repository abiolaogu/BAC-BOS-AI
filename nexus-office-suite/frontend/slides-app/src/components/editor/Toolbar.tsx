import React from 'react';
import { Type, Image, Square, Circle, Play, ZoomIn, ZoomOut } from 'lucide-react';
import { usePresentationStore } from '@/store/presentationStore';
import { createDefaultElement } from '@/types/presentation';
import type { ElementType } from '@/types/presentation';

const Toolbar: React.FC = () => {
  const { addElement, zoom, setZoom, setPresenting } = usePresentationStore();

  const handleAddElement = (type: ElementType) => {
    const element = createDefaultElement(type, { x: 100, y: 100 });
    addElement(element);
  };

  return (
    <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
      {/* Left - Element tools */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleAddElement('text')}
          className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 transition-colors"
          title="Add Text"
        >
          <Type className="w-5 h-5" />
          <span className="text-sm">Text</span>
        </button>

        <button
          onClick={() => handleAddElement('image')}
          className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 transition-colors"
          title="Add Image"
        >
          <Image className="w-5 h-5" />
          <span className="text-sm">Image</span>
        </button>

        <button
          onClick={() => handleAddElement('shape')}
          className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 transition-colors"
          title="Add Shape"
        >
          <Square className="w-5 h-5" />
          <span className="text-sm">Shape</span>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        <button
          onClick={() => handleAddElement('shape')}
          className="p-2 rounded hover:bg-gray-100 transition-colors"
          title="Add Rectangle"
        >
          <Square className="w-5 h-5" />
        </button>

        <button
          onClick={() => handleAddElement('shape')}
          className="p-2 rounded hover:bg-gray-100 transition-colors"
          title="Add Circle"
        >
          <Circle className="w-5 h-5" />
        </button>
      </div>

      {/* Right - Controls */}
      <div className="flex items-center gap-4">
        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.25, zoom - 0.1))}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>

          <span className="text-sm text-gray-600 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* Present button */}
        <button
          onClick={() => setPresenting(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
        >
          <Play className="w-4 h-4" />
          Present
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
