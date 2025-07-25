'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function GoogleAuthCallback() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    if (error) {
      // Send error to parent window
      window.opener?.postMessage({
        type: 'GOOGLE_AUTH_ERROR',
        error: error === 'access_denied' ? 'Access denied by user' : `Authentication error: ${error}`
      }, window.location.origin);
      window.close();
      return;
    }

    if (code) {
      // Exchange code for access token
      exchangeCodeForToken(code);
    } else {
      window.opener?.postMessage({
        type: 'GOOGLE_AUTH_ERROR',
        error: 'No authorization code received'
      }, window.location.origin);
      window.close();
    }
  }, [searchParams]);

  const exchangeCodeForToken = async (code: string) => {
    try {
      // In a production app, this should be done on the server side for security
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const clientSecret = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET; // Should be server-side only
      const redirectUri = `${window.location.origin}/auth/google/callback`;

      if (!clientId) {
        throw new Error('Google Client ID not configured');
      }

      // For production, create a server-side API route to handle token exchange
      const response = await fetch('/api/auth/google/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirectUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token exchange failed');
      }

      const tokenData = await response.json();
      
      // Send success message to parent window
      window.opener?.postMessage({
        type: 'GOOGLE_AUTH_SUCCESS',
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token,
      }, window.location.origin);

    } catch (error) {
      window.opener?.postMessage({
        type: 'GOOGLE_AUTH_ERROR',
        error: error instanceof Error ? error.message : 'Token exchange failed'
      }, window.location.origin);
    } finally {
      window.close();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
        <p className="text-sm text-gray-500 mt-2">This window will close automatically.</p>
      </div>
    </div>
  );
}