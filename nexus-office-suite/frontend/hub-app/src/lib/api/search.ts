import { SearchResult, SearchFilters, PaginatedResponse } from '@/types/hub';
import { writerApi, sheetsApi, slidesApi, driveApi, meetApi } from './client';

/**
 * Universal search across all NEXUS services
 */
export async function universalSearch(
  query: string,
  filters?: SearchFilters
): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const results: SearchResult[] = [];

  try {
    // Search all services in parallel
    const [writerResults, sheetsResults, slidesResults, driveResults, meetResults] =
      await Promise.allSettled([
        searchWriter(query, filters),
        searchSheets(query, filters),
        searchSlides(query, filters),
        searchDrive(query, filters),
        searchMeet(query, filters),
      ]);

    // Combine results
    if (writerResults.status === 'fulfilled') results.push(...writerResults.value);
    if (sheetsResults.status === 'fulfilled') results.push(...sheetsResults.value);
    if (slidesResults.status === 'fulfilled') results.push(...slidesResults.value);
    if (driveResults.status === 'fulfilled') results.push(...driveResults.value);
    if (meetResults.status === 'fulfilled') results.push(...meetResults.value);

    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
  } catch (error) {
    console.error('Universal search error:', error);
    return [];
  }
}

/**
 * Search within a specific app
 */
export async function searchInApp(
  appId: string,
  query: string,
  filters?: SearchFilters
): Promise<SearchResult[]> {
  switch (appId) {
    case 'writer':
      return searchWriter(query, filters);
    case 'sheets':
      return searchSheets(query, filters);
    case 'slides':
      return searchSlides(query, filters);
    case 'drive':
      return searchDrive(query, filters);
    case 'meet':
      return searchMeet(query, filters);
    default:
      return [];
  }
}

// Service-specific search functions
async function searchWriter(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
  try {
    const response = await writerApi.get<any>(`/documents/search?q=${encodeURIComponent(query)}`);
    const documents = response.documents || [];

    return documents.map((doc: any) => ({
      id: `writer-${doc.id}`,
      title: doc.title || 'Untitled Document',
      description: doc.content?.substring(0, 150),
      type: 'document' as const,
      appId: 'writer',
      appName: 'NEXUS Writer',
      appColor: '#3b82f6',
      url: `${process.env.NEXT_PUBLIC_WRITER_APP_URL}/editor/${doc.id}`,
      snippet: doc.snippet,
      relevance: doc.relevance || 0.5,
      lastModified: doc.updatedAt,
      owner: {
        id: doc.ownerId || '',
        name: doc.ownerName || 'Unknown User',
      },
    }));
  } catch {
    return [];
  }
}

async function searchSheets(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
  try {
    const response = await sheetsApi.get<any>(
      `/spreadsheets/search?q=${encodeURIComponent(query)}`
    );
    const spreadsheets = response.spreadsheets || [];

    return spreadsheets.map((sheet: any) => ({
      id: `sheets-${sheet.id}`,
      title: sheet.title || 'Untitled Spreadsheet',
      description: `Spreadsheet with ${sheet.sheetCount || 1} sheet(s)`,
      type: 'spreadsheet' as const,
      appId: 'sheets',
      appName: 'NEXUS Sheets',
      appColor: '#10b981',
      url: `${process.env.NEXT_PUBLIC_SHEETS_APP_URL}/editor/${sheet.id}`,
      snippet: sheet.snippet,
      relevance: sheet.relevance || 0.5,
      lastModified: sheet.updatedAt,
      owner: {
        id: sheet.ownerId || '',
        name: sheet.ownerName || 'Unknown User',
      },
    }));
  } catch {
    return [];
  }
}

async function searchSlides(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
  try {
    const response = await slidesApi.get<any>(
      `/presentations/search?q=${encodeURIComponent(query)}`
    );
    const presentations = response.presentations || [];

    return presentations.map((pres: any) => ({
      id: `slides-${pres.id}`,
      title: pres.title || 'Untitled Presentation',
      description: `Presentation with ${pres.slideCount || 0} slide(s)`,
      type: 'presentation' as const,
      appId: 'slides',
      appName: 'NEXUS Slides',
      appColor: '#f59e0b',
      url: `${process.env.NEXT_PUBLIC_SLIDES_APP_URL}/editor/${pres.id}`,
      thumbnail: pres.thumbnail,
      snippet: pres.snippet,
      relevance: pres.relevance || 0.5,
      lastModified: pres.updatedAt,
      owner: {
        id: pres.ownerId || '',
        name: pres.ownerName || 'Unknown User',
      },
    }));
  } catch {
    return [];
  }
}

async function searchDrive(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
  try {
    const response = await driveApi.get<any>(`/files/search?q=${encodeURIComponent(query)}`);
    const files = response.files || [];

    return files.map((file: any) => ({
      id: `drive-${file.id}`,
      title: file.name || 'Untitled File',
      description: `${file.mimeType} • ${formatFileSize(file.size)}`,
      type: file.type === 'folder' ? ('folder' as const) : ('file' as const),
      appId: 'drive',
      appName: 'NEXUS Drive',
      appColor: '#6366f1',
      url: `${process.env.NEXT_PUBLIC_DRIVE_APP_URL}?file=${file.id}`,
      thumbnail: file.thumbnail,
      relevance: file.relevance || 0.5,
      lastModified: file.updatedAt,
      owner: {
        id: file.ownerId || '',
        name: file.ownerName || 'Unknown User',
      },
    }));
  } catch {
    return [];
  }
}

async function searchMeet(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
  try {
    const response = await meetApi.get<any>(`/meetings/search?q=${encodeURIComponent(query)}`);
    const meetings = response.meetings || [];

    return meetings.map((meeting: any) => ({
      id: `meet-${meeting.id}`,
      title: meeting.title || 'Untitled Meeting',
      description: `${meeting.scheduledAt ? 'Scheduled' : 'Instant'} meeting`,
      type: 'meeting' as const,
      appId: 'meet',
      appName: 'NEXUS Meet',
      appColor: '#8b5cf6',
      url: `${process.env.NEXT_PUBLIC_MEET_APP_URL}/room/${meeting.roomId}`,
      relevance: meeting.relevance || 0.5,
      lastModified: meeting.updatedAt,
      owner: {
        id: meeting.hostId || '',
        name: meeting.hostName || 'Unknown User',
      },
    }));
  } catch {
    return [];
  }
}

// Utility function
function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
