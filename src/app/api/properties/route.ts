import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { propertyDatabase } from '@/lib/property-database';
import { Property, PropertyFilter, PropertyType, PropertyStatus } from '@/types/property';
import { z } from 'zod';

function isProdLike() {
  return process.env.NODE_ENV === 'production' || process.env.__FORCE_PROD__ === '1';
}

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  location: z.string().optional(),
  minUnits: z.coerce.number().int().optional(),
  maxUnits: z.coerce.number().int().optional(),
  minCapRate: z.coerce.number().optional(),
  maxCapRate: z.coerce.number().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
});

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['multifamily', 'commercial', 'mixed-use', 'single-family', 'other']),
  location: z.string().min(1),
  units: z.coerce.number().int().min(1),
  financialData: z.any().optional(),
  notes: z.string().optional()
});

const bulkSchema = z.object({
  action: z.literal('bulkUpdateStatus'),
  propertyIds: z.array(z.string().min(1)).min(1),
  status: z.enum(['Analyzed', 'Pending', 'Processing', 'Acquired', 'Rejected', 'Under Review'])
});

// GET /api/properties - List properties with optional filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user && isProdLike()) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Create a mock user for development if no session
    const user = session?.user || { 
      id: 'dev-user', 
      email: 'dev@example.com', 
      name: 'Development User' 
    };

    const { searchParams } = new URL(request.url);
    const parsed = listSchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid query parameters' }, { status: 400 });
    }
    const q = parsed.data;

    const limit = q.limit ?? 50;
    const offset = q.offset ?? 0;
    const sortBy = (q.sortBy as keyof Property) || 'dateCreated';
    const sortOrder = (q.sortOrder as 'asc' | 'desc') || 'desc';

    const filter: PropertyFilter = {};
    if (q.search) filter.search = q.search;
    if (q.type) filter.type = q.type as Property['type'];
    if (q.status) filter.status = q.status as Property['status'];
    if (q.location) filter.location = q.location;
    if (q.minUnits !== undefined) filter.minUnits = q.minUnits;
    if (q.maxUnits !== undefined) filter.maxUnits = q.maxUnits;
    if (q.minCapRate !== undefined) filter.minCapRate = q.minCapRate;
    if (q.maxCapRate !== undefined) filter.maxCapRate = q.maxCapRate;
    if (q.minPrice !== undefined) filter.minPrice = q.minPrice;
    if (q.maxPrice !== undefined) filter.maxPrice = q.maxPrice;
    if (q.dateFrom) filter.dateFrom = q.dateFrom;
    if (q.dateTo) filter.dateTo = q.dateTo;

    const result = await propertyDatabase.searchProperties({
      userId: (user as any).id,
      limit,
      offset,
      sortBy,
      sortOrder,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Properties GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}

// POST /api/properties - Create a new property
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user && isProdLike()) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Create a mock user for development if no session
    const user = session?.user || { 
      id: 'dev-user', 
      email: 'dev@example.com', 
      name: 'Development User' 
    };

    const json = await request.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }
    const { name, type, location, units, financialData, notes } = parsed.data;

    const property = await propertyDatabase.saveProperty({
      name,
      type: type as PropertyType,
      location,
      units,
      userId: (user as any).id,
      financialData,
      notes,
    });

    return NextResponse.json({ success: true, property }, { status: 201 });
  } catch (error) {
    console.error('Property creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create property' },
      { status: 500 }
    );
  }
}

// PUT /api/properties - Bulk update properties
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user && isProdLike()) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const parsed = bulkSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid bulk operation' }, { status: 400 });
    }
    const { action, propertyIds, status } = parsed.data;

    if (action === 'bulkUpdateStatus' && propertyIds && status) {
      const updatedCount = await propertyDatabase.bulkUpdateStatus(propertyIds, status as PropertyStatus);
      return NextResponse.json({ success: true, updatedCount });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid bulk operation' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Properties bulk update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update properties' },
      { status: 500 }
    );
  }
}