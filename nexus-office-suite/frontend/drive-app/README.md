# NEXUS Drive - Web Frontend

Professional cloud file storage and management interface with drag-and-drop upload, folder navigation, and file sharing capabilities.

## Features

- **File Browser**: Grid and list view modes for file/folder display
- **Drag & Drop Upload**: Intuitive file upload with drag-and-drop support
- **Folder Navigation**: Hierarchical folder structure with breadcrumb navigation
- **Search**: Real-time file and folder search
- **File Management**: Upload, download, rename, move, copy, delete operations
- **Starred Items**: Quick access to favorited files and folders
- **Trash**: Soft delete with restore capability
- **Responsive**: Mobile-friendly design
- **Auto-save**: Automatic updates on changes
- **Real-time Updates**: Instant UI updates after operations

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **State Management**: Zustand with persistence
- **UI**: Tailwind CSS with Lucide icons
- **File Upload**: react-dropzone
- **HTTP Client**: Axios
- **Date Formatting**: date-fns
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- NEXUS Drive backend running on port 8093

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.local.example .env.local
```

3. Update `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8093/api/v1
```

### Development

```bash
npm run dev
# Opens on http://localhost:3002
```

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                     # Next.js pages
│   ├── drive/              # Main drive interface
│   ├── login/              # Login page
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home redirect
│   └── globals.css         # Global styles
├── components/
│   ├── drive/              # Drive-specific components
│   │   ├── FileBrowser.tsx    # Grid/list file display
│   │   ├── FileItem.tsx       # Individual file/folder item
│   │   ├── Toolbar.tsx        # Action toolbar
│   │   ├── Breadcrumb.tsx     # Navigation breadcrumbs
│   │   └── UploadZone.tsx     # Drag-drop upload area
│   └── ui/                 # Reusable UI components
│       └── Button.tsx
├── lib/
│   ├── api/                # API clients
│   │   ├── client.ts          # Axios instance
│   │   ├── drive.ts           # Drive API methods
│   │   └── auth.ts            # Auth API methods
│   └── utils.ts            # Utility functions
├── store/                  # Zustand stores
│   ├── authStore.ts           # Authentication state
│   └── driveStore.ts          # Drive state (files, folders, selection)
└── types/                  # TypeScript types
    ├── drive.ts               # Drive-related types
    └── auth.ts                # Auth types
```

## Key Components

### FileBrowser
Displays files and folders in grid or list view.

**Props:**
- `onFileOpen`: Callback when file is double-clicked
- `onFolderOpen`: Callback when folder is opened
- `onContextMenu`: Callback for right-click menu

**Features:**
- Grid view: 2-6 columns responsive layout
- List view: Detailed table with name, modified date, size
- Empty state with helpful message
- Selection highlighting

### FileItem
Renders a single file or folder in grid/list view.

**Props:**
- `item`: File or Folder object
- `type`: 'file' or 'folder'
- `viewMode`: 'grid' or 'list'
- `isSelected`: Selection state
- `onSelect`, `onDoubleClick`, `onContextMenu`: Event handlers

**Features:**
- File type icons and colors
- Star indicator
- Context menu button
- Size and date information

### UploadZone
Drag-and-drop file upload area.

**Props:**
- `folderId`: Target folder for uploads (optional)
- `onUploadComplete`: Callback after successful upload

**Features:**
- Drag-and-drop support
- Multiple file upload
- Progress indication
- Upload to current folder

### Toolbar
Action toolbar with upload, create folder, search, and view toggle.

**Props:**
- `onUpload`: Upload button handler
- `onCreateFolder`: New folder button handler
- `onSearch`: Search submit handler

**Features:**
- Upload button
- New folder button
- Search input
- Grid/list view toggle

### Breadcrumb
Navigation breadcrumb trail showing folder path.

**Props:**
- `items`: Array of breadcrumb items
- `onNavigate`: Click handler for navigation

**Features:**
- Home icon for root
- Clickable folder names
- Current folder highlighted

## State Management

### DriveStore
Manages file browser state.

**State:**
- `files`: Array of files in current folder
- `folders`: Array of folders in current folder
- `currentFolderId`: Active folder ID
- `selectedItems`: Set of selected item IDs
- `viewMode`: 'grid' or 'list'
- `sortBy`, `sortOrder`: Sorting configuration
- `isUploading`, `uploadProgress`: Upload state

**Actions:**
- `setFiles`, `setFolders`: Update file/folder lists
- `setCurrentFolder`: Navigate to folder
- `toggleSelectItem`, `selectAll`, `clearSelection`: Selection management
- `setViewMode`, `setSorting`: UI configuration
- `addFile`, `addFolder`: Add new items
- `removeFile`, `removeFolder`: Remove items
- `updateFile`, `updateFolder`: Update item metadata

### AuthStore
Manages authentication state with persistence.

**State:**
- `user`: Current user object
- `token`: JWT token
- `isAuthenticated`: Auth status
- `isLoading`, `error`: UI state

**Actions:**
- `login`: Authenticate user
- `logout`: Clear auth state
- `clearError`: Reset error state

## API Integration

The frontend communicates with the NEXUS Drive backend API:

### File Operations
- `POST /api/v1/files` - Upload file (multipart/form-data)
- `GET /api/v1/files` - List files in folder
- `GET /api/v1/files/{id}` - Get file metadata
- `GET /api/v1/files/{id}/download` - Download file
- `PUT /api/v1/files/{id}` - Update file metadata
- `DELETE /api/v1/files/{id}` - Move to trash
- `POST /api/v1/files/{id}/move` - Move file
- `POST /api/v1/files/{id}/copy` - Copy file
- `GET /api/v1/files/search?q={query}` - Search files
- `GET /api/v1/files/starred` - Get starred files
- `GET /api/v1/files/recent` - Get recent files

### Folder Operations
- `POST /api/v1/folders` - Create folder
- `GET /api/v1/folders` - List folders
- `GET /api/v1/folders/{id}` - Get folder
- `PUT /api/v1/folders/{id}` - Update folder
- `DELETE /api/v1/folders/{id}` - Delete folder

### Trash Operations
- `GET /api/v1/trash` - List trashed items
- `POST /api/v1/trash/restore` - Restore from trash
- `POST /api/v1/trash/empty` - Empty trash

## Usage Examples

### Upload File
```typescript
import { driveApi } from '@/lib/api/drive';

// Single file upload
const file = document.querySelector('input[type=file]').files[0];
const uploadedFile = await driveApi.uploadFile(file, folderId);

// Multiple files
for (const file of files) {
  await driveApi.uploadFile(file, folderId);
}
```

### Create Folder
```typescript
const folder = await driveApi.createFolder({
  name: 'My Documents',
  parent_id: currentFolderId,
  color: '#3b82f6',
});
```

### Download File
```typescript
const blob = await driveApi.downloadFile(fileId);
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = file.name;
a.click();
URL.revokeObjectURL(url);
```

### Search Files
```typescript
const results = await driveApi.searchFiles('report', 'document');
setFiles(results);
```

## File Type Icons and Colors

The interface uses intuitive icons and colors for different file types:

- **Documents**: 📄 Blue - .doc, .docx, .pdf, .txt
- **Spreadsheets**: 📊 Green - .xls, .xlsx, .csv
- **Presentations**: 📽️ Orange - .ppt, .pptx
- **Images**: 🖼️ Purple - .jpg, .png, .gif, .svg
- **Videos**: 🎬 Red - .mp4, .avi, .mov
- **Audio**: 🎵 Pink - .mp3, .wav, .flac
- **Archives**: 📦 Gray - .zip, .rar, .tar, .gz
- **Folders**: 📁 Yellow
- **Other**: 📎 Gray

## Keyboard Shortcuts

- **Ctrl/Cmd + A**: Select all items
- **Delete**: Move selected items to trash
- **Escape**: Clear selection
- **Enter**: Open selected item
- **F2**: Rename selected item (future)

## Future Enhancements

Planned features for upcoming releases:

1. **Share Dialog**: UI for creating share links and managing permissions
2. **File Preview**: In-app preview for images, PDFs, and documents
3. **Drag-to-Move**: Drag files between folders
4. **Context Menus**: Right-click menus for quick actions
5. **Bulk Operations**: Multi-select actions (move, delete, star)
6. **Version History**: View and restore previous versions
7. **Activity Feed**: Recent file activity and changes
8. **Offline Mode**: Service worker for offline access
9. **Keyboard Navigation**: Full keyboard control
10. **Advanced Search**: Filters by type, date, size, owner

## Responsive Design

The interface adapts to different screen sizes:

- **Mobile (< 640px)**: 2-column grid, simplified toolbar
- **Tablet (640-1024px)**: 3-4 column grid
- **Desktop (1024-1536px)**: 4-5 column grid
- **Large Desktop (> 1536px)**: 6-column grid

## Performance Optimizations

- **Code Splitting**: Next.js automatic code splitting
- **Lazy Loading**: Components loaded on demand
- **Optimistic Updates**: Instant UI updates before API confirmation
- **Debounced Search**: Reduced API calls during search
- **Virtual Scrolling**: Efficient rendering of large file lists (future)
- **Image Thumbnails**: Lazy-loaded thumbnail images (future)

## Contributing

1. Follow the existing code structure
2. Use TypeScript for type safety
3. Add appropriate error handling
4. Test thoroughly before committing

## License

Copyright (c) 2024 NEXUS Business Operating System
