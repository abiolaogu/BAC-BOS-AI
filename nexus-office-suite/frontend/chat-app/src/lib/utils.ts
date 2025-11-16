import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMessageTime(date: Date | string): string {
  const messageDate = typeof date === 'string' ? new Date(date) : date;

  if (isToday(messageDate)) {
    return format(messageDate, 'h:mm a');
  }

  if (isYesterday(messageDate)) {
    return `Yesterday ${format(messageDate, 'h:mm a')}`;
  }

  return format(messageDate, 'MMM d, h:mm a');
}

export function formatRelativeTime(date: Date | string): string {
  const messageDate = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(messageDate, { addSuffix: true });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getAvatarColor(id: string): string {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];

  const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.substring(0, length) + '...' : str;
}

export function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
}

export function isVideoFile(filename: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi'];
  return videoExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
