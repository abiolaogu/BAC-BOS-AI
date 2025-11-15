'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { presentationsApi } from '@/lib/api/presentations';
import type { Presentation } from '@/types/presentation';
import { Plus, Trash2, FileText, Loader2 } from 'lucide-react';

const PresentationsPage: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadPresentations();
  }, [isAuthenticated, router]);

  const loadPresentations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await presentationsApi.list();
      setPresentations(data);
    } catch (err: any) {
      console.error('Failed to load presentations:', err);
      setError(err.response?.data?.error || 'Failed to load presentations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newPresentation = await presentationsApi.create({
        title: createForm.title,
        description: createForm.description || undefined,
      });
      setPresentations([newPresentation, ...presentations]);
      setShowCreateModal(false);
      setCreateForm({ title: '', description: '' });
      router.push(`/editor/${newPresentation.id}`);
    } catch (err: any) {
      console.error('Failed to create presentation:', err);
      alert(err.response?.data?.error || 'Failed to create presentation');
    }
  };

  const handleDeletePresentation = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      await presentationsApi.delete(id);
      setPresentations(presentations.filter((p) => p.id !== id));
    } catch (err: any) {
      console.error('Failed to delete presentation:', err);
      alert(err.response?.data?.error || 'Failed to delete presentation');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">NEXUS Slides</h1>
            <p className="text-sm text-gray-600">Welcome, {user?.name || user?.email}</p>
          </div>
          <button
            onClick={() => useAuthStore.getState().logout()}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Actions bar */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Presentations</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Presentation
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Presentations grid */}
        {presentations.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No presentations yet</h3>
            <p className="text-gray-500 mb-4">Create your first presentation to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Create Presentation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {presentations.map((presentation) => (
              <div
                key={presentation.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div
                  onClick={() => router.push(`/editor/${presentation.id}`)}
                  className="p-6"
                >
                  {/* Thumbnail placeholder */}
                  <div className="w-full h-40 bg-gray-100 rounded mb-4 flex items-center justify-center">
                    <FileText className="w-12 h-12 text-gray-300" />
                  </div>

                  {/* Title and description */}
                  <h3 className="font-semibold text-lg mb-1 truncate">{presentation.title}</h3>
                  {presentation.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {presentation.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{presentation.slide_count} slides</span>
                    <span>{formatDate(presentation.updated_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-gray-200 px-6 py-3 flex items-center justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePresentation(presentation.id, presentation.title);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Presentation</h2>
            <form onSubmit={handleCreatePresentation}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="My Presentation"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({ title: '', description: '' });
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresentationsPage;
