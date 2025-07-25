import { useState, useCallback } from 'react';
import { PropertyFile } from '@/types/property';

export interface UseGoogleDriveOptions {
  accessToken?: string;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (file: PropertyFile) => void;
  onUploadError?: (error: string) => void;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export function useGoogleDrive(options: UseGoogleDriveOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [files, setFiles] = useState<PropertyFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (
    file: File,
    propertyId: string,
    propertyName: string,
    description?: string
  ): Promise<PropertyFile | null> => {
    if (!options.accessToken) {
      throw new Error('Access token is required for file upload');
    }

    setUploading(true);
    setError(null);

    const progressItem: UploadProgress = {
      file,
      progress: 0,
      status: 'uploading',
    };

    setUploadProgress(prev => [...prev, progressItem]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('propertyId', propertyId);
      formData.append('propertyName', propertyName);
      formData.append('accessToken', options.accessToken);
      if (description) {
        formData.append('description', description);
      }

      // Simulate progress updates (in a real implementation, you might use XMLHttpRequest for progress tracking)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => 
          prev.map(item => 
            item.file === file && item.status === 'uploading'
              ? { ...item, progress: Math.min(item.progress + 10, 90) }
              : item
          )
        );
      }, 200);

      const response = await fetch('/api/drive', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      
      setUploadProgress(prev => 
        prev.map(item => 
          item.file === file
            ? { ...item, progress: 100, status: 'completed' }
            : item
        )
      );

      options.onUploadComplete?.(data.file);
      return data.file;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      
      setUploadProgress(prev => 
        prev.map(item => 
          item.file === file
            ? { ...item, status: 'error', error: errorMessage }
            : item
        )
      );

      setError(errorMessage);
      options.onUploadError?.(errorMessage);
      return null;
    } finally {
      setUploading(false);
      
      // Clean up progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(item => item.file !== file));
      }, 3000);
    }
  }, [options]);

  const uploadMultipleFiles = useCallback(async (
    files: File[],
    propertyId: string,
    propertyName: string,
    description?: string
  ): Promise<PropertyFile[]> => {
    const uploadedFiles: PropertyFile[] = [];
    
    for (const file of files) {
      const uploadedFile = await uploadFile(file, propertyId, propertyName, description);
      if (uploadedFile) {
        uploadedFiles.push(uploadedFile);
      }
    }
    
    return uploadedFiles;
  }, [uploadFile]);

  const listFiles = useCallback(async (
    propertyId: string,
    propertyName: string
  ): Promise<PropertyFile[]> => {
    if (!options.accessToken) {
      throw new Error('Access token is required to list files');
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        propertyId,
        propertyName,
        accessToken: options.accessToken,
      });

      const response = await fetch(`/api/drive?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to list files');
      }

      const data = await response.json();
      setFiles(data.files);
      return data.files;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to list files';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [options.accessToken]);

  const downloadFile = useCallback(async (fileId: string, fileName: string): Promise<void> => {
    if (!options.accessToken) {
      throw new Error('Access token is required to download files');
    }

    try {
      const params = new URLSearchParams({
        fileId,
        accessToken: options.accessToken,
        action: 'download',
      });

      const response = await fetch(`/api/drive?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [options.accessToken]);

  const deleteFile = useCallback(async (fileId: string): Promise<void> => {
    if (!options.accessToken) {
      throw new Error('Access token is required to delete files');
    }

    try {
      const params = new URLSearchParams({
        fileId,
        accessToken: options.accessToken,
      });

      const response = await fetch(`/api/drive?${params}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      // Remove from local files list
      setFiles(prev => prev.filter(file => file.id !== fileId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [options.accessToken]);

  const shareFile = useCallback(async (
    fileId: string,
    email: string,
    role: 'reader' | 'writer' | 'commenter' = 'reader'
  ): Promise<void> => {
    if (!options.accessToken) {
      throw new Error('Access token is required to share files');
    }

    try {
      const response = await fetch('/api/drive', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          email,
          role,
          accessToken: options.accessToken,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Share failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Share failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [options.accessToken]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearProgress = useCallback(() => {
    setUploadProgress([]);
  }, []);

  return {
    // State
    uploading,
    uploadProgress,
    files,
    loading,
    error,

    // Actions
    uploadFile,
    uploadMultipleFiles,
    listFiles,
    downloadFile,
    deleteFile,
    shareFile,
    clearError,
    clearProgress,
  };
}