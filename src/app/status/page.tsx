'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function StatusPage() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  
  const [status, setStatus] = useState('loading');
  const [files, setFiles] = useState({});
  const [propertyInfo, setPropertyInfo] = useState({});
  const [error, setError] = useState('');
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!jobId) {
      setStatus('error');
      setError('No job ID provided');
      return;
    }

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/process?jobId=${jobId}`);
        const data = await response.json();

        if (data.success) {
          setStatus(data.status);
          setFiles(data.files || {});
          setPropertyInfo(data.propertyInfo || {});
          
          // If processing is complete, stop polling
          if (data.status === 'completed') {
            setIsPolling(false);
          }
        } else {
          setStatus('error');
          setError(data.message || 'An error occurred while checking status');
          setIsPolling(false);
        }
      } catch (err) {
        setStatus('error');
        setError('Failed to check processing status');
        console.error(err);
        setIsPolling(false);
      }
    };

    // Check status immediately
    checkStatus();

    // Set up polling if needed
    let intervalId;
    if (isPolling) {
      intervalId = setInterval(checkStatus, 5000); // Check every 5 seconds
    }

    // Clean up interval on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [jobId, isPolling]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">
            Processing Status
          </h1>
          
          <div className="card">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Job ID: {jobId}</h2>
              
              {propertyInfo && propertyInfo.propertyName && (
                <div className="mb-4 p-4 bg-gray-50 rounded-md">
                  <h3 className="font-medium mb-2">Property Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Name:</strong> {propertyInfo.propertyName}</div>
                    <div><strong>Type:</strong> {propertyInfo.propertyType}</div>
                    <div><strong>Strategy:</strong> {propertyInfo.investmentStrategy}</div>
                    <div><strong>Units:</strong> {propertyInfo.units}</div>
                    <div><strong>Location:</strong> {propertyInfo.location}</div>
                  </div>
                </div>
              )}
              
              {status === 'loading' && (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <p>Checking status...</p>
                </div>
              )}
              
              {status === 'processing' && (
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <p>Processing your documents...</p>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full animate-pulse w-3/4"></div>
                  </div>
                  
                  <p className="mt-2 text-sm text-gray-500">
                    This may take a few minutes depending on the size and complexity of your documents.
                  </p>
                </div>
              )}
              
              {status === 'completed' && (
                <div>
                  <div className="flex items-center space-x-3 mb-4 text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="font-medium">Processing completed successfully!</p>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="font-medium mb-3">Download Results:</h3>
                    <div className="space-y-3">
                      {files.populatedTemplate && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <span>Populated Analysis Template</span>
                          <a 
                            href={files.populatedTemplate}
                            download
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Download
                          </a>
                        </div>
                      )}
                      
                      {files.integratedData && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <span>Integrated Property Data (JSON)</span>
                          <a 
                            href={files.integratedData}
                            download
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Download
                          </a>
                        </div>
                      )}
                      
                      {files.analysisData && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <span>Analysis Data (JSON)</span>
                          <a 
                            href={files.analysisData}
                            download
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Download
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex justify-between">
                      <Link 
                        href="/dashboard"
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View in Dashboard
                      </Link>
                      
                      <Link 
                        href="/properties"
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Add to Properties
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              
              {status === 'error' && (
                <div className="text-red-600">
                  <div className="flex items-center space-x-3 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium">Error: {error}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Link 
                href="/"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
