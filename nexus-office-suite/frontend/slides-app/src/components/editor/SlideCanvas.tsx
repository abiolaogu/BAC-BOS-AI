import React, { useRef } from 'react';
import Draggable from 'react-draggable';
import { usePresentationStore } from '@/store/presentationStore';
import type { Element } from '@/types/presentation';
import clsx from 'clsx';

interface SlideCanvasProps {
  width: number;
  height: number;
}

const SlideCanvas: React.FC<SlideCanvasProps> = ({ width, height }) => {
  const {
    getCurrentSlide,
    selectedElementIds,
    selectElement,
    clearSelection,
    updateElement,
    deleteElement,
    zoom,
  } = usePresentationStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const currentSlide = getCurrentSlide();

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      clearSelection();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      selectedElementIds.forEach((id) => deleteElement(id));
    }
  };

  const handleElementDrag = (elementId: string, deltaX: number, deltaY: number, element: Element) => {
    updateElement(elementId, {
      position: {
        x: element.position.x + deltaX / zoom,
        y: element.position.y + deltaY / zoom,
      },
    });
  };

  if (!currentSlide) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100"
        style={{ width, height }}
      >
        <p className="text-gray-500">No slide selected</p>
      </div>
    );
  }

  return (
    <div
      ref={canvasRef}
      className="relative overflow-hidden"
      style={{
        width: width * zoom,
        height: height * zoom,
        backgroundColor: currentSlide.background?.color || '#FFFFFF',
        backgroundImage: currentSlide.background?.image
          ? `url(${currentSlide.background.image})`
          : undefined,
        backgroundSize: 'cover',
        transformOrigin: 'top left',
        transform: `scale(${zoom})`,
      }}
      onClick={handleCanvasClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {currentSlide.elements.map((element) => (
        <SlideElement
          key={element.id}
          element={element}
          isSelected={selectedElementIds.has(element.id)}
          onSelect={() => selectElement(element.id)}
          onDrag={(deltaX, deltaY) => handleElementDrag(element.id, deltaX, deltaY, element)}
        />
      ))}
    </div>
  );
};

interface SlideElementProps {
  element: Element;
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (deltaX: number, deltaY: number) => void;
}

const SlideElement: React.FC<SlideElementProps> = ({
  element,
  isSelected,
  onSelect,
  onDrag,
}) => {
  const handleDrag = (_e: any, data: any) => {
    onDrag(data.deltaX, data.deltaY);
  };

  return (
    <Draggable
      position={{ x: 0, y: 0 }}
      onDrag={handleDrag}
      disabled={element.locked}
    >
      <div
        className={clsx(
          'absolute cursor-move',
          isSelected && 'ring-2 ring-blue-500 ring-offset-2'
        )}
        style={{
          left: element.position.x,
          top: element.position.y,
          width: element.size.width,
          height: element.size.height,
          transform: `rotate(${element.rotation}deg)`,
          zIndex: element.z_index,
          backgroundColor: element.style?.background_color,
          borderColor: element.style?.border_color,
          borderWidth: element.style?.border_width,
          borderRadius: element.style?.border_radius,
          opacity: element.style?.opacity !== undefined ? element.style.opacity : 1,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {renderElementContent(element)}
      </div>
    </Draggable>
  );
};

function renderElementContent(element: Element) {
  switch (element.type) {
    case 'text':
      return (
        <div
          className="w-full h-full p-2 overflow-auto"
          style={{
            fontFamily: element.content?.font_family || 'Inter',
            fontSize: element.content?.font_size || 16,
            fontWeight: element.content?.font_weight || 'normal',
            fontStyle: element.content?.font_style || 'normal',
            color: element.content?.color || '#000000',
            textAlign: element.content?.text_align || 'left',
            lineHeight: element.content?.line_height || 1.5,
          }}
        >
          {element.content?.text || 'Text'}
        </div>
      );

    case 'image':
      return (
        <img
          src={element.content?.url || '/placeholder.png'}
          alt={element.content?.alt || 'Image'}
          className="w-full h-full object-cover"
        />
      );

    case 'shape':
      const shapeType = element.content?.shape_type || 'rectangle';
      return (
        <div
          className="w-full h-full"
          style={{
            backgroundColor: element.content?.fill_color || '#3B82F6',
            borderRadius:
              shapeType === 'circle'
                ? '50%'
                : shapeType === 'triangle'
                ? '0'
                : element.style?.border_radius || 0,
          }}
        />
      );

    default:
      return <div className="w-full h-full bg-gray-200" />;
  }
}

export default SlideCanvas;
