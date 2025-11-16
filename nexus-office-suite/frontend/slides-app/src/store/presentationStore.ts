import { create } from 'zustand';
import type { Presentation, Slide, Element } from '@/types/presentation';

interface PresentationState {
  // Current presentation and slides
  currentPresentation: Presentation | null;
  slides: Slide[];
  currentSlideIndex: number;

  // Selection state
  selectedElementIds: Set<string>;

  // Editor state
  zoom: number;
  isPresenting: boolean;

  // Actions
  setPresentation: (presentation: Presentation) => void;
  setSlides: (slides: Slide[]) => void;
  setCurrentSlideIndex: (index: number) => void;
  getCurrentSlide: () => Slide | null;

  // Slide operations
  addSlide: (slide: Slide) => void;
  updateSlide: (slideId: string, updates: Partial<Slide>) => void;
  deleteSlide: (slideId: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;

  // Element operations
  addElement: (element: Element) => void;
  updateElement: (elementId: string, updates: Partial<Element>) => void;
  deleteElement: (elementId: string) => void;

  // Selection
  selectElement: (elementId: string) => void;
  toggleSelectElement: (elementId: string) => void;
  clearSelection: () => void;

  // Editor controls
  setZoom: (zoom: number) => void;
  setPresenting: (isPresenting: boolean) => void;

  // Reset
  reset: () => void;
}

export const usePresentationStore = create<PresentationState>((set, get) => ({
  currentPresentation: null,
  slides: [],
  currentSlideIndex: 0,
  selectedElementIds: new Set(),
  zoom: 1,
  isPresenting: false,

  setPresentation: (presentation) => set({ currentPresentation: presentation }),

  setSlides: (slides) => set({ slides }),

  setCurrentSlideIndex: (index) => set({ currentSlideIndex: index }),

  getCurrentSlide: () => {
    const { slides, currentSlideIndex } = get();
    return slides[currentSlideIndex] || null;
  },

  addSlide: (slide) => set((state) => ({
    slides: [...state.slides, slide],
  })),

  updateSlide: (slideId, updates) => set((state) => ({
    slides: state.slides.map((slide) =>
      slide.id === slideId ? { ...slide, ...updates } : slide
    ),
  })),

  deleteSlide: (slideId) => set((state) => ({
    slides: state.slides.filter((slide) => slide.id !== slideId),
  })),

  reorderSlides: (fromIndex, toIndex) => set((state) => {
    const newSlides = [...state.slides];
    const [removed] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, removed);

    // Update order property
    return {
      slides: newSlides.map((slide, index) => ({
        ...slide,
        order: index,
      })),
    };
  }),

  addElement: (element) => set((state) => {
    const currentSlide = state.slides[state.currentSlideIndex];
    if (!currentSlide) return state;

    const updatedSlides = state.slides.map((slide, index) =>
      index === state.currentSlideIndex
        ? { ...slide, elements: [...slide.elements, element] }
        : slide
    );

    return { slides: updatedSlides };
  }),

  updateElement: (elementId, updates) => set((state) => {
    const currentSlide = state.slides[state.currentSlideIndex];
    if (!currentSlide) return state;

    const updatedSlides = state.slides.map((slide, index) =>
      index === state.currentSlideIndex
        ? {
            ...slide,
            elements: slide.elements.map((el) =>
              el.id === elementId ? { ...el, ...updates } : el
            ),
          }
        : slide
    );

    return { slides: updatedSlides };
  }),

  deleteElement: (elementId) => set((state) => {
    const currentSlide = state.slides[state.currentSlideIndex];
    if (!currentSlide) return state;

    const updatedSlides = state.slides.map((slide, index) =>
      index === state.currentSlideIndex
        ? {
            ...slide,
            elements: slide.elements.filter((el) => el.id !== elementId),
          }
        : slide
    );

    return {
      slides: updatedSlides,
      selectedElementIds: new Set(
        Array.from(state.selectedElementIds).filter((id) => id !== elementId)
      ),
    };
  }),

  selectElement: (elementId) => set({
    selectedElementIds: new Set([elementId]),
  }),

  toggleSelectElement: (elementId) => set((state) => {
    const newSelected = new Set(state.selectedElementIds);
    if (newSelected.has(elementId)) {
      newSelected.delete(elementId);
    } else {
      newSelected.add(elementId);
    }
    return { selectedElementIds: newSelected };
  }),

  clearSelection: () => set({ selectedElementIds: new Set() }),

  setZoom: (zoom) => set({ zoom }),

  setPresenting: (isPresenting) => set({ isPresenting }),

  reset: () => set({
    currentPresentation: null,
    slides: [],
    currentSlideIndex: 0,
    selectedElementIds: new Set(),
    zoom: 1,
    isPresenting: false,
  }),
}));
