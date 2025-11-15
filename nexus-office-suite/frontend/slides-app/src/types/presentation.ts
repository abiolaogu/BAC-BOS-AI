export interface Presentation {
  id: string;
  tenant_id: string;
  owner_id: string;
  title: string;
  description?: string;
  theme_id?: string;
  slide_count: number;
  width: number;
  height: number;
  is_public: boolean;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Slide {
  id: string;
  presentation_id: string;
  order: number;
  title?: string;
  notes?: string;
  background?: Background;
  elements: Element[];
  transition?: Transition;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Background {
  type: 'solid' | 'gradient' | 'image';
  color?: string;
  image?: string;
  gradient?: Gradient;
}

export interface Gradient {
  type: 'linear' | 'radial';
  colors: string[];
  angle?: number;
}

export interface Transition {
  type: 'none' | 'fade' | 'slide' | 'zoom';
  duration: number;
  direction?: 'left' | 'right' | 'up' | 'down';
}

export type ElementType = 'text' | 'image' | 'shape' | 'video' | 'chart';

export interface Element {
  id: string;
  type: ElementType;
  position: Position;
  size: Size;
  style?: Style;
  content?: Content;
  z_index: number;
  rotation: number;
  locked: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Style {
  background_color?: string;
  border_color?: string;
  border_width?: number;
  border_radius?: number;
  opacity?: number;
  shadow?: Shadow;
}

export interface Shadow {
  offset_x: number;
  offset_y: number;
  blur: number;
  color: string;
}

export interface Content {
  // Text content
  text?: string;
  font_family?: string;
  font_size?: number;
  font_weight?: string;
  font_style?: string;
  color?: string;
  text_align?: 'left' | 'center' | 'right' | 'justify';
  line_height?: number;

  // Image/Video content
  url?: string;
  alt?: string;

  // Shape content
  shape_type?: 'rectangle' | 'circle' | 'triangle' | 'polygon';
  fill_color?: string;

  // Chart content
  chart_data?: any;
}

export interface Theme {
  id: string;
  tenant_id?: string;
  name: string;
  description?: string;
  is_default: boolean;
  is_public: boolean;
  colors: ThemeColors;
  fonts: ThemeFonts;
  layouts: SlideLayout[];
  created_at: string;
  updated_at: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  custom?: string[];
}

export interface ThemeFonts {
  heading: string;
  body: string;
  code: string;
}

export interface SlideLayout {
  id: string;
  name: string;
  preview?: string;
  elements: Element[];
}

// Request types
export interface CreatePresentationRequest {
  title: string;
  description?: string;
  theme_id?: string;
  width?: number;
  height?: number;
}

export interface UpdatePresentationRequest {
  title?: string;
  description?: string;
  theme_id?: string;
  is_public?: boolean;
}

export interface CreateSlideRequest {
  presentation_id: string;
  order?: number;
  title?: string;
  background?: Background;
  layout_id?: string;
}

export interface UpdateSlideRequest {
  title?: string;
  notes?: string;
  background?: Background;
  elements?: Element[];
  transition?: Transition;
}

export interface ReorderSlidesRequest {
  slide_ids: string[];
}

// Helper functions
export function createDefaultElement(type: ElementType, position: Position): Element {
  const baseElement: Element = {
    id: `${type}-${Date.now()}`,
    type,
    position,
    size: { width: 200, height: 100 },
    z_index: 1,
    rotation: 0,
    locked: false,
  };

  switch (type) {
    case 'text':
      return {
        ...baseElement,
        size: { width: 400, height: 100 },
        content: {
          text: 'New Text',
          font_family: 'Inter',
          font_size: 24,
          font_weight: 'normal',
          color: '#1F2937',
          text_align: 'left',
        },
      };
    case 'image':
      return {
        ...baseElement,
        size: { width: 300, height: 200 },
        content: {
          url: '',
          alt: 'Image',
        },
      };
    case 'shape':
      return {
        ...baseElement,
        size: { width: 200, height: 200 },
        content: {
          shape_type: 'rectangle',
          fill_color: '#3B82F6',
        },
        style: {
          background_color: '#3B82F6',
        },
      };
    default:
      return baseElement;
  }
}

export function createDefaultSlide(presentationId: string, order: number): Slide {
  return {
    id: `temp-${Date.now()}`,
    presentation_id: presentationId,
    order,
    elements: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
