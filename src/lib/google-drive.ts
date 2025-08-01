// Google Drive API integration for document storage
import { PropertyFile } from '@/types/property';

// Google Drive API configuration
const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const GOOGLE_DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

export interface GoogleDriveConfig {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  webContentLink: string;
  parents?: string[];
}

export interface UploadOptions {
  fileName: string;
  mimeType: string;
  parentFolderId?: string;
  description?: string;
}

export class GoogleDriveService {
  private config: GoogleDriveConfig;
  private propertyFolderIds: Map<string, string> = new Map();

  constructor(config: GoogleDriveConfig) {
    this.config = config;
  }

  /**
   * Get or create a folder for a specific property
   */
  async getOrCreatePropertyFolder(propertyId: string, propertyName: string): Promise<string> {
    // Check if we already have the folder ID cached
    if (this.propertyFolderIds.has(propertyId)) {
      return this.propertyFolderIds.get(propertyId)!;
    }

    try {
      // First, get or create the root "Properties" folder
      const rootFolderId = await this.getOrCreateRootFolder();
      
      // Search for existing property folder
      const searchQuery = `name='${propertyName}' and parents in '${rootFolderId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const searchResponse = await fetch(
        `${GOOGLE_DRIVE_API_BASE}/files?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );

      if (!searchResponse.ok) {
        throw new Error(`Failed to search for property folder: ${searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json();
      
      if (searchData.files && searchData.files.length > 0) {
        // Folder exists, use it
        const folderId = searchData.files[0].id;
        this.propertyFolderIds.set(propertyId, folderId);
        return folderId;
      }

      // Create new property folder
      const createResponse = await fetch(`${GOOGLE_DRIVE_API_BASE}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: propertyName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolderId],
          description: `Property documents for ${propertyName} (ID: ${propertyId})`,
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create property folder: ${createResponse.statusText}`);
      }

      const folderData = await createResponse.json();
      this.propertyFolderIds.set(propertyId, folderData.id);
      return folderData.id;
    } catch (error) {
      console.error('Error managing property folder:', error);
      throw error;
    }
  }

  /**
   * Get or create the root "Properties" folder
   */
  private async getOrCreateRootFolder(): Promise<string> {
    try {
      // Search for existing "Properties" folder
      const searchQuery = `name='Multifamily Properties' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const searchResponse = await fetch(
        `${GOOGLE_DRIVE_API_BASE}/files?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );

      if (!searchResponse.ok) {
        throw new Error(`Failed to search for root folder: ${searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json();
      
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }

      // Create root folder
      const createResponse = await fetch(`${GOOGLE_DRIVE_API_BASE}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Multifamily Properties',
          mimeType: 'application/vnd.google-apps.folder',
          description: 'Root folder for all multifamily property documents',
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create root folder: ${createResponse.statusText}`);
      }

      const folderData = await createResponse.json();
      return folderData.id;
    } catch (error) {
      console.error('Error managing root folder:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(
    file: File,
    propertyId: string,
    propertyName: string,
    options: Partial<UploadOptions> = {}
  ): Promise<PropertyFile> {
    try {
      const propertyFolderId = await this.getOrCreatePropertyFolder(propertyId, propertyName);
      
      const fileName = options.fileName || file.name;
      const mimeType = options.mimeType || file.type;

      // Create metadata for the file
      const metadata = {
        name: fileName,
        parents: [propertyFolderId],
        description: options.description || `Property document for ${propertyName}`,
      };

      // Use multipart upload for files
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;

      const metadataString = JSON.stringify(metadata);
      const fileContent = await file.arrayBuffer();

      const multipartRequestBody = 
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        metadataString +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n`;

      const multipartRequestBodyBuffer = new Uint8Array(
        new TextEncoder().encode(multipartRequestBody).length + fileContent.byteLength + close_delim.length
      );

      let offset = 0;
      const textEncoder = new TextEncoder();
      
      // Add metadata part
      const metadataPart = textEncoder.encode(multipartRequestBody);
      multipartRequestBodyBuffer.set(metadataPart, offset);
      offset += metadataPart.length;
      
      // Add file content
      multipartRequestBodyBuffer.set(new Uint8Array(fileContent), offset);
      offset += fileContent.byteLength;
      
      // Add closing delimiter
      const closingPart = textEncoder.encode(close_delim);
      multipartRequestBodyBuffer.set(closingPart, offset);

      const uploadResponse = await fetch(`${GOOGLE_DRIVE_UPLOAD_BASE}/files?uploadType=multipart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body: multipartRequestBodyBuffer,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const uploadedFile = await uploadResponse.json();
      
      // Convert to PropertyFile format
      const propertyFile: PropertyFile = {
        id: uploadedFile.id,
        propertyId,
        name: uploadedFile.name,
        type: this.inferFileType(fileName),
        fileType: this.getFileExtension(fileName),
        size: parseInt(uploadedFile.size || '0'),
        uploadedAt: new Date().toISOString(),
        downloadUrl: uploadedFile.webContentLink,
        processingStatus: 'completed',
      };

      return propertyFile;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Download a file from Google Drive
   */
  async downloadFile(fileId: string): Promise<Blob> {
    try {
      const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * List files for a property
   */
  async listPropertyFiles(propertyId: string, propertyName: string): Promise<PropertyFile[]> {
    try {
      const propertyFolderId = await this.getOrCreatePropertyFolder(propertyId, propertyName);
      
      const response = await fetch(
        `${GOOGLE_DRIVE_API_BASE}/files?q=parents in '${propertyFolderId}' and trashed=false&fields=files(id,name,size,createdTime,mimeType,webContentLink)`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.files.map((file: any) => ({
        id: file.id,
        propertyId,
        name: file.name,
        type: this.inferFileType(file.name),
        fileType: this.getFileExtension(file.name),
        size: parseInt(file.size || '0'),
        uploadedAt: file.createdTime,
        downloadUrl: file.webContentLink,
        processingStatus: 'completed' as const,
      }));
    } catch (error) {
      console.error('Error listing property files:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Google Drive
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Share a file with specific permissions
   */
  async shareFile(fileId: string, email: string, role: 'reader' | 'writer' | 'commenter' = 'reader'): Promise<void> {
    try {
      const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          type: 'user',
          emailAddress: email,
        }),
      });

      if (!response.ok) {
        throw new Error(`Share failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<DriveFile> {
    try {
      const response = await fetch(
        `${GOOGLE_DRIVE_API_BASE}/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get file metadata: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.config.refreshToken || !this.config.clientId || !this.config.clientSecret) {
      throw new Error('Refresh token, client ID, and client secret are required for token refresh');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.config.refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.config.accessToken = data.access_token;
      
      return data.access_token;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  /**
   * Infer file type from filename
   */
  private inferFileType(fileName: string): PropertyFile['type'] {
    const lowerName = fileName.toLowerCase();
    
    if (lowerName.includes('rent') && lowerName.includes('roll')) return 'rent_roll';
    if (lowerName.includes('t12') || lowerName.includes('operating')) return 't12';
    if (lowerName.includes('offering') || lowerName.includes('memo')) return 'offering_memo';
    if (lowerName.includes('pitch') || lowerName.includes('deck')) return 'pitch_deck';
    if (lowerName.includes('analysis') || lowerName.includes('financial')) return 'analysis';
    if (lowerName.includes('template')) return 'template';
    
    return 'other';
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'unknown';
  }
}

// Utility function to create a Google Drive service instance
export function createGoogleDriveService(accessToken: string, config?: Partial<GoogleDriveConfig>): GoogleDriveService {
  return new GoogleDriveService({
    accessToken,
    ...config,
  });
}

// Export types for use in components
// All interfaces are already exported above