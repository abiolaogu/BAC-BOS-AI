'use client';

import { useState } from 'react';
import { useDocuments, useCreateDocument } from '@/hooks';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { PlusIcon, MagnifyingGlassIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { formatRelativeTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function DocumentList() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useDocuments({ search: search || undefined });
  const { mutate: createDocument, isPending: isCreating } = useCreateDocument();

  const handleCreateDocument = () => {
    createDocument(
      { title: 'Untitled Document' },
      {
        onSuccess: (document) => {
          router.push(`/documents/${document.id}`);
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3">
        <Button
          onClick={handleCreateDocument}
          isLoading={isCreating}
          className="w-full"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Document
        </Button>

        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : data?.documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <DocumentTextIcon className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">
              {search ? 'No documents found' : 'No documents yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {data?.documents.map((document) => (
              <button
                key={document.id}
                onClick={() => router.push(`/documents/${document.id}`)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900 truncate mb-1">
                  {document.title}
                </h3>
                <p className="text-xs text-gray-500">
                  Edited {formatRelativeTime(document.updatedAt)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
