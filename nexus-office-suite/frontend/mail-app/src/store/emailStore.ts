import { create } from 'zustand';
import type { Email, Folder, Label, ViewMode, SortBy, SortOrder } from '@/types/email';

interface EmailStore {
  // Current state
  currentFolder: Folder | null;
  selectedEmail: Email | null;
  selectedEmails: string[];
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  searchQuery: string;

  // Data
  folders: Folder[];
  labels: Label[];

  // Actions
  setCurrentFolder: (folder: Folder | null) => void;
  setSelectedEmail: (email: Email | null) => void;
  toggleEmailSelection: (emailId: string) => void;
  selectAllEmails: (emailIds: string[]) => void;
  clearSelection: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  setSearchQuery: (query: string) => void;
  setFolders: (folders: Folder[]) => void;
  setLabels: (labels: Label[]) => void;
}

export const useEmailStore = create<EmailStore>((set) => ({
  // Initial state
  currentFolder: null,
  selectedEmail: null,
  selectedEmails: [],
  viewMode: 'list',
  sortBy: 'date',
  sortOrder: 'desc',
  searchQuery: '',
  folders: [],
  labels: [],

  // Actions
  setCurrentFolder: (folder) => set({ currentFolder: folder, selectedEmail: null }),

  setSelectedEmail: (email) => set({ selectedEmail: email, viewMode: email ? 'reading' : 'list' }),

  toggleEmailSelection: (emailId) =>
    set((state) => ({
      selectedEmails: state.selectedEmails.includes(emailId)
        ? state.selectedEmails.filter((id) => id !== emailId)
        : [...state.selectedEmails, emailId],
    })),

  selectAllEmails: (emailIds) => set({ selectedEmails: emailIds }),

  clearSelection: () => set({ selectedEmails: [] }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setSortBy: (sortBy) => set({ sortBy }),

  setSortOrder: (order) => set({ sortOrder: order }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setFolders: (folders) => set({ folders }),

  setLabels: (labels) => set({ labels }),
}));

// Composer Store
interface ComposerStore {
  isOpen: boolean;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  bodyHTML: string;
  attachments: File[];
  priority: 'low' | 'normal' | 'high';
  isDraft: boolean;
  draftId?: string;
  replyTo?: Email;

  // Actions
  openComposer: () => void;
  closeComposer: () => void;
  setTo: (to: string[]) => void;
  setCc: (cc: string[]) => void;
  setBcc: (bcc: string[]) => void;
  setSubject: (subject: string) => void;
  setBody: (body: string) => void;
  setBodyHTML: (bodyHTML: string) => void;
  addAttachment: (file: File) => void;
  removeAttachment: (index: number) => void;
  setPriority: (priority: 'low' | 'normal' | 'high') => void;
  setReplyTo: (email: Email) => void;
  resetComposer: () => void;
}

export const useComposerStore = create<ComposerStore>((set) => ({
  // Initial state
  isOpen: false,
  to: [],
  cc: [],
  bcc: [],
  subject: '',
  body: '',
  bodyHTML: '',
  attachments: [],
  priority: 'normal',
  isDraft: false,
  draftId: undefined,
  replyTo: undefined,

  // Actions
  openComposer: () => set({ isOpen: true }),

  closeComposer: () => set({ isOpen: false }),

  setTo: (to) => set({ to }),

  setCc: (cc) => set({ cc }),

  setBcc: (bcc) => set({ bcc }),

  setSubject: (subject) => set({ subject }),

  setBody: (body) => set({ body }),

  setBodyHTML: (bodyHTML) => set({ bodyHTML }),

  addAttachment: (file) =>
    set((state) => ({ attachments: [...state.attachments, file] })),

  removeAttachment: (index) =>
    set((state) => ({
      attachments: state.attachments.filter((_, i) => i !== index),
    })),

  setPriority: (priority) => set({ priority }),

  setReplyTo: (email) =>
    set({
      replyTo: email,
      to: [email.from],
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      isOpen: true,
    }),

  resetComposer: () =>
    set({
      to: [],
      cc: [],
      bcc: [],
      subject: '',
      body: '',
      bodyHTML: '',
      attachments: [],
      priority: 'normal',
      isDraft: false,
      draftId: undefined,
      replyTo: undefined,
    }),
}));

// UI Store
interface UIStore {
  sidebarCollapsed: boolean;
  showCc: boolean;
  showBcc: boolean;
  theme: 'light' | 'dark';

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleCc: () => void;
  toggleBcc: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Initial state
  sidebarCollapsed: false,
  showCc: false,
  showBcc: false,
  theme: 'light',

  // Actions
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  toggleCc: () => set((state) => ({ showCc: !state.showCc })),

  toggleBcc: () => set((state) => ({ showBcc: !state.showBcc })),

  setTheme: (theme) => set({ theme }),
}));
