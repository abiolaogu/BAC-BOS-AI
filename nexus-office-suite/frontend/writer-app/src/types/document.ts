export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface DocumentContent {
  root: {
    children: any[];
    direction: 'ltr' | 'rtl';
    format: string;
    indent: number;
    type: string;
    version: number;
  };
}

export type DocumentStatus = 'draft' | 'published' | 'archived';

export type PermissionRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface Permission {
  id: string;
  documentId: string;
  userId: string;
  role: PermissionRole;
  user?: User;
  createdAt: string;
}

export interface Document {
  id: string;
  tenantId: string;
  folderId?: string;
  title: string;
  content: DocumentContent;
  plainText?: string;
  wordCount: number;
  charCount: number;
  createdBy: string;
  createdByUser?: User;
  createdAt: string;
  updatedAt: string;
  lastEditedBy?: string;
  lastEditedByUser?: User;
  version: number;
  status: DocumentStatus;
  tags: string[];
  isTemplate: boolean;
  templateId?: string;
  metadata: Record<string, any>;
  permissions: Permission[];
  isDeleted: boolean;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  title: string;
  content: DocumentContent;
  createdBy: string;
  createdByUser?: User;
  createdAt: string;
  changeDescription?: string;
}

export interface Comment {
  id: string;
  documentId: string;
  userId: string;
  user?: User;
  parentId?: string;
  content: string;
  selectionState?: any;
  position?: {
    offset: number;
    length: number;
  };
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

export interface Activity {
  id: string;
  documentId: string;
  userId: string;
  user?: User;
  action: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface Folder {
  id: string;
  tenantId: string;
  parentId?: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface CreateDocumentRequest {
  title: string;
  content?: DocumentContent;
  folderId?: string;
  tags?: string[];
  isTemplate?: boolean;
  status?: DocumentStatus;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: DocumentContent;
  status?: DocumentStatus;
  tags?: string[];
  folderId?: string;
}

export interface ListDocumentsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  folderId?: string;
  status?: DocumentStatus;
  tags?: string[];
  sortBy?: 'created_at' | 'updated_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface ListDocumentsResponse {
  documents: Document[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ShareDocumentRequest {
  userId: string;
  role: PermissionRole;
}

export interface ExportFormat {
  format: 'pdf' | 'docx' | 'html' | 'txt' | 'markdown';
}

export interface ImportDocumentRequest {
  file: File;
  title?: string;
  folderId?: string;
}

export interface WebSocketMessage {
  type: 'cursor_move' | 'selection_change' | 'content_update' | 'user_joined' | 'user_left' | 'comment_added';
  userId: string;
  documentId: string;
  data: any;
  timestamp: string;
}

export interface CollaboratorPresence {
  userId: string;
  user: User;
  cursorPosition?: number;
  selection?: {
    start: number;
    end: number;
  };
  color: string;
  lastActivity: string;
}
