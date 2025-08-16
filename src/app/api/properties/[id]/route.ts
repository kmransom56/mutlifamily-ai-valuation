import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { propertyDatabase } from '@/lib/property-database';
import { z } from 'zod';

function isProdLike() {
  return process.env.NODE_ENV === 'production' || process.env.__FORCE_PROD__ === '1';
}

const updateSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['multifamily', 'commercial', 'mixed-use', 'single-family', 'other']).optional(),
  location: z.string().optional(),
  units: z.coerce.number().int().min(1).optional(),
  status: z.enum(['Analyzed', 'Pending', 'Processing', 'Acquired', 'Rejected', 'Under Review']).optional(),
  notes: z.string().optional()
}).passthrough();

// GET /api/properties/[id] - Get a specific property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user && isProdLike()) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = session?.user || { id: 'dev-user' } as any;

    const { id } = await params;
    const property = await propertyDatabase.getProperty(id, (user as any).id);
    if (!property) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, property });
  } catch (error) {
    console.error('Property GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch property' },
      { status: 500 }
    );
  }
}

// PUT /api/properties/[id] - Update a property
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user && isProdLike()) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const json = await request.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    const updatedProperty = await propertyDatabase.updateProperty({
      id,
      ...parsed.data,
    } as any);

    if (!updatedProperty) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, property: updatedProperty });
  } catch (error) {
    console.error('Property update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update property' },
      { status: 500 }
    );
  }
}

// DELETE /api/properties/[id] - Delete a property
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user && isProdLike()) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = session?.user || { id: 'dev-user' } as any;

    const { id } = await params;
    const success = await propertyDatabase.deleteProperty(id, (user as any).id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Property deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete property' },
      { status: 500 }
    );
  }
}
