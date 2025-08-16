import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { propertyDatabase } from '@/lib/property-database';
import { Property, PropertyFilter } from '@/types/property';

// GET /api/properties - List properties with optional filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a mock user for development if no session
    const user = session?.user || { 
      id: 'dev-user', 
      email: 'dev@example.com', 
      name: 'Development User' 
    };

    const { searchParams } = new URL(request.url);
    
    // Parse pagination parameters
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') as keyof Property || 'dateCreated';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Parse filter parameters
    const filter: PropertyFilter = {};
    
    if (searchParams.get('search')) filter.search = searchParams.get('search')!;
    if (searchParams.get('type')) filter.type = searchParams.get('type') as Property['type'];
    if (searchParams.get('status')) filter.status = searchParams.get('status') as Property['status'];
    if (searchParams.get('location')) filter.location = searchParams.get('location')!;
    if (searchParams.get('minUnits')) filter.minUnits = parseInt(searchParams.get('minUnits')!);
    if (searchParams.get('maxUnits')) filter.maxUnits = parseInt(searchParams.get('maxUnits')!);
    if (searchParams.get('minCapRate')) filter.minCapRate = parseFloat(searchParams.get('minCapRate')!);
    if (searchParams.get('maxCapRate')) filter.maxCapRate = parseFloat(searchParams.get('maxCapRate')!);
    if (searchParams.get('minPrice')) filter.minPrice = parseInt(searchParams.get('minPrice')!);
    if (searchParams.get('maxPrice')) filter.maxPrice = parseInt(searchParams.get('maxPrice')!);
    if (searchParams.get('dateFrom')) filter.dateFrom = searchParams.get('dateFrom')!;
    if (searchParams.get('dateTo')) filter.dateTo = searchParams.get('dateTo')!;

    const result = await propertyDatabase.searchProperties({
      userId: (user as any).id,
      limit,
      offset,
      sortBy,
      sortOrder,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Properties GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}

// POST /api/properties - Create a new property
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a mock user for development if no session
    const user = session?.user || { 
      id: 'dev-user', 
      email: 'dev@example.com', 
      name: 'Development User' 
    };

    const body = await request.json();
    const { name, type, location, units, financialData, notes } = body;

    // Validate required fields
    if (!name || !type || !location || !units) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, location, units' },
        { status: 400 }
      );
    }

    const property = await propertyDatabase.saveProperty({
      name,
      type,
      location,
      units: parseInt(units),
      userId: (user as any).id,
      financialData,
      notes,
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    console.error('Property creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 }
    );
  }
}

// PUT /api/properties - Bulk update properties
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, propertyIds, status } = body;

    if (action === 'bulkUpdateStatus' && propertyIds && status) {
      const updatedCount = await propertyDatabase.bulkUpdateStatus(propertyIds, status);
      return NextResponse.json({ updatedCount });
    }

    return NextResponse.json(
      { error: 'Invalid bulk operation' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Properties bulk update error:', error);
    return NextResponse.json(
      { error: 'Failed to update properties' },
      { status: 500 }
    );
  }
}