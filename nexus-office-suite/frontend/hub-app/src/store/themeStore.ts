import { create } from 'zustand';
import { Theme } from '@/types/hub';

interface ThemeState extends Theme {
  // Actions
  setMode: (mode: 'light' | 'dark' | 'system') => void;
  setPrimaryColor: (color: string) => void;
  setAccentColor: (color: string) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  toggleCompactMode: () => void;
  loadTheme: () => void;
  saveTheme: () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (mode: 'light' | 'dark' | 'system') => {
  if (typeof window === 'undefined') return;

  const effectiveMode = mode === 'system' ? getSystemTheme() : mode;

  if (effectiveMode === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  // Default theme
  mode: 'system',
  primaryColor: '#0ea5e9',
  accentColor: '#3b82f6',
  fontSize: 'medium',
  compactMode: false,

  // Set theme mode
  setMode: (mode: 'light' | 'dark' | 'system') => {
    set({ mode });
    applyTheme(mode);
    get().saveTheme();
  },

  // Set primary color
  setPrimaryColor: (color: string) => {
    set({ primaryColor: color });
    get().saveTheme();
  },

  // Set accent color
  setAccentColor: (color: string) => {
    set({ accentColor: color });
    get().saveTheme();
  },

  // Set font size
  setFontSize: (size: 'small' | 'medium' | 'large') => {
    set({ fontSize: size });

    // Apply font size class to document
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('text-sm', 'text-base', 'text-lg');
      if (size === 'small') {
        document.documentElement.classList.add('text-sm');
      } else if (size === 'large') {
        document.documentElement.classList.add('text-lg');
      }
    }

    get().saveTheme();
  },

  // Toggle compact mode
  toggleCompactMode: () => {
    set((state) => ({ compactMode: !state.compactMode }));
    get().saveTheme();
  },

  // Load theme from localStorage
  loadTheme: () => {
    if (typeof window === 'undefined') return;

    const savedTheme = localStorage.getItem('nexus_theme');
    if (savedTheme) {
      try {
        const theme = JSON.parse(savedTheme) as Theme;
        set(theme);
        applyTheme(theme.mode);

        // Apply font size
        if (theme.fontSize === 'small') {
          document.documentElement.classList.add('text-sm');
        } else if (theme.fontSize === 'large') {
          document.documentElement.classList.add('text-lg');
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      }
    } else {
      // Apply default theme
      applyTheme('system');
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const currentMode = get().mode;
      if (currentMode === 'system') {
        applyTheme('system');
      }
    });
  },

  // Save theme to localStorage
  saveTheme: () => {
    if (typeof window === 'undefined') return;

    const { mode, primaryColor, accentColor, fontSize, compactMode } = get();
    const theme: Theme = { mode, primaryColor, accentColor, fontSize, compactMode };
    localStorage.setItem('nexus_theme', JSON.stringify(theme));
  },
}));
