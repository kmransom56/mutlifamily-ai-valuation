'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail,
  Send,
  Clock,
  Users,
  Plus,
  Settings,
  Bell,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Edit,
  Trash2,
  Eye,
  Loader2
} from 'lucide-react';
import { InvestorNotification, InvestorRecipient } from '@/types/processing';

export interface InvestorNotificationsProps {
  jobId?: string;
  propertyId?: string;
  onNotificationSent?: (notification: InvestorNotification) => void;
  className?: string;
}

export default function InvestorNotifications({
  jobId,
  propertyId,
  onNotificationSent,
  className = ''
}: InvestorNotificationsProps) {
  const [notifications, setNotifications] = useState<InvestorNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('new_deal');
  const [formData, setFormData] = useState({
    type: 'new_deal',
    subject: '',
    content: '',
    recipients: [] as InvestorRecipient[],
    scheduledAt: ''
  });

  useEffect(() => {
    loadNotifications();
  }, [jobId, propertyId]);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (jobId) params.append('jobId', jobId);
      if (propertyId) params.append('propertyId', propertyId);
      params.append('limit', '20');

      const response = await fetch(`/api/investor-notifications?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotification = async () => {
    if (!formData.subject || !formData.content || formData.recipients.length === 0) {
      setError('Subject, content, and at least one recipient are required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/investor-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobId,
          propertyId,
          type: formData.type,
          subject: formData.subject,
          content: formData.content,
          recipients: formData.recipients,
          scheduledAt: formData.scheduledAt || undefined,
          attachments: [] // TODO: Add attachment support
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create notification');
      }

      const result = await response.json();
      
      // Reload notifications
      await loadNotifications();
      
      // Reset form
      setFormData({
        type: 'new_deal',
        subject: '',
        content: '',
        recipients: [],
        scheduledAt: ''
      });
      setShowCreateForm(false);
      
      onNotificationSent?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create notification');
    } finally {
      setCreating(false);
    }
  };

  const loadTemplate = (templateType: string) => {
    const templates = {
      new_deal: {
        subject: 'New Investment Opportunity - Premium Multifamily Property',
        content: `We're excited to present an exclusive investment opportunity that aligns with your portfolio objectives.

This premium multifamily property offers:
• Strong cash flow potential from day one
• Prime location with excellent growth prospects
• Professional management and recent improvements
• Attractive risk-adjusted returns

Key highlights:
• Cap Rate: 6.5%
• Projected IRR: 12.3%
• Cash-on-Cash Return: 8.7%
• 48 residential units in excellent condition

This opportunity is being shared with a select group of qualified investors. Please review the attached analysis and let us know if you'd like to schedule a property tour.

Best regards,
Your Investment Team`
      },
      analysis_complete: {
        subject: 'Property Analysis Complete - Ready for Review',
        content: `Good news! We've completed the comprehensive analysis for your property investment.

Your analysis includes:
• Detailed financial projections
• Market comparables and trends
• Risk assessment and mitigation strategies
• Investment recommendations

All reports are now available for download through your dashboard. Key findings show strong potential for value creation and stable returns.

Next steps:
1. Review the executive summary
2. Download detailed reports
3. Schedule a consultation to discuss findings

Please don't hesitate to reach out with any questions.`
      },
      price_change: {
        subject: 'Price Reduction Alert - Investment Opportunity',
        content: `We wanted to notify you immediately about a significant price reduction on a property in your target market.

Price Update:
• Previous asking price: $2,750,000
• New asking price: $2,650,000
• Reduction: $100,000 (3.6%)

This creates an even more attractive investment opportunity with improved returns:
• Enhanced cash-on-cash return
• Better entry valuation
• Increased equity upside potential

Given the competitive market, we recommend moving quickly if this fits your investment criteria.`
      },
      market_update: {
        subject: 'Weekly Market Update - Multifamily Investment Trends',
        content: `Here's your weekly update on multifamily market conditions and investment opportunities.

Market Highlights:
• Average cap rates holding steady at 5.8%
• Continued strong rental demand
• New construction starts declining
• Interest rate environment stabilizing

Investment Opportunities:
• 3 new listings in your target markets
• 2 off-market opportunities available
• Several value-add projects showing strong returns

Market Outlook:
Fundamentals remain strong with favorable supply/demand dynamics. We're seeing increased investor interest in secondary markets with better yield opportunities.

Reach out to discuss how these trends might impact your investment strategy.`
      }
    };

    const template = templates[templateType as keyof typeof templates];
    if (template) {
      setFormData(prev => ({
        ...prev,
        type: templateType,
        subject: template.subject,
        content: template.content
      }));
    }
  };

  const addRecipient = (recipient: InvestorRecipient) => {
    setFormData(prev => ({
      ...prev,
      recipients: [...prev.recipients, recipient]
    }));
  };

  const removeRecipient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Mail className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'new_deal':
        return '🏢';
      case 'analysis_complete':
        return '📊';
      case 'price_change':
        return '💰';
      case 'market_update':
        return '📈';
      default:
        return '📧';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-purple-600" />
            Investor Notifications
          </CardTitle>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Notification
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Error</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Create Notification Form */}
        {showCreateForm && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium mb-4">Create New Notification</h3>
            
            {/* Template Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Template</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { key: 'new_deal', label: 'New Deal', icon: '🏢' },
                  { key: 'analysis_complete', label: 'Analysis Complete', icon: '📊' },
                  { key: 'price_change', label: 'Price Change', icon: '💰' },
                  { key: 'market_update', label: 'Market Update', icon: '📈' }
                ].map(template => (
                  <button
                    key={template.key}
                    onClick={() => {
                      setSelectedTemplate(template.key);
                      loadTemplate(template.key);
                    }}
                    className={`p-3 border rounded-lg text-sm transition-colors ${
                      selectedTemplate === template.key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg mb-1">{template.icon}</div>
                    <div>{template.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Subject</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Email subject line"
              />
            </div>

            {/* Content */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Email content"
              />
            </div>

            {/* Recipients */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Recipients</label>
              <div className="space-y-2">
                {formData.recipients.map((recipient, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white border rounded">
                    <div>
                      <div className="font-medium">{recipient.name}</div>
                      <div className="text-sm text-gray-600">{recipient.email}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRecipient(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // For demo, add a sample recipient
                    addRecipient({
                      id: `recipient_${Date.now()}`,
                      name: 'John Investor',
                      email: 'john@example.com',
                      type: 'investor',
                      preferences: {
                        dealTypes: ['multifamily'],
                        locationPreferences: ['metro'],
                        investmentRange: { min: 1000000, max: 5000000 },
                        frequency: 'immediate'
                      }
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recipient
                </Button>
              </div>
            </div>

            {/* Schedule */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Schedule (Optional)</label>
              <input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleCreateNotification}
                disabled={creating}
                className="flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {formData.scheduledAt ? 'Schedule' : 'Send'} Notification
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Recent Notifications</h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={loadNotifications}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Mail className="h-8 w-8 mx-auto mb-2" />
              <p>No notifications yet</p>
              <p className="text-sm">Create your first investor notification above</p>
            </div>
          ) : (
            notifications.map(notification => (
              <div key={notification.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-xl">{getTypeIcon(notification.type)}</div>
                    <div>
                      <h4 className="font-medium">{notification.subject}</h4>
                      <p className="text-sm text-gray-600">
                        To {notification.recipients.length} recipient{notification.recipients.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getStatusColor(notification.status)}>
                      {getStatusIcon(notification.status)}
                      <span className="ml-1">{notification.status}</span>
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                  {notification.content}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {notification.recipients.length} recipients
                    </span>
                    
                    {notification.scheduledAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(notification.scheduledAt).toLocaleDateString()}
                      </span>
                    )}
                    
                    {notification.sentAt && (
                      <span>Sent {new Date(notification.sentAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}