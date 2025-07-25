import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { propertyDatabase } from '@/lib/property-database';

// GET /api/user/portfolio - Get user's portfolio metrics and properties
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get portfolio metrics
    const metrics = await propertyDatabase.getPortfolioMetrics(userId);
    
    // Get recent properties
    const recentProperties = await propertyDatabase.searchProperties({
      userId,
      limit: 5,
      sortBy: 'dateCreated',
      sortOrder: 'desc',
    });

    return NextResponse.json({
      metrics,
      recentProperties: recentProperties.properties,
    });
  } catch (error) {
    console.error('Portfolio GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio data' },
      { status: 500 }
    );
  }
}