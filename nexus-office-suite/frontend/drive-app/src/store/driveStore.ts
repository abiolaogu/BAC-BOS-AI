import { create } from 'zustand';
import type {File, Folder, ViewMode, SortBy, SortOrder } from '@/types/drive';

interface DriveState {
  // Data
  files: File[];
  folders: Folder[];
  currentFolderId: string | null;
  selectedItems: Set<string>;

  // UI State
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  isUploading: boolean;
  uploadProgress: number;

  // Actions
  setFiles: (files: File[]) => void;
  setFolders: (folders: Folder[]) => void;
  setCurrentFolder: (folderId: string | null) => void;
  toggleSelectItem: (itemId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSorting: (sortBy: SortBy, sortOrder: SortOrder) => void;
  setUploadProgress: (progress: number) => void;
  addFile: (file: File) => void;
  addFolder: (folder: Folder) => void;
  removeFile: (fileId: string) => void;
  removeFolder: (folderId: string) => void;
  updateFile: (fileId: string, updates: Partial<File>) => void;
  updateFolder: (folderId: string, updates: Partial<Folder>) => void;
}

export const useDriveStore = create<DriveState>((set, get) => ({
  // Initial state
  files: [],
  folders: [],
  currentFolderId: null,
  selectedItems: new Set(),
  viewMode: 'grid',
  sortBy: 'name',
  sortOrder: 'asc',
  isUploading: false,
  uploadProgress: 0,

  // Actions
  setFiles: (files) => set({ files }),

  setFolders: (folders) => set({ folders }),

  setCurrentFolder: (folderId) => set({ currentFolderId: folderId, selectedItems: new Set() }),

  toggleSelectItem: (itemId) => set((state) => {
    const newSelected = new Set(state.selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    return { selectedItems: newSelected };
  }),

  selectAll: () => set((state) => {
    const allIds = new Set([
      ...state.files.map(f => f.id),
      ...state.folders.map(f => f.id),
    ]);
    return { selectedItems: allIds };
  }),

  clearSelection: () => set({ selectedItems: new Set() }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),

  setUploadProgress: (progress) => set({ uploadProgress: progress, isUploading: progress < 100 }),

  addFile: (file) => set((state) => ({ files: [...state.files, file] })),

  addFolder: (folder) => set((state) => ({ folders: [...state.folders, folder] })),

  removeFile: (fileId) => set((state) => ({
    files: state.files.filter(f => f.id !== fileId),
  })),

  removeFolder: (folderId) => set((state) => ({
    folders: state.folders.filter(f => f.id !== folderId),
  })),

  updateFile: (fileId, updates) => set((state) => ({
    files: state.files.map(f => f.id === fileId ? { ...f, ...updates } : f),
  })),

  updateFolder: (folderId, updates) => set((state) => ({
    folders: state.folders.map(f => f.id === folderId ? { ...f, ...updates } : f),
  })),
}));
