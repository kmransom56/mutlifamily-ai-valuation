import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessProperty } from '@/lib/auth';
import { propertyDatabase } from '@/lib/property-database';

// GET /api/properties/[id] - Get a specific property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

<<<<<<< HEAD
    const { id } = await params;
    const property = await propertyDatabase.getProperty(id, (session.user as any).id);
=======
    // Create a mock user for development if no session
    const user = session?.user || { 
      id: 'dev-user', 
      email: 'dev@example.com', 
      name: 'Development User' 
    };

    const { id } = await params;
    const property = await propertyDatabase.getProperty(id, (user as any).id);
>>>>>>> 7729ef7fd006f35818317aff5db096f8429d4db3
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // In production, check if user can access this property
    // if (!canAccessProperty(session.user, property.userId)) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    return NextResponse.json({ property });
  } catch (error) {
    console.error('Property GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch property' },
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
    if (!session?.user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

<<<<<<< HEAD
=======
    // Create a mock user for development if no session
    const user = session?.user || { 
      id: 'dev-user', 
      email: 'dev@example.com', 
      name: 'Development User' 
    };

>>>>>>> 7729ef7fd006f35818317aff5db096f8429d4db3
    const { id } = await params;
    const body = await request.json();
    
    const updatedProperty = await propertyDatabase.updateProperty({
      id,
      ...body,
    });

    if (!updatedProperty) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ property: updatedProperty });
  } catch (error) {
    console.error('Property update error:', error);
    return NextResponse.json(
      { error: 'Failed to update property' },
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
    if (!session?.user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

<<<<<<< HEAD
    const { id } = await params;
    const success = await propertyDatabase.deleteProperty(id, (session.user as any).id);
=======
    // Create a mock user for development if no session
    const user = session?.user || { 
      id: 'dev-user', 
      email: 'dev@example.com', 
      name: 'Development User' 
    };

    const { id } = await params;
    const success = await propertyDatabase.deleteProperty(id, (user as any).id);
>>>>>>> 7729ef7fd006f35818317aff5db096f8429d4db3
    if (!success) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Property deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete property' },
      { status: 500 }
    );
  }
}
