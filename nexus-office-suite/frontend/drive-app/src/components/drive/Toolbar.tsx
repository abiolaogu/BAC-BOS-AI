import React from 'react';
import Button from '../ui/Button';
import { Upload, FolderPlus, Grid3x3, List, Search } from 'lucide-react';
import { useDriveStore } from '@/store/driveStore';

interface ToolbarProps {
  onUpload: () => void;
  onCreateFolder: () => void;
  onSearch: (query: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onUpload, onCreateFolder, onSearch }) => {
  const { viewMode, setViewMode } = useDriveStore();
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b">
      {/* Left side - Actions */}
      <div className="flex items-center space-x-2">
        <Button onClick={onUpload} size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
        <Button onClick={onCreateFolder} variant="outline" size="sm">
          <FolderPlus className="w-4 h-4 mr-2" />
          New Folder
        </Button>
      </div>

      {/* Center - Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files and folders..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </form>

      {/* Right side - View toggle */}
      <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1">
        <button
          onClick={() => setViewMode('grid')}
          className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
        >
          <Grid3x3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
        >
          <List className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
