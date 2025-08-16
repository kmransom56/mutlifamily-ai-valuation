import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, updateUser, updateUserPreferences, User } from '@/lib/auth';

// GET /api/user/profile - Get user profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ user: session.user });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, preferences, ...otherUpdates } = body;

    let updatedUser: User | null = session.user as User;

    // Update basic profile info
    if (name || Object.keys(otherUpdates).length > 0) {
      const result = await updateUser(session.user.id, {
        name,
        ...otherUpdates,
      });
      if (!result) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      updatedUser = result;
    }

    // Update preferences if provided
    if (preferences) {
      const result = await updateUserPreferences(session.user.id, preferences);
      if (!result) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      updatedUser = result;
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
