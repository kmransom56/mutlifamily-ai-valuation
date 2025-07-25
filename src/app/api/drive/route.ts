import { NextRequest, NextResponse } from 'next/server';
import { GoogleDriveService } from '@/lib/google-drive';

// Handle POST requests for file uploads
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const propertyId = formData.get('propertyId') as string;
    const propertyName = formData.get('propertyName') as string;
    const accessToken = formData.get('accessToken') as string;
    const description = formData.get('description') as string;

    if (!file || !propertyId || !propertyName || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields: file, propertyId, propertyName, accessToken' },
        { status: 400 }
      );
    }

    const driveService = new GoogleDriveService({ accessToken });
    
    const uploadedFile = await driveService.uploadFile(file, propertyId, propertyName, {
      description: description || undefined,
    });

    return NextResponse.json({
      success: true,
      file: uploadedFile,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for listing files
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const propertyName = searchParams.get('propertyName');
    const accessToken = searchParams.get('accessToken');
    const fileId = searchParams.get('fileId');
    const action = searchParams.get('action');

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    const driveService = new GoogleDriveService({ accessToken });

    // Handle file download
    if (action === 'download' && fileId) {
      const fileBlob = await driveService.downloadFile(fileId);
      const fileMetadata = await driveService.getFileMetadata(fileId);
      
      return new NextResponse(fileBlob, {
        headers: {
          'Content-Type': fileMetadata.mimeType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileMetadata.name}"`,
        },
      });
    }

    // Handle file metadata
    if (action === 'metadata' && fileId) {
      const metadata = await driveService.getFileMetadata(fileId);
      return NextResponse.json({ metadata });
    }

    // Handle file listing
    if (propertyId && propertyName) {
      const files = await driveService.listPropertyFiles(propertyId, propertyName);
      return NextResponse.json({ files });
    }

    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Drive API error:', error);
    return NextResponse.json(
      { 
        error: 'Request failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle DELETE requests for file deletion
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const accessToken = searchParams.get('accessToken');

    if (!fileId || !accessToken) {
      return NextResponse.json(
        { error: 'File ID and access token are required' },
        { status: 400 }
      );
    }

    const driveService = new GoogleDriveService({ accessToken });
    await driveService.deleteFile(fileId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { 
        error: 'Delete failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle PUT requests for file sharing
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, email, role, accessToken } = body;

    if (!fileId || !email || !accessToken) {
      return NextResponse.json(
        { error: 'File ID, email, and access token are required' },
        { status: 400 }
      );
    }

    const driveService = new GoogleDriveService({ accessToken });
    await driveService.shareFile(fileId, email, role || 'reader');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Share error:', error);
    return NextResponse.json(
      { 
        error: 'Share failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}