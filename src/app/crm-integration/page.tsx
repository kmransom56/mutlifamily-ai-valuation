'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GoHighLevelCRM from '@/lib/gohighlevel-crm';

export default function CRMIntegrationPage() {
  const [apiKey, setApiKey] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // CRM settings
  const [settings, setSettings] = useState({
    investorPipelineId: '',
    propertyPipelineId: '',
    newPropertyStageId: '',
    newInvestorStageId: '',
    propertyAnalysisTemplateId: '',
    investorNotificationTemplateId: ''
  });
  
  // Test connection to Go High Level
  const testConnection = async () => {
    if (!apiKey || !locationId) {
      setError('API Key and Location ID are required');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const crm = new GoHighLevelCRM(apiKey, locationId);
      
      // Test the connection by trying to fetch contacts
      const response = await crm.getContacts({ limit: 1 });
      
      if (response && !response.error) {
        setIsConnected(true);
        setSuccessMessage('Successfully connected to Go High Level!');
      } else {
        setError('Failed to connect: ' + (response.error || 'Unknown error'));
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save CRM settings
  const saveSettings = () => {
    // In a real app, this would save to a database or configuration file
    localStorage.setItem('ghl_api_key', apiKey);
    localStorage.setItem('ghl_location_id', locationId);
    localStorage.setItem('ghl_settings', JSON.stringify(settings));
    
    setSuccessMessage('CRM settings saved successfully!');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };
  
  // Handle settings change
  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettings({
      ...settings,
      [name]: value
    });
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Go High Level CRM Integration</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Connection Settings</h2>
            
            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Go High Level API Key"
                  className="w-full"
                />
                <span className="form-hint">
                  You can find your API key in your Go High Level account settings
                </span>
              </div>
              
              <div className="form-group">
                <label className="form-label">Location ID</label>
                <input
                  type="text"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  placeholder="Enter your Go High Level Location ID"
                  className="w-full"
                />
                <span className="form-hint">
                  The Location ID is specific to your GHL account
                </span>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={testConnection}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {isLoading ? 'Testing...' : 'Test Connection'}
                </button>
                
                <button
                  onClick={saveSettings}
                  disabled={!isConnected || isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Save Settings
                </button>
              </div>
              
              {error && (
                <div className="alert alert-error">
                  {error}
                </div>
              )}
              
              {successMessage && (
                <div className="alert alert-success">
                  {successMessage}
                </div>
              )}
              
              {isConnected && (
                <div className="flex items-center text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Connected to Go High Level</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">CRM Configuration</h2>
            
            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label">Investor Pipeline ID</label>
                <input
                  type="text"
                  name="investorPipelineId"
                  value={settings.investorPipelineId}
                  onChange={handleSettingsChange}
                  placeholder="Enter Investor Pipeline ID"
                  className="w-full"
                  disabled={!isConnected}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Property Pipeline ID</label>
                <input
                  type="text"
                  name="propertyPipelineId"
                  value={settings.propertyPipelineId}
                  onChange={handleSettingsChange}
                  placeholder="Enter Property Pipeline ID"
                  className="w-full"
                  disabled={!isConnected}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">New Property Stage ID</label>
                <input
                  type="text"
                  name="newPropertyStageId"
                  value={settings.newPropertyStageId}
                  onChange={handleSettingsChange}
                  placeholder="Enter New Property Stage ID"
                  className="w-full"
                  disabled={!isConnected}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">New Investor Stage ID</label>
                <input
                  type="text"
                  name="newInvestorStageId"
                  value={settings.newInvestorStageId}
                  onChange={handleSettingsChange}
                  placeholder="Enter New Investor Stage ID"
                  className="w-full"
                  disabled={!isConnected}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Property Analysis Email Template ID</label>
                <input
                  type="text"
                  name="propertyAnalysisTemplateId"
                  value={settings.propertyAnalysisTemplateId}
                  onChange={handleSettingsChange}
                  placeholder="Enter Email Template ID"
                  className="w-full"
                  disabled={!isConnected}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Investor Notification Email Template ID</label>
                <input
                  type="text"
                  name="investorNotificationTemplateId"
                  value={settings.investorNotificationTemplateId}
                  onChange={handleSettingsChange}
                  placeholder="Enter Email Template ID"
                  className="w-full"
                  disabled={!isConnected}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 card">
          <h2 className="text-xl font-semibold mb-6">Integration Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-md">
              <h3 className="font-medium mb-2">Property Management</h3>
              <p className="text-sm text-gray-600 mb-4">
                Automatically create property records in Go High Level when new properties are analyzed.
              </p>
              <div className="flex items-center">
                <input type="checkbox" id="enablePropertySync" className="mr-2" checked={isConnected} disabled={!isConnected} />
                <label htmlFor="enablePropertySync">Enable Property Sync</label>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-md">
              <h3 className="font-medium mb-2">Investor Management</h3>
              <p className="text-sm text-gray-600 mb-4">
                Manage investor contacts and communications through Go High Level.
              </p>
              <div className="flex items-center">
                <input type="checkbox" id="enableInvestorSync" className="mr-2" checked={isConnected} disabled={!isConnected} />
                <label htmlFor="enableInvestorSync">Enable Investor Sync</label>
              </div>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-md">
              <h3 className="font-medium mb-2">Automated Notifications</h3>
              <p className="text-sm text-gray-600 mb-4">
                Send automated emails and SMS to investors when new properties are analyzed.
              </p>
              <div className="flex items-center">
                <input type="checkbox" id="enableNotifications" className="mr-2" checked={isConnected} disabled={!isConnected} />
                <label htmlFor="enableNotifications">Enable Notifications</label>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-medium mb-4">Integration Actions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                className="p-3 border border-gray-300 rounded-md hover:bg-gray-50 text-left disabled:opacity-50"
                disabled={!isConnected}
              >
                <div className="font-medium">Sync Existing Properties</div>
                <div className="text-sm text-gray-600">
                  Push all existing properties to Go High Level
                </div>
              </button>
              
              <button
                className="p-3 border border-gray-300 rounded-md hover:bg-gray-50 text-left disabled:opacity-50"
                disabled={!isConnected}
              >
                <div className="font-medium">Import Investors from CRM</div>
                <div className="text-sm text-gray-600">
                  Import investor contacts from Go High Level
                </div>
              </button>
              
              <button
                className="p-3 border border-gray-300 rounded-md hover:bg-gray-50 text-left disabled:opacity-50"
                disabled={!isConnected}
              >
                <div className="font-medium">Test Investor Notification</div>
                <div className="text-sm text-gray-600">
                  Send a test notification to verify email templates
                </div>
              </button>
              
              <button
                className="p-3 border border-gray-300 rounded-md hover:bg-gray-50 text-left disabled:opacity-50"
                disabled={!isConnected}
              >
                <div className="font-medium">Verify CRM Custom Fields</div>
                <div className="text-sm text-gray-600">
                  Check if all required custom fields exist in Go High Level
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
