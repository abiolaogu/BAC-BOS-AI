'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { User, Bell, Globe, Palette, Lock, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { mode, setMode, fontSize, setFontSize, compactMode, toggleCompactMode, loadTheme } =
    useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const handleSaveProfile = () => {
    updateUser({ name, email });
    alert('Profile updated successfully!');
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'language', name: 'Language & Region', icon: Globe },
    { id: 'privacy', name: 'Privacy & Security', icon: Lock },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your account settings and preferences
              </p>
            </div>

            <div className="flex gap-8">
              {/* Sidebar Tabs */}
              <div className="w-64 flex-shrink-0">
                <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                          activeTab === tab.id
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {tab.name}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  {/* Profile Tab */}
                  {activeTab === 'profile' && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                        Profile Settings
                      </h2>

                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white"
                          />
                        </div>

                        <button
                          onClick={handleSaveProfile}
                          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Notifications Tab */}
                  {activeTab === 'notifications' && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                        Notification Preferences
                      </h2>

                      <div className="space-y-4">
                        {[
                          { id: 'email', label: 'Email Notifications' },
                          { id: 'push', label: 'Push Notifications' },
                          { id: 'mentions', label: 'Mentions' },
                          { id: 'shares', label: 'When someone shares with me' },
                          { id: 'comments', label: 'Comments on my documents' },
                          { id: 'meetings', label: 'Meeting invites' },
                        ].map((setting) => (
                          <label key={setting.id} className="flex items-center">
                            <input
                              type="checkbox"
                              defaultChecked
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                              {setting.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Appearance Tab */}
                  {activeTab === 'appearance' && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                        Appearance Settings
                      </h2>

                      <div className="space-y-6">
                        {/* Theme */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Theme
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {(['light', 'dark', 'system'] as const).map((themeMode) => (
                              <button
                                key={themeMode}
                                onClick={() => setMode(themeMode)}
                                className={`px-4 py-3 rounded-lg border-2 transition-colors capitalize ${
                                  mode === themeMode
                                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                }`}
                              >
                                {themeMode}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Font Size */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Font Size
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {(['small', 'medium', 'large'] as const).map((size) => (
                              <button
                                key={size}
                                onClick={() => setFontSize(size)}
                                className={`px-4 py-3 rounded-lg border-2 transition-colors capitalize ${
                                  fontSize === size
                                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Compact Mode */}
                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={compactMode}
                              onChange={toggleCompactMode}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                              Compact mode (reduce spacing)
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Language Tab */}
                  {activeTab === 'language' && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                        Language & Region
                      </h2>

                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Language
                          </label>
                          <select className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white">
                            <option>English (US)</option>
                            <option>Spanish</option>
                            <option>French</option>
                            <option>German</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Timezone
                          </label>
                          <select className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white">
                            <option>UTC-05:00 (Eastern Time)</option>
                            <option>UTC-06:00 (Central Time)</option>
                            <option>UTC-07:00 (Mountain Time)</option>
                            <option>UTC-08:00 (Pacific Time)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Privacy Tab */}
                  {activeTab === 'privacy' && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                        Privacy & Security
                      </h2>

                      <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Manage your privacy and security settings.
                        </p>

                        <button className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-left">
                          Change Password
                        </button>

                        <button className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-left">
                          Download My Data
                        </button>

                        <button className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-left">
                          Connected Accounts
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
