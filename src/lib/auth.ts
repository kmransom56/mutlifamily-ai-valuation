// Authentication configuration and utilities
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { JWT } from 'next-auth/jwt';

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: 'admin' | 'user' | 'investor';
  createdAt: string;
  updatedAt: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    browser: boolean;
    propertyAlerts: boolean;
    investorUpdates: boolean;
  };
  dashboard: {
    defaultView: 'grid' | 'list';
    sortBy: string;
    metricsToShow: string[];
  };
  privacy: {
    shareAnalytics: boolean;
    allowMarketing: boolean;
  };
}

// Mock user database - in production, this would be a real database
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@multifamily.ai',
    name: 'Admin User',
    role: 'admin',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-20T00:00:00Z',
    preferences: {
      notifications: {
        email: true,
        browser: true,
        propertyAlerts: true,
        investorUpdates: true,
      },
      dashboard: {
        defaultView: 'grid',
        sortBy: 'dateCreated',
        metricsToShow: ['capRate', 'irr', 'viabilityScore'],
      },
      privacy: {
        shareAnalytics: false,
        allowMarketing: false,
      },
    },
  },
];

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
        },
      },
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // In production, verify password hash
        if (credentials.email === 'admin@multifamily.ai' && credentials.password === 'admin123') {
          return {
            id: '1',
            email: 'admin@multifamily.ai',
            name: 'Admin User',
            role: 'admin',
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        // Store additional user data in JWT
        const dbUser = await getUserByEmail(user.email!);
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.preferences = dbUser.preferences;
        } else {
          // Create new user
          const newUser = await createUser({
            email: user.email!,
            name: user.name || 'Unknown User',
            image: user.image || undefined,
            role: 'user',
          });
          token.id = newUser.id;
          token.role = newUser.role;
          token.preferences = newUser.preferences;
        }

        // Store Google access token if available
        if (account.provider === 'google' && account.access_token) {
          token.googleAccessToken = account.access_token;
          token.googleRefreshToken = account.refresh_token;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.preferences = token.preferences as UserPreferences;
        session.user.googleAccessToken = token.googleAccessToken as string;
      }

      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// User management functions (mock database operations)
export async function getUserByEmail(email: string): Promise<User | null> {
  return mockUsers.find(user => user.email === email) || null;
}

export async function getUserById(id: string): Promise<User | null> {
  return mockUsers.find(user => user.id === id) || null;
}

export async function createUser(userData: {
  email: string;
  name: string;
  image?: string;
  role: User['role'];
}): Promise<User> {
  const newUser: User = {
    id: (mockUsers.length + 1).toString(),
    email: userData.email,
    name: userData.name,
    image: userData.image,
    role: userData.role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: {
      notifications: {
        email: true,
        browser: true,
        propertyAlerts: true,
        investorUpdates: false,
      },
      dashboard: {
        defaultView: 'grid',
        sortBy: 'dateCreated',
        metricsToShow: ['capRate', 'irr', 'viabilityScore'],
      },
      privacy: {
        shareAnalytics: true,
        allowMarketing: true,
      },
    },
  };

  mockUsers.push(newUser);
  return newUser;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const userIndex = mockUsers.findIndex(user => user.id === id);
  if (userIndex === -1) return null;

  mockUsers[userIndex] = {
    ...mockUsers[userIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return mockUsers[userIndex];
}

export async function updateUserPreferences(id: string, preferences: Partial<UserPreferences>): Promise<User | null> {
  const userIndex = mockUsers.findIndex(user => user.id === id);
  if (userIndex === -1) return null;

  mockUsers[userIndex].preferences = {
    ...mockUsers[userIndex].preferences!,
    ...preferences,
  };
  mockUsers[userIndex].updatedAt = new Date().toISOString();

  return mockUsers[userIndex];
}

// Helper functions for authorization
export function hasRole(user: User | null, role: User['role']): boolean {
  return user?.role === role;
}

export function hasAnyRole(user: User | null, roles: User['role'][]): boolean {
  return user ? roles.includes(user.role) : false;
}

export function canAccessProperty(user: User | null, propertyUserId: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.id === propertyUserId;
}

// Session helper
export function isAuthenticated(user: any): user is User {
  return user && user.id && user.email;
}