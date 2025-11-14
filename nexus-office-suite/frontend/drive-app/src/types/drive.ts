export type FileType =
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'other';

export type ResourceType = 'file' | 'folder';

export type PermissionRole = 'owner' | 'editor' | 'viewer';

export interface File {
  id: string;
  tenant_id: string;
  owner_id: string;
  folder_id?: string;
  name: string;
  original_name: string;
  mime_type: string;
  file_type: FileType;
  size: number;
  storage_path: string;
  version: number;
  is_starred: boolean;
  is_trashed: boolean;
  trashed_at?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  thumbnail_path?: string;
  last_accessed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  tenant_id: string;
  owner_id: string;
  parent_id?: string;
  name: string;
  color?: string;
  is_starred: boolean;
  is_trashed: boolean;
  trashed_at?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_num: number;
  size: number;
  storage_path: string;
  created_by: string;
  comment?: string;
  created_at: string;
}

export interface Permission {
  id: string;
  tenant_id: string;
  resource_id: string;
  resource_type: ResourceType;
  user_id?: string;
  email?: string;
  role: PermissionRole;
  granted_by: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ShareLink {
  id: string;
  tenant_id: string;
  resource_id: string;
  resource_type: ResourceType;
  token: string;
  role: PermissionRole;
  expires_at?: string;
  max_downloads?: number;
  download_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FileInfo {
  file?: File;
  folder?: Folder;
  type: 'file' | 'folder';
  path?: string;
  permissions?: Permission;
  shared_with?: any[];
}

// Request types
export interface CreateFolderRequest {
  name: string;
  parent_id?: string;
  color?: string;
  description?: string;
}

export interface UpdateFileRequest {
  name?: string;
  folder_id?: string;
  description?: string;
  tags?: string[];
  is_starred?: boolean;
}

export interface UpdateFolderRequest {
  name?: string;
  parent_id?: string;
  color?: string;
  description?: string;
  is_starred?: boolean;
}

export interface CreatePermissionRequest {
  resource_id: string;
  resource_type: ResourceType;
  user_id?: string;
  email?: string;
  role: PermissionRole;
  expires_at?: string;
}

export interface CreateShareLinkRequest {
  resource_id: string;
  resource_type: ResourceType;
  role: PermissionRole;
  password?: string;
  expires_at?: string;
  max_downloads?: number;
}

export interface BreadcrumbItem {
  id?: string;
  name: string;
  path: string;
}

export type ViewMode = 'grid' | 'list';
export type SortBy = 'name' | 'size' | 'modified' | 'type';
export type SortOrder = 'asc' | 'desc';

// Utility functions
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function getFileIcon(fileType: FileType): string {
  switch (fileType) {
    case 'document':
      return '📄';
    case 'spreadsheet':
      return '📊';
    case 'presentation':
      return '📽️';
    case 'image':
      return '🖼️';
    case 'video':
      return '🎬';
    case 'audio':
      return '🎵';
    case 'archive':
      return '📦';
    default:
      return '📎';
  }
}

export function getFileTypeColor(fileType: FileType): string {
  switch (fileType) {
    case 'document':
      return 'text-blue-600';
    case 'spreadsheet':
      return 'text-green-600';
    case 'presentation':
      return 'text-orange-600';
    case 'image':
      return 'text-purple-600';
    case 'video':
      return 'text-red-600';
    case 'audio':
      return 'text-pink-600';
    case 'archive':
      return 'text-gray-600';
    default:
      return 'text-gray-500';
  }
}
