'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useDriveStore } from '@/store/driveStore';
import { driveApi } from '@/lib/api/drive';
import Toolbar from '@/components/drive/Toolbar';
import Breadcrumb from '@/components/drive/Breadcrumb';
import FileBrowser from '@/components/drive/FileBrowser';
import UploadZone from '@/components/drive/UploadZone';
import type { File, Folder, BreadcrumbItem } from '@/types/drive';

export default function DrivePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { setFiles, setFolders, currentFolderId, setCurrentFolder } = useDriveStore();

  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [createFolderName, setCreateFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    loadDriveContents();
  }, [currentFolderId]);

  const loadDriveContents = async () => {
    setIsLoading(true);
    try {
      const [files, folders] = await Promise.all([
        driveApi.listFiles(currentFolderId || undefined),
        driveApi.listFolders(currentFolderId || undefined),
      ]);
      setFiles(files);
      setFolders(folders);

      // Update breadcrumbs
      if (currentFolderId) {
        // In a real app, you would fetch the folder path from the API
        // For now, just showing the current folder name
        const currentFolder = await driveApi.getFolder(currentFolderId);
        setBreadcrumbs([{ id: currentFolderId, name: currentFolder.name, path: currentFolderId }]);
      } else {
        setBreadcrumbs([]);
      }
    } catch (error) {
      console.error('Failed to load drive contents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileOpen = async (file: File) => {
    try {
      const blob = await driveApi.downloadFile(file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const handleFolderOpen = (folder: Folder) => {
    setCurrentFolder(folder.id);
  };

  const handleBreadcrumbNavigate = (item: BreadcrumbItem) => {
    if (item.path === '/') {
      setCurrentFolder(null);
    } else {
      setCurrentFolder(item.id!);
    }
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files || []);
      for (const file of files as globalThis.File[]) {
        try {
          const uploadedFile = await driveApi.uploadFile(file, currentFolderId || undefined);
          setFiles([...useDriveStore.getState().files, uploadedFile]);
        } catch (error) {
          console.error('Upload failed:', error);
        }
      }
    };
    input.click();
  };

  const handleCreateFolder = async () => {
    if (!createFolderName.trim()) return;

    try {
      const folder = await driveApi.createFolder({
        name: createFolderName,
        parent_id: currentFolderId || undefined,
      });
      setFolders([...useDriveStore.getState().folders, folder]);
      setCreateFolderName('');
      setShowCreateFolder(false);
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      loadDriveContents();
      return;
    }

    try {
      const results = await driveApi.searchFiles(query);
      setFiles(results);
      setFolders([]);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: File | Folder, type: 'file' | 'folder') => {
    e.preventDefault();
    // Context menu functionality would go here
    console.log('Context menu for:', type, item);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">NEXUS Drive</h1>
          <div className="flex items-center space-x-4">
            <button className="text-gray-600 hover:text-gray-900">Settings</button>
            <button
              onClick={() => useAuthStore.getState().logout()}
              className="text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        onUpload={handleUpload}
        onCreateFolder={() => setShowCreateFolder(true)}
        onSearch={handleSearch}
      />

      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbs} onNavigate={handleBreadcrumbNavigate} />

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              <FileBrowser
                onFileOpen={handleFileOpen}
                onFolderOpen={handleFolderOpen}
                onContextMenu={handleContextMenu}
              />

              {/* Upload zone when empty */}
              {useDriveStore.getState().files.length === 0 && useDriveStore.getState().folders.length === 0 && (
                <div className="mt-8">
                  <UploadZone folderId={currentFolderId || undefined} onUploadComplete={loadDriveContents} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Folder Dialog */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">Create New Folder</h2>
            <input
              type="text"
              value={createFolderName}
              onChange={(e) => setCreateFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setShowCreateFolder(false);
              }}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowCreateFolder(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
