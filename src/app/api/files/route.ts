import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// Define output directory
const OUTPUT_DIR = path.join(process.cwd(), 'outputs');

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const exportId = searchParams.get('exportId');
    const pitchDeckId = searchParams.get('pitchDeckId');
    const fileName = searchParams.get('file');
    const type = searchParams.get('type') || 'download'; // download, preview, thumbnail
    
    if (!fileName) {
      return NextResponse.json(
        { success: false, message: 'File name is required' },
        { status: 400 }
      );
    }

    // Determine file path and verify access
    let filePath: string;
    let hasAccess = false;

    if (jobId) {
      // Job output files
      hasAccess = await verifyJobAccess(jobId, session.user.id);
      if (hasAccess) {
        const outputDir = path.join(OUTPUT_DIR, jobId);
        filePath = path.join(outputDir, fileName);
        hasAccess = filePath.startsWith(outputDir);
      }
    } else if (exportId) {
      // Export files
      const exportDir = path.join(process.cwd(), 'storage', 'exports', session.user.id);
      const metadataPath = path.join(exportDir, `${exportId}_metadata.json`);
      
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        if (metadata.userId === session.user.id) {
          filePath = metadata.path;
          hasAccess = filePath.startsWith(exportDir);
        }
      }
    } else if (pitchDeckId) {
      // Pitch deck files
      const pitchDeckDir = path.join(process.cwd(), 'outputs', 'pitch-decks', pitchDeckId);
      const metadataPath = path.join(pitchDeckDir, 'metadata.json');
      
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        if (metadata.userId === session.user.id) {
          filePath = path.join(pitchDeckDir, fileName);
          hasAccess = filePath.startsWith(pitchDeckDir);
        }
      }
    }

    if (!hasAccess || !filePath!) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, message: 'File not found' },
        { status: 404 }
      );
    }
    
    // Get file stats
    const stats = fs.statSync(filePath);
    const fileExt = path.extname(fileName).toLowerCase();
    const contentType = getContentType(fileExt);

    // Handle different request types
    switch (type) {
      case 'preview':
        return handlePreviewRequest(filePath, fileName, contentType, stats);
      case 'thumbnail':
        return handleThumbnailRequest(filePath, fileName, fileExt);
      case 'download':
      default:
        return handleDownloadRequest(filePath, fileName, contentType, stats);
    }
    
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

function handleDownloadRequest(
  filePath: string,
  fileName: string,
  contentType: string,
  stats: fs.Stats
): NextResponse {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error serving download:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}

function handlePreviewRequest(
  filePath: string,
  fileName: string,
  contentType: string,
  stats: fs.Stats
): NextResponse {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error serving preview:', error);
    return NextResponse.json({ error: 'Failed to serve preview' }, { status: 500 });
  }
}

function handleThumbnailRequest(
  filePath: string,
  fileName: string,
  fileExt: string
): NextResponse {
  try {
    // For images, serve the actual file (in production, generate thumbnails)
    if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExt)) {
      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': getContentType(fileExt),
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    // For other files, return a generic icon
    const iconData = generateFileIcon(fileExt);
    return new NextResponse(iconData, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400'
      }
    });

  } catch (error) {
    console.error('Error serving thumbnail:', error);
    return NextResponse.json({ error: 'Failed to serve thumbnail' }, { status: 500 });
  }
}

function generateFileIcon(fileExt: string): string {
  const colors: Record<string, string> = {
    '.pdf': '#FF0000',
    '.xlsx': '#00A651',
    '.xls': '#00A651',
    '.pptx': '#FF6B35',
    '.ppt': '#FF6B35',
    '.docx': '#2B579A',
    '.doc': '#2B579A',
    '.json': '#000000',
    '.csv': '#00A651',
    '.txt': '#666666'
  };

  const color = colors[fileExt] || '#999999';
  const label = fileExt.slice(1).toUpperCase() || 'FILE';

  return `
    <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill="${color}" rx="4"/>
      <text x="32" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="8" font-weight="bold">FILE</text>
      <text x="32" y="45" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">${label}</text>
    </svg>
  `;
}
