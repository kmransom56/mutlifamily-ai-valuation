'use client';

import React, { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const error = searchParams.get('error');

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError('');

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setFormError('Invalid email or password');
      } else if (result?.ok) {
        // Get updated session and redirect
        const session = await getSession();
        if (session) {
          router.push(callbackUrl);
        }
      }
    } catch (error) {
      setFormError('An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl });
    } catch (error) {
      setFormError('Google sign in failed');
      setIsLoading(false);
    }
  };

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Invalid email or password';
      case 'OAuthSignin':
      case 'OAuthCallback':
      case 'OAuthCreateAccount':
        return 'Error with OAuth provider';
      case 'EmailCreateAccount':
        return 'Error creating account';
      case 'Callback':
        return 'Error in callback';
      case 'OAuthAccountNotLinked':
        return 'Email already associated with another account';
      case 'SessionRequired':
        return 'Please sign in to access this page';
      default:
        return 'An error occurred during authentication';
    }
  };

  return (
    <div className=\"min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8\">
      <div className=\"max-w-md w-full space-y-8\">
        {/* Header */}
        <div className=\"text-center\">
          <h1 className=\"text-3xl font-bold text-gray-900\">Sign In</h1>
          <p className=\"mt-2 text-sm text-gray-600\">
            Access your multifamily property portfolio
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className=\"text-center\">Welcome Back</CardTitle>
          </CardHeader>
          <CardContent className=\"space-y-6\">
            {/* Error Messages */}
            {(error || formError) && (
              <div className=\"bg-red-50 border border-red-200 rounded-md p-4\">
                <div className=\"flex items-center\">
                  <AlertCircle className=\"h-4 w-4 text-red-400 mr-2\" />
                  <span className=\"text-sm text-red-700\">
                    {formError || getErrorMessage(error!)}
                  </span>
                </div>
              </div>
            )}

            {/* Google Sign In */}
            <Button
              type=\"button\"
              variant=\"outline\"
              className=\"w-full\"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className=\"w-5 h-5 mr-2\" viewBox=\"0 0 24 24\">
                <path
                  fill=\"currentColor\"
                  d=\"M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z\"
                />
                <path
                  fill=\"currentColor\"
                  d=\"M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z\"
                />
                <path
                  fill=\"currentColor\"
                  d=\"M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z\"
                />
                <path
                  fill=\"currentColor\"
                  d=\"M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z\"
                />
              </svg>
              Continue with Google
            </Button>

            <div className=\"relative\">
              <div className=\"absolute inset-0 flex items-center\">
                <div className=\"w-full border-t border-gray-300\" />
              </div>
              <div className=\"relative flex justify-center text-sm\">
                <span className=\"px-2 bg-white text-gray-500\">Or continue with email</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className=\"space-y-4\">
              <div>
                <Label htmlFor=\"email\">Email Address</Label>
                <div className=\"relative mt-1\">
                  <Mail className=\"absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400\" />
                  <Input
                    id=\"email\"
                    type=\"email\"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder=\"admin@multifamily.ai\"
                    className=\"pl-10\"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor=\"password\">Password</Label>
                <div className=\"relative mt-1\">
                  <Lock className=\"absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400\" />
                  <Input
                    id=\"password\"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder=\"admin123\"
                    className=\"pl-10 pr-10\"
                    required
                  />
                  <button
                    type=\"button\"
                    onClick={() => setShowPassword(!showPassword)}
                    className=\"absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600\"
                  >
                    {showPassword ? <EyeOff className=\"h-4 w-4\" /> : <Eye className=\"h-4 w-4\" />}
                  </button>
                </div>
              </div>

              <Button type=\"submit\" className=\"w-full\" disabled={isLoading}>
                {isLoading ? (
                  'Signing in...'
                ) : (
                  <>
                    <LogIn className=\"h-4 w-4 mr-2\" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className=\"bg-blue-50 border border-blue-200 rounded-md p-4\">
              <h4 className=\"text-sm font-medium text-blue-900 mb-2\">Demo Credentials</h4>
              <div className=\"text-sm text-blue-700 space-y-1\">
                <p><strong>Email:</strong> admin@multifamily.ai</p>
                <p><strong>Password:</strong> admin123</p>
              </div>
            </div>

            {/* Links */}
            <div className=\"text-center space-y-2\">
              <Link
                href=\"/auth/forgot-password\"
                className=\"text-sm text-primary hover:underline\"
              >
                Forgot your password?
              </Link>
              <div className=\"text-sm text-gray-600\">
                Don't have an account?{' '}
                <Link href=\"/auth/signup\" className=\"text-primary hover:underline\">
                  Sign up
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className=\"text-center text-xs text-gray-500\">
          By signing in, you agree to our{' '}
          <Link href=\"/terms\" className=\"hover:underline\">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href=\"/privacy\" className=\"hover:underline\">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}