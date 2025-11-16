'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDocument } from '@/hooks';
import { useAuthStore } from '@/store';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import RichTextEditor from '@/components/editor/RichTextEditor';
import Spinner from '@/components/ui/Spinner';

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isLoading);

  const { data: document, isLoading: isDocumentLoading } = useDocument(documentId);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden bg-gray-50 p-8">
          {isDocumentLoading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner size="lg" />
            </div>
          ) : document ? (
            <div className="max-w-5xl mx-auto h-full">
              <RichTextEditor
                documentId={documentId}
                initialContent={document.content}
                editable={true}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Document not found
                </h2>
                <p className="text-gray-600">
                  The document you're looking for doesn't exist or you don't have access to it.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
