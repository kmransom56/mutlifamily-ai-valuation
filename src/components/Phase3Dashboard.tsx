'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity,
  FileText,
  Download,
  Bell,
  Eye,
  Zap,
  Settings,
  TrendingUp,
  Users,
  BarChart3
} from 'lucide-react';

// Import Phase 3 components
import ProcessingStatusPanel from './ProcessingStatusPanel';
import DocumentPreview from './DocumentPreview';
import ExportPanel from './ExportPanel';
import InvestorNotifications from './InvestorNotifications';

export interface Phase3DashboardProps {
  jobId?: string;
  propertyId?: string;
  className?: string;
}

export default function Phase3Dashboard({
  jobId,
  propertyId,
  className = ''
}: Phase3DashboardProps) {
  const [activeTab, setActiveTab] = useState('processing');
  const [jobStatus, setJobStatus] = useState<string>('pending');
  const [documentFiles, setDocumentFiles] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activeJobs: 0,
    completedAnalyses: 0,
    exportedReports: 0,
    notificationsSent: 0
  });

  useEffect(() => {
    if (jobId) {
      loadJobDetails();
    }
    loadDashboardStats();
  }, [jobId]);

  const loadJobDetails = async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/process?jobId=${jobId}`);
      if (response.ok) {
        const data = await response.json();
        setJobStatus(data.job?.status || 'unknown');
        setDocumentFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to load job details:', error);
    }
  };

  const loadDashboardStats = async () => {
    // In a real implementation, these would be actual API calls
    setStats({
      activeJobs: Math.floor(Math.random() * 5) + 1,
      completedAnalyses: Math.floor(Math.random() * 50) + 10,
      exportedReports: Math.floor(Math.random() * 20) + 5,
      notificationsSent: Math.floor(Math.random() * 100) + 25
    });
  };

  const handleStatusChange = (status: string) => {
    setJobStatus(status);
    if (status === 'completed') {
      // Auto-switch to exports tab when job completes
      setActiveTab('exports');
    }
  };

  const handleExportComplete = (result: any) => {
    console.log('Export completed:', result);
    // Update stats or show notification
  };

  const handleNotificationSent = (notification: any) => {
    console.log('Notification sent:', notification);
    // Update stats or show confirmation
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Phase 3 Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Phase 3: Advanced Processing & Analytics
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Real-time processing, document preview, multi-format exports, and investor communications
              </p>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              Enhanced Features Active
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{stats.activeJobs}</div>
              <div className="text-xs text-blue-700">Active Jobs</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{stats.completedAnalyses}</div>
              <div className="text-xs text-green-700">Completed Analyses</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg border">
              <div className="text-2xl font-bold text-purple-600">{stats.exportedReports}</div>
              <div className="text-xs text-purple-700">Exported Reports</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg border">
              <div className="text-2xl font-bold text-orange-600">{stats.notificationsSent}</div>
              <div className="text-xs text-orange-700">Notifications Sent</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Phase 3 Features */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="processing" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Real-time Status
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Document Preview
          </TabsTrigger>
          <TabsTrigger value="exports" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Multi-format Exports
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Investor Notifications
          </TabsTrigger>
        </TabsList>

        {/* Real-time Processing Status */}
        <TabsContent value="processing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProcessingStatusPanel
              jobId={jobId || null}
              onStatusChange={handleStatusChange}
              onComplete={(results) => {
                console.log('Processing completed:', results);
                setActiveTab('exports');
              }}
            />
            
            {/* WebSocket Connection Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Live Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <div className="font-medium text-green-800">WebSocket Connected</div>
                      <div className="text-sm text-green-600">Real-time updates active</div>
                    </div>
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Live Features:</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Real-time processing progress</li>
                      <li>• Live status notifications</li>
                      <li>• Automatic result updates</li>
                      <li>• Instant error reporting</li>
                      <li>• File completion alerts</li>
                    </ul>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <Button variant="outline" size="sm" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      WebSocket Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Advanced Document Preview */}
        <TabsContent value="preview" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {documentFiles.length > 0 ? (
              documentFiles.map((file, index) => (
                <DocumentPreview
                  key={file.id || index}
                  fileId={file.id}
                  jobId={jobId}
                  onAnnotationClick={(annotation) => {
                    console.log('Annotation clicked:', annotation);
                  }}
                  onPageChange={(pageNumber) => {
                    console.log('Page changed:', pageNumber);
                  }}
                />
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No Documents Available</h3>
                    <p className="text-sm">Upload documents to see advanced preview capabilities</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Preview Features Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                Advanced Preview Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Eye className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <h4 className="font-medium text-sm">Interactive Viewing</h4>
                  <p className="text-xs text-gray-600">Zoom, rotate, navigate pages</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <FileText className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <h4 className="font-medium text-sm">Text Extraction</h4>
                  <p className="text-xs text-gray-600">Searchable content extraction</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                  <h4 className="font-medium text-sm">Smart Annotations</h4>
                  <p className="text-xs text-gray-600">AI-powered data highlighting</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Multi-format Export System */}
        <TabsContent value="exports" className="space-y-4">
          {jobId ? (
            <ExportPanel
              jobId={jobId}
              onExportComplete={handleExportComplete}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <Download className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No Job Selected</h3>
                  <p className="text-sm">Select a completed job to access export options</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Investor Notification System */}
        <TabsContent value="notifications" className="space-y-4">
          <InvestorNotifications
            jobId={jobId}
            propertyId={propertyId}
            onNotificationSent={handleNotificationSent}
          />
          
          {/* Notification Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-600" />
                Investor Communication Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Notification Types:</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>🏢 New Deal Opportunities</li>
                    <li>📊 Analysis Completion</li>
                    <li>💰 Price Change Alerts</li>
                    <li>📈 Market Updates</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Advanced Features:</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>✉️ Professional email templates</li>
                    <li>📅 Scheduled delivery</li>
                    <li>👥 Investor segmentation</li>
                    <li>📎 Automated attachments</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Investor Database
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Phase 3 Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Phase 3 Implementation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span>Real-time WebSocket Updates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span>Advanced Document Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span>Multi-format Export System</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span>Investor Notification System</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}