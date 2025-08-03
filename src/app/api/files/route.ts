import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// Define output directory
const OUTPUT_DIR = path.join(process.cwd(), 'outputs');

export async function GET(request: NextRequest) {
  try {
    // Authenticate user (skip in development)
    if (process.env.NODE_ENV !== 'development') {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const exportId = searchParams.get('exportId');
    const pitchDeckId = searchParams.get('pitchDeckId');
    const fileName = searchParams.get('file');
    const type = searchParams.get('type') || 'download';
    
    if (!fileName) {
      return NextResponse.json(
        { success: false, message: 'File name is required' },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || session?.user?.email || 'dev-user';
    let filePath = '';
    let hasAccess = false;

    if (jobId) {
      // In development, allow access to any job
      if (process.env.NODE_ENV === 'development') {
        hasAccess = true;
      } else {
        hasAccess = await verifyJobAccess(jobId, userId);
      }
      
      if (hasAccess) {
        const outputDir = path.join(OUTPUT_DIR, jobId);
        filePath = path.join(outputDir, fileName);
        hasAccess = filePath.startsWith(outputDir);
      }
    } else if (exportId) {
      const exportDir = path.join(process.cwd(), 'storage', 'exports', userId);
      const metadataPath = path.join(exportDir, `${exportId}_metadata.json`);
      
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        if (metadata.userId === userId) {
          filePath = metadata.path;
          hasAccess = filePath.startsWith(exportDir);
        }
      }
    } else if (pitchDeckId) {
      const pitchDeckDir = path.join(process.cwd(), 'outputs', 'pitch-decks', pitchDeckId);
      const metadataPath = path.join(pitchDeckDir, 'metadata.json');
      
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        if (metadata.userId === userId) {
          filePath = path.join(pitchDeckDir, fileName);
          hasAccess = filePath.startsWith(pitchDeckDir);
        }
      }
    }

    if (!hasAccess || !filePath) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, message: 'File not found' },
        { status: 404 }
      );
    }
    
    const stats = fs.statSync(filePath);
    const fileExt = path.extname(fileName).toLowerCase();
    const contentType = getContentType(fileExt);

    const fileBuffer = fs.readFileSync(filePath);
    
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'private, max-age=3600'
    };

    if (type === 'preview') {
      headers['Content-Disposition'] = `inline; filename="${fileName}"`;
    } else {
      headers['Content-Disposition'] = `attachment; filename="${fileName}"`;
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to serve file', error: String(error) },
      { status: 500 }
    );
  }
}

async function verifyJobAccess(jobId: string, userId: string): Promise<boolean> {
  try {
    const jobDir = path.join(process.cwd(), 'uploads', jobId);
    const metadataPath = path.join(jobDir, 'job_metadata.json');

    if (!fs.existsSync(metadataPath)) {
      return false;
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    return metadata.userId === userId;
  } catch (error) {
    return false;
  }
}

function getContentType(fileExt: string): string {
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.json': 'application/json',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.html': 'text/html'
  };

  return mimeTypes[fileExt] || 'application/octet-stream';
}
