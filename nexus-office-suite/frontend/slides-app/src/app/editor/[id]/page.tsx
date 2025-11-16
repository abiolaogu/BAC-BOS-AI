'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePresentationStore } from '@/store/presentationStore';
import { useAuthStore } from '@/store/authStore';
import { presentationsApi } from '@/lib/api/presentations';
import SlideCanvas from '@/components/editor/SlideCanvas';
import SlideThumbnails from '@/components/editor/SlideThumbnails';
import Toolbar from '@/components/editor/Toolbar';
import { Loader2 } from 'lucide-react';

const EditorPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const presentationId = params.id as string;
  const { isAuthenticated } = useAuthStore();
  const {
    currentPresentation,
    setPresentation,
    setSlides,
    isPresenting,
    setPresenting,
  } = usePresentationStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const loadPresentation = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load presentation details
        const presentation = await presentationsApi.get(presentationId);
        setPresentation(presentation);

        // Load slides
        const slides = await presentationsApi.getSlides(presentationId);
        setSlides(slides);
      } catch (err: any) {
        console.error('Failed to load presentation:', err);
        setError(err.response?.data?.error || 'Failed to load presentation');
      } finally {
        setLoading(false);
      }
    };

    loadPresentation();
  }, [presentationId, isAuthenticated, router, setPresentation, setSlides]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/presentations')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Back to Presentations
          </button>
        </div>
      </div>
    );
  }

  if (!currentPresentation) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Presentation not found</p>
      </div>
    );
  }

  // Presentation mode
  if (isPresenting) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="relative">
          <SlideCanvas
            width={currentPresentation.width}
            height={currentPresentation.height}
          />
          <button
            onClick={() => setPresenting(false)}
            className="absolute top-4 right-4 px-4 py-2 bg-white text-black rounded hover:bg-gray-100"
          >
            Exit Presentation
          </button>
        </div>
      </div>
    );
  }

  // Editor mode
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/presentations')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-lg font-semibold">{currentPresentation.title}</h1>
            {currentPresentation.description && (
              <p className="text-sm text-gray-500">{currentPresentation.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar />

      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Slide thumbnails sidebar */}
        <SlideThumbnails />

        {/* Canvas area */}
        <div className="flex-1 bg-gray-100 overflow-auto flex items-center justify-center p-8">
          <SlideCanvas
            width={currentPresentation.width}
            height={currentPresentation.height}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
