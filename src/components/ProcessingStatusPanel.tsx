'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  RefreshCw,
  Download,
  Eye,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';
import { useJobStatusEvents } from '@/hooks/useSSE';
import { ProcessingStatusUpdate } from '@/types/processing';

export interface ProcessingStatusPanelProps {
  jobId: string | null;
  onStatusChange?: (status: string) => void;
  onComplete?: (results: any) => void;
  className?: string;
}

export default function ProcessingStatusPanel({
  jobId,
  onStatusChange,
  onComplete,
  className = ''
}: ProcessingStatusPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [statusHistory, setStatusHistory] = useState<ProcessingStatusUpdate[]>([]);
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});

  const {
    connected,
    jobStatus,
    jobResults,
    jobError
  } = useJobStatusEvents(jobId);

  // Update status history when new status arrives
  useEffect(() => {
    if (jobStatus) {
      setStatusHistory(prev => {
        const newHistory = [...prev, jobStatus];
        // Keep only last 10 status updates
        return newHistory.slice(-10);
      });
      onStatusChange?.(jobStatus.status);
    }
  }, [jobStatus, onStatusChange]);

  // Handle job completion
  useEffect(() => {
    if (jobResults) {
      if (jobResults.downloadUrls) {
        setDownloadUrls(jobResults.downloadUrls);
      }
      onComplete?.(jobResults);
    }
  }, [jobResults, onComplete]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!jobId) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Activity className="h-8 w-8 mx-auto mb-2" />
            <p>No active processing job</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Processing Status
            {jobStatus && (
              <Badge variant="outline" className={getStatusColor(jobStatus.status)}>
                {jobStatus.status}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Connection status */}
            <div className="flex items-center gap-1">
              {connected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-gray-600">
                {connected ? 'Live' : 'Disconnected'}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '−' : '+'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Current Status */}
          {jobStatus && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(jobStatus.status)}
                  <span className="font-medium">{jobStatus.currentStep}</span>
                </div>
                <span className="text-sm text-gray-600">
                  {formatTimestamp(jobStatus.timestamp)}
                </span>
              </div>
              
              {jobStatus.status === 'processing' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(jobStatus.progress)}%</span>
                  </div>
                  <Progress value={jobStatus.progress} className="w-full" />
                </div>
              )}
              
              <p className="text-sm text-gray-700">{jobStatus.message}</p>
              
              {jobStatus.files && (
                <div className="text-xs text-gray-600">
                  Files: {jobStatus.files.processed} / {jobStatus.files.total} processed
                  {jobStatus.files.current && (
                    <span className="ml-2">Current: {jobStatus.files.current}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {jobError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm text-red-600 mt-1">{jobError}</p>
            </div>
          )}

          {/* Download Links */}
          {Object.keys(downloadUrls).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Download className="h-4 w-4" />
                Available Downloads
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(downloadUrls).map(([name, url]) => (
                  <Button
                    key={name}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => window.open(url, '_blank')}
                  >
                    <Download className="h-3 w-3 mr-2" />
                    {name.replace(/([A-Z])/g, ' $1').trim()}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Status History */}
          {statusHistory.length > 1 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Recent Updates</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {statusHistory.slice(-5).reverse().map((update, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-gray-600 py-1">
                    {getStatusIcon(update.status)}
                    <span className="flex-1">{update.currentStep}</span>
                    <span>{formatTimestamp(update.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connection Controls */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {/* SSE auto-connects; control not needed */}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
            
            {jobId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`/api/process?jobId=${jobId}`, '_blank')}
                className="flex items-center gap-2"
              >
                <Eye className="h-3 w-3" />
                View Job
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}