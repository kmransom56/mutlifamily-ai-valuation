'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download,
  FileText,
  FileSpreadsheet,
  Presentation,
  File,
  Settings,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { ExportRequest, ExportResponse, ExportOptions } from '@/types/processing';

export interface ExportPanelProps {
  jobId: string | null;
  onExportComplete?: (result: ExportResponse) => void;
  className?: string;
}

interface AvailableExport {
  type: 'analysis' | 'pitch_deck' | 'summary' | 'full_report';
  name: string;
  description: string;
  formats: ('excel' | 'pdf' | 'pptx' | 'json' | 'csv')[];
}

export default function ExportPanel({
  jobId,
  onExportComplete,
  className = ''
}: ExportPanelProps) {
  const [availableExports, setAvailableExports] = useState<AvailableExport[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportResults, setExportResults] = useState<Map<string, ExportResponse>>(new Map());
  const [selectedOptions, setSelectedOptions] = useState<Record<string, ExportOptions>>({
    analysis: {
      format: 'excel',
      includeCharts: true,
      includeRawData: false,
      customSections: []
    },
    summary: {
      format: 'pdf',
      includeCharts: true,
      includeRawData: false,
      customSections: []
    },
    pitch_deck: {
      format: 'pptx',
      includeCharts: true,
      includeRawData: false,
      customSections: []
    },
    full_report: {
      format: 'excel',
      includeCharts: true,
      includeRawData: true,
      customSections: []
    }
  });

  useEffect(() => {
    if (jobId) {
      loadAvailableExports();
    }
  }, [jobId]);

  const loadAvailableExports = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/export?jobId=${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to load available exports');
      }

      const data = await response.json();
      setAvailableExports(data.exports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exports');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: 'analysis' | 'pitch_deck' | 'summary' | 'full_report') => {
    const options = selectedOptions[type];
    if (!options) {
      setError('Export options not configured');
      return;
    }

    setExporting(type);
    setError(null);

    try {
      const exportRequest: ExportRequest = {
        jobId: jobId || '',
        type,
        options
      };

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const result: ExportResponse = await response.json();
      
      // Store result
      setExportResults(prev => new Map(prev.set(type, result)));
      
      onExportComplete?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const updateExportOptions = (type: string, options: Partial<ExportOptions>) => {
    setSelectedOptions(prev => ({
      ...prev,
      [type]: { ...prev[type], ...options }
    }));
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-600" />;
      case 'pptx':
        return <Presentation className="h-4 w-4 text-orange-600" />;
      case 'json':
      case 'csv':
        return <File className="h-4 w-4 text-blue-600" />;
      default:
        return <File className="h-4 w-4 text-gray-600" />;
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'excel': return 'Excel';
      case 'pdf': return 'PDF';
      case 'pptx': return 'PowerPoint';
      case 'json': return 'JSON';
      case 'csv': return 'CSV';
      default: return format.toUpperCase();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading export options...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-blue-600" />
          Export & Download
        </CardTitle>
        <p className="text-sm text-gray-600">
          Export your analysis in various formats for sharing and presentation
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Export Error</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        )}

        {availableExports.map(exportType => {
          const exportResult = exportResults.get(exportType.type);
          const isExporting = exporting === exportType.type;
          const options = selectedOptions[exportType.type] || { format: exportType.formats[0], includeCharts: true, includeRawData: false, customSections: [] };

          return (
            <div key={exportType.type} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-lg">{exportType.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{exportType.description}</p>
                </div>
                
                {exportResult && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Ready</span>
                  </div>
                )}
              </div>

              {/* Format Selection */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Export Format</label>
                  <div className="flex flex-wrap gap-2">
                    {exportType.formats.map(format => (
                      <button
                        key={format}
                        onClick={() => updateExportOptions(exportType.type, { format: format as 'excel' | 'pdf' | 'json' | 'pptx' | 'csv' })}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
                          options.format === format
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {getFormatIcon(format)}
                        {getFormatLabel(format)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Export Options */}
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={options.includeCharts}
                      onChange={(e) => updateExportOptions(exportType.type, { includeCharts: e.target.checked })}
                      className="rounded"
                    />
                    Include Charts
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={options.includeRawData}
                      onChange={(e) => updateExportOptions(exportType.type, { includeRawData: e.target.checked })}
                      className="rounded"
                    />
                    Include Raw Data
                  </label>
                </div>

                {/* Export Actions */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => handleExport(exportType.type as 'analysis' | 'pitch_deck' | 'summary' | 'full_report')}
                      disabled={isExporting}
                      className="flex items-center gap-2"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Generate Export
                        </>
                      )}
                    </Button>
                    
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Advanced Options
                    </Button>
                  </div>

                  {exportResult && (
                    <div className="flex items-center gap-2">
                      <div className="text-right text-xs text-gray-600">
                        <div>{exportResult.filename}</div>
                        <div>{formatFileSize(exportResult.size)}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(exportResult.downloadUrl, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Bulk Export Options */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">Bulk Export</h4>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                availableExports.forEach(exportType => {
                  setTimeout(() => handleExport(exportType.type as 'analysis' | 'pitch_deck' | 'summary' | 'full_report'), Math.random() * 2000);
                });
              }}
              variant="outline"
              disabled={!!exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              Export All Formats
            </Button>
            
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Bulk Options
            </Button>
          </div>
        </div>

        {/* Export History */}
        {exportResults.size > 0 && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Recent Exports</h4>
            <div className="space-y-2">
              {Array.from(exportResults.entries()).map(([type, result]) => (
                <div key={type} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                  <div className="flex items-center gap-2">
                    {getFormatIcon(result.format)}
                    <div>
                      <div className="text-sm font-medium">{result.filename}</div>
                      <div className="text-xs text-gray-600">
                        {formatFileSize(result.size)} • {getFormatLabel(result.format)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-600">
                      Expires: {new Date(result.expiresAt).toLocaleDateString()}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(result.downloadUrl, '_blank')}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
