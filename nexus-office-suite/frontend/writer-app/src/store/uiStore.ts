import { create } from 'zustand';

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarTab: 'documents' | 'comments' | 'activity';

  // Modals
  shareModalOpen: boolean;
  exportModalOpen: boolean;
  importModalOpen: boolean;

  // Toolbar
  toolbarVisible: boolean;

  // Comments panel
  commentsPanelOpen: boolean;
  activeCommentId: string | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarTab: (tab: 'documents' | 'comments' | 'activity') => void;
  openShareModal: () => void;
  closeShareModal: () => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  openImportModal: () => void;
  closeImportModal: () => void;
  setToolbarVisible: (visible: boolean) => void;
  toggleCommentsPanel: () => void;
  setActiveComment: (commentId: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  sidebarOpen: true,
  sidebarTab: 'documents',
  shareModalOpen: false,
  exportModalOpen: false,
  importModalOpen: false,
  toolbarVisible: true,
  commentsPanelOpen: false,
  activeCommentId: null,

  // Actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarTab: (tab) => set({ sidebarTab: tab }),

  openShareModal: () => set({ shareModalOpen: true }),
  closeShareModal: () => set({ shareModalOpen: false }),

  openExportModal: () => set({ exportModalOpen: true }),
  closeExportModal: () => set({ exportModalOpen: false }),

  openImportModal: () => set({ importModalOpen: true }),
  closeImportModal: () => set({ importModalOpen: false }),

  setToolbarVisible: (visible) => set({ toolbarVisible: visible }),

  toggleCommentsPanel: () => set((state) => ({ commentsPanelOpen: !state.commentsPanelOpen })),

  setActiveComment: (commentId) => set({ activeCommentId: commentId }),
}));
