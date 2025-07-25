'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  File, 
  Download, 
  Share, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  Cloud,
  FileText,
  Image,
  FileSpreadsheet,
  FileImage,
  X
} from 'lucide-react';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { PropertyFile } from '@/types/property';

export interface GoogleDriveUploadProps {
  propertyId: string;
  propertyName: string;
  accessToken?: string;
  onFilesChange?: (files: PropertyFile[]) => void;
  className?: string;
}

export default function GoogleDriveUpload({
  propertyId,
  propertyName,
  accessToken,
  onFilesChange,
  className = ''
}: GoogleDriveUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'reader' | 'writer' | 'commenter'>('reader');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const {
    uploading,
    uploadProgress,
    files,
    loading,
    error,
    uploadFile,
    uploadMultipleFiles,
    listFiles,
    downloadFile,
    deleteFile,
    shareFile,
    clearError
  } = useGoogleDrive({
    accessToken,
    onUploadComplete: (file) => {
      onFilesChange?.(files.concat(file));
      setSelectedFiles([]);
      setDescription('');
    }
  });

  // Load files on component mount
  React.useEffect(() => {
    if (accessToken && propertyId && propertyName) {
      listFiles(propertyId, propertyName).catch(console.error);
    }
  }, [accessToken, propertyId, propertyName, listFiles]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles(files);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleUpload = async () => {
    if (!accessToken) {
      alert('Please connect to Google Drive first');
      return;
    }

    if (selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    try {
      await uploadMultipleFiles(selectedFiles, propertyId, propertyName, description);
      // Refresh file list after upload
      await listFiles(propertyId, propertyName);
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      await downloadFile(fileId, fileName);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await deleteFile(fileId);
      // Refresh file list after deletion
      await listFiles(propertyId, propertyName);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleShare = async () => {
    if (!selectedFileId || !shareEmail) {
      alert('Please select a file and enter an email address');
      return;
    }

    try {
      await shareFile(selectedFileId, shareEmail, shareRole);
      alert('File shared successfully!');
      setSelectedFileId(null);
      setShareEmail('');
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileImage className="h-5 w-5 text-blue-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const getFileTypeColor = (type: PropertyFile['type']) => {
    switch (type) {
      case 'rent_roll':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 't12':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'offering_memo':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'pitch_deck':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'analysis':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Google Drive Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
              <Button variant="ghost" size="sm" onClick={clearError}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {!accessToken && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                Connect to Google Drive to enable cloud storage for your property documents.
              </p>
            </div>
          )}

          {/* File Drop Zone */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Support for PDF, Excel, Word, and image files
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={!accessToken}
            >
              Choose Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.xlsx,.xls,.doc,.docx,.csv,.jpg,.jpeg,.png,.gif"
            />
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Selected Files:</h4>
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.name.split('.').pop() || '')}
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-gray-500">{formatFileSize(file.size)}</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="space-y-3">
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter a description for these files..."
                  />
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={uploading || !accessToken}
                  className="w-full"
                >
                  {uploading ? 'Uploading...' : 'Upload to Google Drive'}
                </Button>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Upload Progress:</h4>
              {uploadProgress.map((progress, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{progress.file.name}</span>
                    <div className="flex items-center gap-2">
                      {progress.status === 'completed' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {progress.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">{progress.progress}%</span>
                    </div>
                  </div>
                  <Progress value={progress.progress} />
                  {progress.error && (
                    <p className="text-sm text-red-600">{progress.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Property Files ({files.length})
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => listFiles(propertyId, propertyName)}
              disabled={loading}
            >
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="text-sm text-gray-500">Loading files...</div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No files uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.fileType)}
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={getFileTypeColor(file.type)}>
                          {file.type.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file.id, file.name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFileId(file.id)}
                    >
                      <Share className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share Dialog */}
      {selectedFileId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Share File</span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFileId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="shareEmail">Email Address</Label>
              <Input
                id="shareEmail"
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="Enter email address..."
              />
            </div>

            <div>
              <Label htmlFor="shareRole">Permission Level</Label>
              <select
                id="shareRole"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value as any)}
              >
                <option value="reader">Reader (view only)</option>
                <option value="commenter">Commenter (view and comment)</option>
                <option value="writer">Writer (full access)</option>
              </select>
            </div>

            <Button onClick={handleShare} className="w-full">
              Share File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}