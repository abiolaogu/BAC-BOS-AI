import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  formulaBarVisible: boolean;
  sheetTabsVisible: boolean;

  // Modals
  shareModalOpen: boolean;
  chartModalOpen: boolean;

  // Context menus
  contextMenuOpen: boolean;
  contextMenuPosition: { x: number; y: number } | null;

  toggleSidebar: () => void;
  toggleFormulaBar: () => void;
  toggleSheetTabs: () => void;

  openShareModal: () => void;
  closeShareModal: () => void;

  openChartModal: () => void;
  closeChartModal: () => void;

  openContextMenu: (x: number, y: number) => void;
  closeContextMenu: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  formulaBarVisible: true,
  sheetTabsVisible: true,
  shareModalOpen: false,
  chartModalOpen: false,
  contextMenuOpen: false,
  contextMenuPosition: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleFormulaBar: () => set((state) => ({ formulaBarVisible: !state.formulaBarVisible })),
  toggleSheetTabs: () => set((state) => ({ sheetTabsVisible: !state.sheetTabsVisible })),

  openShareModal: () => set({ shareModalOpen: true }),
  closeShareModal: () => set({ shareModalOpen: false }),

  openChartModal: () => set({ chartModalOpen: true }),
  closeChartModal: () => set({ chartModalOpen: false }),

  openContextMenu: (x, y) => set({ contextMenuOpen: true, contextMenuPosition: { x, y } }),
  closeContextMenu: () => set({ contextMenuOpen: false, contextMenuPosition: null }),
}));
