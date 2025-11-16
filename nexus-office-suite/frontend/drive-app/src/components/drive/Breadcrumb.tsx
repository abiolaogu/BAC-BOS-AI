import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import type { BreadcrumbItem } from '@/types/drive';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (item: BreadcrumbItem) => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, onNavigate }) => {
  return (
    <nav className="flex items-center space-x-1 px-4 py-3 text-sm bg-gray-50 border-b">
      <button
        onClick={() => onNavigate({ name: 'My Drive', path: '/' })}
        className="flex items-center hover:text-primary-600"
      >
        <Home className="w-4 h-4" />
      </button>

      {items.map((item, index) => (
        <React.Fragment key={item.id || index}>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <button
            onClick={() => onNavigate(item)}
            className={`hover:text-primary-600 ${
              index === items.length - 1 ? 'font-medium text-gray-900' : 'text-gray-600'
            }`}
          >
            {item.name}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;
