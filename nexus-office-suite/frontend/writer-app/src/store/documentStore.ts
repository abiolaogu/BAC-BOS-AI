import { create } from 'zustand';
import type { Document, CollaboratorPresence } from '@/types/document';

interface DocumentState {
  // Current document being edited
  currentDocument: Document | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Collaboration
  collaborators: CollaboratorPresence[];

  // Version history
  showVersionHistory: boolean;

  // Actions
  setCurrentDocument: (document: Document | null) => void;
  updateDocument: (updates: Partial<Document>) => void;
  setLoading: (isLoading: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setError: (error: string | null) => void;

  // Collaboration
  addCollaborator: (collaborator: CollaboratorPresence) => void;
  removeCollaborator: (userId: string) => void;
  updateCollaborator: (userId: string, updates: Partial<CollaboratorPresence>) => void;

  // Version history
  toggleVersionHistory: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  currentDocument: null,
  isLoading: false,
  isSaving: false,
  error: null,
  collaborators: [],
  showVersionHistory: false,
};

export const useDocumentStore = create<DocumentState>((set) => ({
  ...initialState,

  setCurrentDocument: (document) => {
    set({ currentDocument: document, error: null });
  },

  updateDocument: (updates) => {
    set((state) => ({
      currentDocument: state.currentDocument
        ? { ...state.currentDocument, ...updates }
        : null,
    }));
  },

  setLoading: (isLoading) => set({ isLoading }),

  setSaving: (isSaving) => set({ isSaving }),

  setError: (error) => set({ error }),

  // Collaboration
  addCollaborator: (collaborator) => {
    set((state) => ({
      collaborators: [...state.collaborators, collaborator],
    }));
  },

  removeCollaborator: (userId) => {
    set((state) => ({
      collaborators: state.collaborators.filter((c) => c.userId !== userId),
    }));
  },

  updateCollaborator: (userId, updates) => {
    set((state) => ({
      collaborators: state.collaborators.map((c) =>
        c.userId === userId ? { ...c, ...updates } : c
      ),
    }));
  },

  toggleVersionHistory: () => {
    set((state) => ({ showVersionHistory: !state.showVersionHistory }));
  },

  reset: () => set(initialState),
}));
