import { SERVER_URL } from '@/constants/Server';
import { getSupabaseSession } from '@/constants/SupabaseConfig';

export interface KnowledgeFolder {
  folder_id: string;
  name: string;
  description?: string;
  entry_count: number;
  created_at: string;
}

export interface KnowledgeEntry {
  entry_id: string;
  filename: string;
  summary: string;
  file_size: number;
  created_at: string;
}

export interface CreateFolderRequest {
  name: string;
  description?: string;
}

export interface UpdateFolderRequest {
  name?: string;
  description?: string;
}

export interface UpdateEntryRequest {
  summary: string;
}

class KnowledgeService {
  private baseUrl = SERVER_URL; // constants/Server provides backend base (includes /api)

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const session = await getSupabaseSession();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    return headers;
  }

  // Folder operations
  async getFolders(): Promise<KnowledgeFolder[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/knowledge-base/folders`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch folders: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching folders:', error);
      throw error;
    }
  }

  async createFolder(folderData: CreateFolderRequest): Promise<KnowledgeFolder> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/knowledge-base/folders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(folderData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create folder: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  async updateFolder(folderId: string, folderData: UpdateFolderRequest): Promise<KnowledgeFolder> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/knowledge-base/folders/${folderId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(folderData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to update folder: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  }

  async deleteFolder(folderId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/knowledge-base/folders/${folderId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to delete folder: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }

  // Entry operations
  async getFolderEntries(folderId: string): Promise<KnowledgeEntry[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/knowledge-base/folders/${folderId}/entries`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch entries: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching entries:', error);
      throw error;
    }
  }

  async uploadFile(
    folderId: string,
    file: { uri: string; name: string; type: string }
  ): Promise<KnowledgeEntry> {
    try {
      const session = await getSupabaseSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const formData = new FormData();
      // React Native: append file as { uri, name, type }
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);

      const response = await fetch(`${this.baseUrl}/knowledge-base/folders/${folderId}/upload`, {
        method: 'POST',
        // Let fetch set multipart/form-data boundary automatically
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to upload file: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async deleteEntry(entryId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/knowledge-base/entries/${entryId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to delete entry: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      throw error;
    }
  }

  async updateEntry(entryId: string, entryData: UpdateEntryRequest): Promise<KnowledgeEntry> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/knowledge-base/entries/${entryId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(entryData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to update entry: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating entry:', error);
      throw error;
    }
  }

  // Utility methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  }
}

export const knowledgeService = new KnowledgeService();
