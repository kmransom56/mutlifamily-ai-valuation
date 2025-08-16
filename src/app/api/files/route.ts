import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Define output directory
const OUTPUT_DIR = path.join(process.cwd(), 'outputs');

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.xlsx', '.xls', '.pptx', '.ppt', '.docx', '.doc', '.json', '.csv', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.svg'
]);

function isProdLike() {
  return process.env.NODE_ENV === 'production' || process.env.__FORCE_PROD__ === '1';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user && isProdLike()) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const exportId = searchParams.get('exportId');
    const fileName = searchParams.get('file');
    const type = searchParams.get('type') || 'download';

    const userId = (session?.user as any)?.id || session?.user?.email || 'dev-user';

    let filePath = '';
    let hasAccess = false;

    if (exportId) {
      // Export download via metadata
      const exportDir = path.join(process.cwd(), 'storage', 'exports', userId);
      const metadataPath = path.join(exportDir, `${exportId}_metadata.json`);
      if (!metadataPath.startsWith(exportDir)) {
        return NextResponse.json({ success: false, message: 'Invalid export request' }, { status: 400 });
      }
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        if (metadata.userId === userId) {
          filePath = metadata.path;
          hasAccess = filePath.startsWith(exportDir);
        }
      }
    } else if (jobId && fileName) {
      // Job output download
      const ext = path.extname(fileName).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json({ success: false, message: 'File type not allowed' }, { status: 400 });
      }

      // Verify job access
      if (!isProdLike()) {
        hasAccess = true;
      } else {
        hasAccess = await verifyJobAccess(jobId, userId);
      }

      if (hasAccess) {
        const outputDir = path.join(OUTPUT_DIR, jobId);
        const safeName = fileName.replace(/[\/\\]/g, '');
        filePath = path.join(outputDir, safeName);
        hasAccess = filePath.startsWith(outputDir);
      }
    } else {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
    }

    if (!hasAccess || !filePath) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'File not found',
          requestedFile: path.basename(filePath),
          searchedPath: filePath,
          availableFiles: fs.existsSync(path.dirname(filePath)) 
            ? fs.readdirSync(path.dirname(filePath)).slice(0, 5)
            : []
        },
        { status: 404 }
      );
    }
    
    const stats = fs.statSync(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    const contentType = getContentType(fileExt);

    const fileBuffer = fs.readFileSync(filePath);
    
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'private, max-age=3600'
    };

    if (type === 'preview') {
      headers['Content-Disposition'] = `inline; filename="${path.basename(filePath)}"`;
    } else {
      headers['Content-Disposition'] = `attachment; filename="${path.basename(filePath)}"`;
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
