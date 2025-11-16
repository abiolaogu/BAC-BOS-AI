'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Calendar, Users, Plus, Trash2, Play, Clock } from 'lucide-react';
import { meetingsAPI } from '@/lib/api/meetings';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { Meeting } from '@/types/meeting';

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    scheduledTime: '',
  });

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      setIsLoading(true);
      const { meetings: data } = await meetingsAPI.listMeetings();
      setMeetings(data);
    } catch (error) {
      console.error('Failed to load meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const meeting = await meetingsAPI.createMeeting({
        title: newMeeting.title,
        description: newMeeting.description,
        scheduledTime: newMeeting.scheduledTime || undefined,
      });
      toast.success('Meeting created successfully');
      setShowCreateModal(false);
      setNewMeeting({ title: '', description: '', scheduledTime: '' });
      router.push(`/meeting/${meeting.id}`);
    } catch (error) {
      console.error('Failed to create meeting:', error);
      toast.error('Failed to create meeting');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string, title: string) => {
    if (!confirm(`Delete meeting "${title}"?`)) return;

    try {
      await meetingsAPI.deleteMeeting(meetingId);
      toast.success('Meeting deleted');
      loadMeetings();
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      toast.error('Failed to delete meeting');
    }
  };

  const handleJoinMeeting = (meetingId: string) => {
    router.push(`/meeting/${meetingId}`);
  };

  const upcomingMeetings = meetings.filter(
    (m) => m.status === 'scheduled' || m.status === 'in_progress'
  );
  const pastMeetings = meetings.filter((m) => m.status === 'ended');

  const MeetingCard = ({ meeting }: { meeting: Meeting }) => (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">{meeting.title}</h3>
          {meeting.description && (
            <p className="text-gray-400 text-sm mb-3">{meeting.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {meeting.scheduledTime
                ? format(new Date(meeting.scheduledTime), 'MMM d, yyyy h:mm a')
                : 'Instant meeting'}
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {meeting.participants?.length || 0} participants
            </div>
          </div>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            meeting.status === 'in_progress'
              ? 'bg-green-600 text-white'
              : meeting.status === 'scheduled'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-600 text-gray-300'
          }`}
        >
          {meeting.status === 'in_progress'
            ? 'In Progress'
            : meeting.status === 'scheduled'
            ? 'Scheduled'
            : 'Ended'}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {meeting.status !== 'ended' && (
          <button
            onClick={() => handleJoinMeeting(meeting.id)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Join
          </button>
        )}
        <button
          onClick={() => handleDeleteMeeting(meeting.id, meeting.title)}
          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          title="Delete meeting"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-white">NEXUS Meet</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => meetingsAPI.logout().then(() => router.push('/login'))}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">My Meetings</h2>
            <p className="text-gray-400">Manage your upcoming and past meetings</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Meeting
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400">Loading meetings...</div>
          </div>
        ) : (
          <>
            {/* Upcoming Meetings */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Upcoming Meetings ({upcomingMeetings.length})
              </h3>
              {upcomingMeetings.length === 0 ? (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                  <p className="text-gray-400">No upcoming meetings</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {upcomingMeetings.map((meeting) => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              )}
            </div>

            {/* Past Meetings */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Past Meetings ({pastMeetings.length})
              </h3>
              {pastMeetings.length === 0 ? (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                  <p className="text-gray-400">No past meetings</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {pastMeetings.map((meeting) => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-6">Create New Meeting</h3>
            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Team Standup"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newMeeting.description}
                  onChange={(e) =>
                    setNewMeeting({ ...newMeeting, description: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Scheduled Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={newMeeting.scheduledTime}
                  onChange={(e) =>
                    setNewMeeting({ ...newMeeting, scheduledTime: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
