'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Cloud, Key, LogOut } from 'lucide-react';

export interface GoogleDriveAuthProps {
  onAuthSuccess?: (accessToken: string) => void;
  onAuthError?: (error: string) => void;
  onDisconnect?: () => void;
  className?: string;
}

export interface GoogleAuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  userEmail: string | null;
  error: string | null;
}

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`;
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email'
].join('%20');

export default function GoogleDriveAuth({
  onAuthSuccess,
  onAuthError,
  onDisconnect,
  className = ''
}: GoogleDriveAuthProps) {
  const [authState, setAuthState] = useState<GoogleAuthState>({
    isAuthenticated: false,
    accessToken: null,
    userEmail: null,
    error: null
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load stored auth state on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('google_drive_access_token');
    const storedEmail = localStorage.getItem('google_drive_user_email');
    const tokenExpiry = localStorage.getItem('google_drive_token_expiry');

    if (storedToken && tokenExpiry) {
      const expiryTime = new Date(tokenExpiry);
      const now = new Date();

      if (now < expiryTime) {
        setAuthState({
          isAuthenticated: true,
          accessToken: storedToken,
          userEmail: storedEmail,
          error: null
        });
        onAuthSuccess?.(storedToken);
      } else {
        // Token expired, clear storage
        clearStoredAuth();
      }
    }
  }, [onAuthSuccess]);

  // Listen for OAuth callback messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        const { access_token, expires_in } = event.data;
        handleAuthSuccess(access_token, expires_in);
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        handleAuthError(event.data.error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const clearStoredAuth = () => {
    localStorage.removeItem('google_drive_access_token');
    localStorage.removeItem('google_drive_user_email');
    localStorage.removeItem('google_drive_token_expiry');
  };

  const handleAuthSuccess = async (accessToken: string, expiresIn: number) => {
    try {
      setIsLoading(true);

      // Get user info
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      let userEmail = null;
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        userEmail = userInfo.email;
      }

      // Calculate expiry time
      const expiryTime = new Date(Date.now() + (expiresIn * 1000));

      // Store auth data
      localStorage.setItem('google_drive_access_token', accessToken);
      localStorage.setItem('google_drive_token_expiry', expiryTime.toISOString());
      if (userEmail) {
        localStorage.setItem('google_drive_user_email', userEmail);
      }

      setAuthState({
        isAuthenticated: true,
        accessToken,
        userEmail,
        error: null
      });

      onAuthSuccess?.(accessToken);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      handleAuthError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthError = (error: string) => {
    setAuthState(prev => ({
      ...prev,
      error,
      isAuthenticated: false,
      accessToken: null,
      userEmail: null
    }));
    clearStoredAuth();
    onAuthError?.(error);
    setIsLoading(false);
  };

  const initiateAuth = () => {
    if (!GOOGLE_CLIENT_ID) {
      handleAuthError('Google Client ID not configured');
      return;
    }

    setIsLoading(true);
    setAuthState(prev => ({ ...prev, error: null }));

    // Build OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', GOOGLE_SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    // Open popup window
    const popup = window.open(
      authUrl.toString(),
      'google-auth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    // Monitor popup
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        setIsLoading(false);
      }
    }, 1000);

    // Timeout after 5 minutes
    setTimeout(() => {
      if (popup && !popup.closed) {
        popup.close();
        handleAuthError('Authentication timeout');
      }
      clearInterval(checkClosed);
    }, 5 * 60 * 1000);
  };

  const disconnect = () => {
    setAuthState({
      isAuthenticated: false,
      accessToken: null,
      userEmail: null,
      error: null
    });
    clearStoredAuth();
    onDisconnect?.();
  };

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Google Drive Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {authState.error && (
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{authState.error}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearError}>
              ×
            </Button>
          </div>
        )}

        {authState.isAuthenticated ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <div className="font-medium text-green-900">Connected to Google Drive</div>
                  {authState.userEmail && (
                    <div className="text-sm text-green-700">{authState.userEmail}</div>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                Active
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Your property documents will be automatically organized in Google Drive
              </div>
              <Button variant="outline" size="sm" onClick={disconnect}>
                <LogOut className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-blue-900">Connect Google Drive</span>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                Connect your Google Drive account to automatically store and organize property documents in the cloud.
              </p>
              <ul className="text-xs text-blue-600 space-y-1">
                <li>• Automatic folder organization by property</li>
                <li>• Secure cloud storage and backup</li>
                <li>• Easy sharing with team members and investors</li>
                <li>• Access documents from anywhere</li>
              </ul>
            </div>

            <Button 
              onClick={initiateAuth} 
              disabled={isLoading || !GOOGLE_CLIENT_ID}
              className="w-full"
            >
              {isLoading ? (
                'Connecting...'
              ) : (
                <>
                  <Cloud className="h-4 w-4 mr-2" />
                  Connect Google Drive
                </>
              )}
            </Button>

            {!GOOGLE_CLIENT_ID && (
              <p className="text-xs text-red-600">
                Google Client ID not configured. Please check your environment variables.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}