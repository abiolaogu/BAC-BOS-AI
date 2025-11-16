import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { usePresentationStore } from '@/store/presentationStore';
import { presentationsApi } from '@/lib/api/presentations';
import { createDefaultSlide } from '@/types/presentation';
import clsx from 'clsx';

const SlideThumbnails: React.FC = () => {
  const {
    slides,
    currentSlideIndex,
    setCurrentSlideIndex,
    currentPresentation,
    addSlide,
    deleteSlide,
  } = usePresentationStore();

  const handleAddSlide = async () => {
    if (!currentPresentation) return;

    const newSlide = createDefaultSlide(currentPresentation.id, slides.length);
    try {
      const createdSlide = await presentationsApi.createSlide({
        presentation_id: currentPresentation.id,
        order: slides.length,
      });
      addSlide(createdSlide);
      setCurrentSlideIndex(slides.length);
    } catch (error) {
      console.error('Failed to create slide:', error);
    }
  };

  const handleDeleteSlide = async (slideId: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (slides.length === 1) {
      alert('Cannot delete the last slide');
      return;
    }

    try {
      await presentationsApi.deleteSlide(slideId);
      deleteSlide(slideId);
      if (currentSlideIndex >= slides.length - 1) {
        setCurrentSlideIndex(Math.max(0, slides.length - 2));
      }
    } catch (error) {
      console.error('Failed to delete slide:', error);
    }
  };

  return (
    <div className="w-64 bg-gray-50 border-r flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <button
          onClick={handleAddSlide}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Slide
        </button>
      </div>

      {/* Thumbnails */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={clsx(
              'relative group cursor-pointer rounded-lg border-2 transition-all',
              currentSlideIndex === index
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            )}
            onClick={() => setCurrentSlideIndex(index)}
          >
            {/* Slide number */}
            <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {index + 1}
            </div>

            {/* Delete button */}
            <button
              onClick={(e) => handleDeleteSlide(slide.id, index, e)}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3 h-3" />
            </button>

            {/* Thumbnail preview */}
            <div
              className="aspect-video p-4"
              style={{
                backgroundColor: slide.background?.color || '#FFFFFF',
                backgroundImage: slide.background?.image
                  ? `url(${slide.background.image})`
                  : undefined,
                backgroundSize: 'cover',
              }}
            >
              <div className="text-xs truncate font-semibold">
                {slide.title || `Slide ${index + 1}`}
              </div>
              {/* Simplified element preview */}
              {slide.elements.slice(0, 3).map((element) => (
                <div
                  key={element.id}
                  className="text-xs text-gray-500 truncate"
                >
                  {element.type === 'text' && element.content?.text}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SlideThumbnails;
