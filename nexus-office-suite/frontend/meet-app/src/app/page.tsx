'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Users, Calendar, ArrowRight } from 'lucide-react';
import { meetingsAPI } from '@/lib/api/meetings';
import toast from 'react-hot-toast';

export default function HomePage() {
  const router = useRouter();
  const [meetingId, setMeetingId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateMeeting = async () => {
    try {
      setIsCreating(true);
      const meeting = await meetingsAPI.createMeeting({
        title: 'Instant Meeting',
        description: 'Quick meeting',
      });
      router.push(`/meeting/${meeting.id}`);
    } catch (error) {
      console.error('Failed to create meeting:', error);
      toast.error('Failed to create meeting');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinMeeting = () => {
    if (!meetingId.trim()) {
      toast.error('Please enter a meeting ID');
      return;
    }
    router.push(`/meeting/${meetingId.trim()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-white">NEXUS Meet</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/meetings')}
              className="text-gray-300 hover:text-white transition-colors"
            >
              My Meetings
            </button>
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">
            Video Conferencing Made Simple
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Connect with your team from anywhere with high-quality video and audio
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* Create Instant Meeting */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Create Meeting</h3>
            <p className="text-gray-400 mb-6">
              Start an instant meeting with one click. Share the link with participants.
            </p>
            <button
              onClick={handleCreateMeeting}
              disabled={isCreating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isCreating ? (
                'Creating...'
              ) : (
                <>
                  New Meeting
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Join Meeting */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8">
            <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Join Meeting</h3>
            <p className="text-gray-400 mb-6">
              Enter a meeting ID or link to join an existing meeting.
            </p>
            <div className="space-y-4">
              <input
                type="text"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                placeholder="Enter meeting ID"
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinMeeting()}
              />
              <button
                onClick={handleJoinMeeting}
                disabled={isJoining || !meetingId.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isJoining ? (
                  'Joining...'
                ) : (
                  <>
                    Join
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">HD Video & Audio</h3>
            <p className="text-gray-400">
              Crystal clear video and audio quality for seamless communication
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Screen Sharing</h3>
            <p className="text-gray-400">
              Share your screen to present and collaborate effectively
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Schedule Meetings</h3>
            <p className="text-gray-400">
              Schedule meetings in advance and send invites to participants
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 bg-gray-900/50 backdrop-blur-sm mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-400">
          <p>&copy; 2024 NEXUS Meet. Part of the NEXUS Office Suite.</p>
        </div>
      </footer>
    </div>
  );
}
