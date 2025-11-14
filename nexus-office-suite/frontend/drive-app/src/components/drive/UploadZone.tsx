import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { driveApi } from '@/lib/api/drive';
import { useDriveStore } from '@/store/driveStore';

interface UploadZoneProps {
  folderId?: string;
  onUploadComplete?: () => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ folderId, onUploadComplete }) => {
  const { addFile, setUploadProgress } = useDriveStore();

  const onDrop = useCallback(
    async (acceptedFiles: globalThis.File[]) => {
      for (const file of acceptedFiles) {
        try {
          setUploadProgress(0);
          const uploadedFile = await driveApi.uploadFile(file, folderId);
          addFile(uploadedFile);
          setUploadProgress(100);
          setTimeout(() => setUploadProgress(0), 1000);
          onUploadComplete?.();
        } catch (error) {
          console.error('Upload failed:', error);
          setUploadProgress(0);
        }
      }
    },
    [folderId, addFile, setUploadProgress, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      {isDragActive ? (
        <p className="text-primary-600 font-medium">Drop files here...</p>
      ) : (
        <div>
          <p className="text-gray-600 font-medium mb-1">Drag files here to upload</p>
          <p className="text-sm text-gray-500">or click the upload button above</p>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
