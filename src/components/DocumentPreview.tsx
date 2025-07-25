'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText,
  Image,
  File,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Maximize2,
  Eye,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { DocumentPreview as DocumentPreviewType, DocumentPage, DocumentAnnotation } from '@/types/processing';

export interface DocumentPreviewProps {
  fileId?: string;
  jobId?: string;
  filePath?: string;
  onAnnotationClick?: (annotation: DocumentAnnotation) => void;
  onPageChange?: (pageNumber: number) => void;
  className?: string;
}

export default function DocumentPreview({
  fileId,
  jobId,
  filePath,
  onAnnotationClick,
  onPageChange,
  className = ''
}: DocumentPreviewProps) {
  const [preview, setPreview] = useState<DocumentPreviewType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{page: number, matches: number}>>([]);

  useEffect(() => {
    if (fileId || filePath) {
      loadPreview();
    }
  }, [fileId, jobId, filePath]);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);

    try {
      // First try to get existing preview
      let response = await fetch(`/api/document-preview?${
        fileId ? `fileId=${fileId}` : `id=${encodeURIComponent(filePath || '')}`
      }`);

      if (!response.ok && response.status === 404) {
        // Generate new preview
        response = await fetch('/api/document-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileId,
            jobId,
            filePath,
            options: {
              generateThumbnails: true,
              extractText: true,
              generateAnnotations: true
            }
          })
        });
      }

      if (!response.ok) {
        throw new Error('Failed to load document preview');
      }

      const data = await response.json();
      setPreview(data.preview || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (pageNumber: number) => {
    if (preview && pageNumber >= 1 && pageNumber <= preview.pages.length) {
      setCurrentPage(pageNumber);
      onPageChange?.(pageNumber);
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      const newZoom = direction === 'in' ? prev * 1.2 : prev / 1.2;
      return Math.max(0.5, Math.min(3, newZoom));
    });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleSearch = () => {
    if (!preview || !searchTerm) {
      setSearchResults([]);
      return;
    }

    const results: Array<{page: number, matches: number}> = [];
    
    preview.pages.forEach((page, index) => {
      if (page.textContent) {
        const matches = (page.textContent.toLowerCase().match(new RegExp(searchTerm.toLowerCase(), 'g')) || []).length;
        if (matches > 0) {
          results.push({ page: index + 1, matches });
        }
      }
    });

    setSearchResults(results);
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Generating document preview...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <Button onClick={loadPreview} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preview) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-gray-500">
            <File className="h-8 w-8 mx-auto mb-2" />
            <p>No document preview available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentPageData = preview.pages[currentPage - 1];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getDocumentIcon(preview.type)}
            Document Preview
            <Badge variant="outline" className={getQualityColor(preview.metadata.quality)}>
              {preview.metadata.quality} quality
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'single' ? 'grid' : 'single')}
            >
              {viewMode === 'single' ? <Grid3X3 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            
            <Button variant="ghost" size="sm" onClick={loadPreview}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search document content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-2 py-1 border rounded text-sm"
            />
            <Button onClick={handleSearch} size="sm" variant="outline">
              Search
            </Button>
          </div>
          
          {searchResults.length > 0 && (
            <Badge variant="outline">
              {searchResults.reduce((sum, result) => sum + result.matches, 0)} matches
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm text-gray-600">
              Page {currentPage} of {preview.pages.length}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= preview.pages.length}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleZoom('out')}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <span className="text-sm text-gray-600 min-w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            
            <Button variant="outline" size="sm" onClick={() => handleZoom('in')}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={showAnnotations ? 'bg-blue-50' : ''}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Document View */}
        <div className="border rounded-lg overflow-hidden bg-gray-50">
          {viewMode === 'single' ? (
            <SinglePageView
              page={currentPageData}
              zoom={zoom}
              rotation={rotation}
              showAnnotations={showAnnotations}
              onAnnotationClick={onAnnotationClick}
            />
          ) : (
            <GridView
              pages={preview.pages}
              currentPage={currentPage}
              onPageClick={handlePageChange}
              showAnnotations={showAnnotations}
            />
          )}
        </div>

        {/* Page Info */}
        {currentPageData && (
          <div className="space-y-2">
            {currentPageData.textContent && (
              <div>
                <h4 className="font-medium text-sm mb-2">Extracted Text</h4>
                <div className="max-h-32 overflow-y-auto bg-gray-50 p-3 rounded border text-xs font-mono">
                  {currentPageData.textContent}
                </div>
              </div>
            )}
            
            {currentPageData.annotations && currentPageData.annotations.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Annotations</h4>
                <div className="space-y-1">
                  {currentPageData.annotations.map(annotation => (
                    <div
                      key={annotation.id}
                      className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded text-xs cursor-pointer hover:bg-blue-100"
                      onClick={() => onAnnotationClick?.(annotation)}
                    >
                      <span>{annotation.content}</span>
                      {annotation.confidence && (
                        <Badge variant="outline" className="ml-2">
                          {Math.round(annotation.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Search Results</h4>
            <div className="space-y-1">
              {searchResults.map(result => (
                <div
                  key={result.page}
                  className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded text-xs cursor-pointer hover:bg-yellow-100"
                  onClick={() => handlePageChange(result.page)}
                >
                  <span>Page {result.page}</span>
                  <Badge variant="outline">
                    {result.matches} match{result.matches !== 1 ? 'es' : ''}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document Metadata */}
        <div className="pt-2 border-t">
          <h4 className="font-medium text-sm mb-2">Document Information</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>Pages: {preview.metadata.totalPages}</div>
            <div>Quality: {preview.metadata.quality}</div>
            <div>Has Text: {preview.metadata.hasText ? 'Yes' : 'No'}</div>
            <div>Type: {preview.type}</div>
          </div>
          
          {preview.metadata.extractedData && (
            <div className="mt-2">
              <details className="text-xs">
                <summary className="cursor-pointer font-medium">Extracted Data</summary>
                <pre className="mt-1 p-2 bg-gray-50 rounded overflow-auto max-h-32">
                  {JSON.stringify(preview.metadata.extractedData, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Single page view component
function SinglePageView({ 
  page, 
  zoom, 
  rotation, 
  showAnnotations, 
  onAnnotationClick 
}: {
  page: DocumentPage;
  zoom: number;
  rotation: number;
  showAnnotations: boolean;
  onAnnotationClick?: (annotation: DocumentAnnotation) => void;
}) {
  return (
    <div className="flex items-center justify-center p-4 min-h-96 relative">
      <div 
        className="relative border bg-white shadow-lg"
        style={{
          transform: `scale(${zoom}) rotate(${rotation}deg)`,
          transformOrigin: 'center'
        }}
      >
        <img
          src={page.imageUrl}
          alt={`Page ${page.pageNumber}`}
          className="max-w-full h-auto"
          onError={(e) => {
            e.currentTarget.src = '/images/document-placeholder.png';
          }}
        />
        
        {/* Annotations overlay */}
        {showAnnotations && page.annotations && page.annotations.map(annotation => (
          <div
            key={annotation.id}
            className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-30 cursor-pointer hover:bg-opacity-50"
            style={{
              left: `${annotation.coordinates.x}px`,
              top: `${annotation.coordinates.y}px`,
              width: `${annotation.coordinates.width}px`,
              height: `${annotation.coordinates.height}px`
            }}
            onClick={() => onAnnotationClick?.(annotation)}
            title={annotation.content}
          />
        ))}
      </div>
    </div>
  );
}

// Grid view component
function GridView({ 
  pages, 
  currentPage, 
  onPageClick, 
  showAnnotations 
}: {
  pages: DocumentPage[];
  currentPage: number;
  onPageClick: (pageNumber: number) => void;
  showAnnotations: boolean;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {pages.map((page, index) => (
        <div
          key={page.pageNumber}
          className={`relative cursor-pointer border-2 rounded overflow-hidden ${
            currentPage === page.pageNumber 
              ? 'border-blue-500 ring-2 ring-blue-200' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onPageClick(page.pageNumber)}
        >
          <img
            src={page.thumbnailUrl || page.imageUrl}
            alt={`Page ${page.pageNumber}`}
            className="w-full h-auto"
            onError={(e) => {
              e.currentTarget.src = '/images/document-placeholder.png';
            }}
          />
          
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 text-center">
            Page {page.pageNumber}
          </div>
          
          {showAnnotations && page.annotations && page.annotations.length > 0 && (
            <div className="absolute top-1 right-1">
              <Badge className="text-xs">
                {page.annotations.length}
              </Badge>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}