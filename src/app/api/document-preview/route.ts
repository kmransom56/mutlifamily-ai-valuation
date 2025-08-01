import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DocumentPreview } from '@/types/processing';
import fs from 'fs';
import path from 'path';

// Document preview generation - simplified version
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fileId, jobId, filePath } = body;

    if (!fileId && !filePath) {
      return NextResponse.json(
        { error: 'File ID or file path is required' },
        { status: 400 }
      );
    }

    // Generate basic document preview
    const preview = await generateBasicDocumentPreview({
      fileId,
      jobId,
      filePath,
      userId: (session.user as any).id || session.user.email || 'anonymous'
    });

    return NextResponse.json({
      success: true,
      preview
    });

  } catch (error) {
    console.error('Document preview error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate document preview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get existing document preview
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Return basic preview info
    const userId = (session.user as any).id || session.user.email || 'anonymous';
    const preview = await getBasicDocumentPreview(fileId, userId);
    
    if (!preview) {
      return NextResponse.json(
        { error: 'Preview not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(preview);

  } catch (error) {
    console.error('Error loading document preview:', error);
    return NextResponse.json(
      { error: 'Failed to load document preview' },
      { status: 500 }
    );
  }
}

async function generateBasicDocumentPreview(params: {
  fileId?: string;
  jobId?: string;
  filePath?: string;
  userId: string;
}): Promise<DocumentPreview> {
  const { fileId, jobId, filePath, userId } = params;
  
  let actualFilePath = filePath;
  
  // If jobId and fileId provided, construct file path
  if (jobId && fileId && !filePath) {
    const jobDir = path.join(process.cwd(), 'uploads', jobId);
    actualFilePath = path.join(jobDir, fileId);
  }

  if (!actualFilePath || !fs.existsSync(actualFilePath)) {
    throw new Error('File not found');
  }

  const fileName = path.basename(actualFilePath);
  const fileExt = path.extname(fileName).toLowerCase();
  
  // Basic document preview
  const preview: DocumentPreview = {
    id: fileId || `preview_${Date.now()}`,
    fileId: fileId || fileName,
    type: getDocumentType(fileExt),
    pages: [{
      pageNumber: 1,
      imageUrl: `/api/files?path=${encodeURIComponent(actualFilePath)}`,
      thumbnailUrl: `/api/files/thumbnail?path=${encodeURIComponent(actualFilePath)}`,
      textContent: `File: ${fileName}`,
      annotations: []
    }],
    metadata: {
      totalPages: 1,
      hasText: true,
      quality: 'medium',
      extractedData: {
        fileName,
        fileSize: fs.statSync(actualFilePath).size,
        fileType: fileExt
      }
    }
  };

  return preview;
}

function getDocumentType(extension: string): 'image' | 'pdf' | 'text' {
  switch (extension) {
    case '.pdf':
      return 'pdf';
    case '.jpg':
    case '.jpeg':
    case '.png':
    case '.gif':
    case '.bmp':
      return 'image';
    default:
      return 'text';
  }
}

async function getBasicDocumentPreview(fileId: string, userId: string): Promise<DocumentPreview | null> {
  // For now, return a basic preview structure
  // In a real implementation, this would load from storage
  return {
    id: fileId,
    fileId,
    type: 'text',
    pages: [{
      pageNumber: 1,
      imageUrl: `/api/files?fileId=${fileId}`,
      thumbnailUrl: `/api/files/thumbnail?fileId=${fileId}`,
      textContent: 'Document preview available',
      annotations: []
    }],
    metadata: {
      totalPages: 1,
      hasText: true,
      quality: 'medium',
      extractedData: {
        fileId,
        previewAvailable: true
      }
    }
  };
}
