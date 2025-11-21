export interface Email {
  id: string;
  user_id: string;
  message_id: string;
  thread_id: string;
  in_reply_to?: string;
  references?: string[];
  from: string;
  from_name: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  body_html: string;
  folder_id: string;
  is_read: boolean;
  is_starred: boolean;
  is_draft: boolean;
  is_spam: boolean;
  is_deleted: boolean;
  has_attachments: boolean;
  priority: 'low' | 'normal' | 'high';
  spam_score: number;
  size: number;
  received_at: string;
  sent_at?: string;
  scheduled_at?: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
  attachments?: Attachment[];
  labels?: Label[];
  headers?: Record<string, string[]>;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  type: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'starred' | 'custom';
  parent_id?: string;
  icon: string;
  color: string;
  order: number;
  unread_count: number;
  total_count: number;
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  email_id: string;
  filename: string;
  content_type: string;
  size: number;
  storage_path: string;
  content_id?: string;
  is_inline: boolean;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  email: string;
  name: string;
  company?: string;
  phone?: string;
  notes?: string;
  is_favorite: boolean;
  last_emailed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ComposeEmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  body_html: string;
  attachments?: string[];
  priority?: 'low' | 'normal' | 'high';
  scheduled_at?: string;
  signature_id?: string;
  in_reply_to?: string;
  references?: string[];
}

export interface EmailListResponse {
  emails: Email[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface SearchEmailRequest {
  query: string;
  folder_id?: string;
  labels?: string[];
  has_attachment?: boolean;
  is_unread?: boolean;
  date_from?: string;
  date_to?: string;
  page: number;
  page_size: number;
}

export interface BulkActionRequest {
  email_ids: string[];
  action: 'mark_read' | 'mark_unread' | 'star' | 'unstar' | 'delete' | 'move' | 'add_label';
  folder_id?: string;
  label_ids?: string[];
}

export interface Signature {
  id: string;
  user_id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Filter {
  id: string;
  user_id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: FilterConditions;
  actions: FilterActions;
  created_at: string;
  updated_at: string;
}

export interface FilterConditions {
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  has_attachment?: boolean;
  labels?: string[];
}

export interface FilterActions {
  mark_as_read?: boolean;
  mark_as_starred?: boolean;
  move_to?: string;
  add_labels?: string[];
  forward?: string;
  delete?: boolean;
}

// UI-specific types

export interface EmailPreview {
  id: string;
  from: string;
  from_name: string;
  subject: string;
  preview: string;
  received_at: string;
  is_read: boolean;
  is_starred: boolean;
  has_attachments: boolean;
  labels: Label[];
}

export interface ComposerState {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  bodyHTML: string;
  attachments: File[];
  priority: 'low' | 'normal' | 'high';
  scheduledAt?: Date;
  isDraft: boolean;
  draftId?: string;
}

export type ViewMode = 'list' | 'reading';
export type SortBy = 'date' | 'from' | 'subject' | 'size';
export type SortOrder = 'asc' | 'desc';
