import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DocumentPreview } from '@/types/processing';
import fs from 'fs';
import path from 'path';
import * as pdfjs from 'pdfjs-dist';

let Tesseract: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Tesseract = require('tesseract.js');
} catch {
  Tesseract = null;
}

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
  const { fileId, jobId, filePath } = params;
  
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
  
  // Multi-page support for PDF: probe page count (no rendering)
  let pages: any[] = [];
  if (fileExt === '.pdf') {
    try {
      const data = new Uint8Array(fs.readFileSync(actualFilePath));
      const doc = await (pdfjs as any).getDocument({ data }).promise;
      const totalPages = doc.numPages || 1;
      let ocrExtractedText: string | undefined;
      pages = Array.from({ length: totalPages }).map((_, idx) => ({
        pageNumber: idx + 1,
        imageUrl: `/api/thumbnail?jobId=${encodeURIComponent(params.jobId || '')}&file=${encodeURIComponent(fileName)}&page=${idx + 1}`,
        thumbnailUrl: `/api/thumbnail?jobId=${encodeURIComponent(params.jobId || '')}&file=${encodeURIComponent(fileName)}&page=${idx + 1}`,
        textContent: `Page ${idx + 1}`,
        annotations: []
      }));

      // Simple heuristic: if the PDF has no text content on first page, attempt OCR on the thumbnail
      try {
        const page1 = await doc.getPage(1);
        const textContent = await page1.getTextContent();
        const textItems = (textContent.items || []).map((it: any) => it.str).join(' ').trim();
        if (!textItems && process.env.ENABLE_BASIC_OCR === '1' && Tesseract) {
          const thumbUrl = `/api/thumbnail?jobId=${encodeURIComponent(params.jobId || '')}&file=${encodeURIComponent(fileName)}&page=1`;
          // Fetch the thumbnail directly from disk (since we know the path)
          const thumbsDir = path.join(process.cwd(), 'outputs', params.jobId || '', 'thumbnails');
          const thumbPath = path.join(thumbsDir, `${fileName.replace(/\.pdf$/i, '')}-p1.png`);
          if (fs.existsSync(thumbPath)) {
            const { data: ocr } = await Tesseract.recognize(thumbPath, 'eng');
            if (ocr && ocr.text) ocrExtractedText = ocr.text;
          }
        }
      } catch {}

      if (ocrExtractedText) {
        // Attach to the first page's textContent for quick display
        if (pages[0]) pages[0].textContent = ocrExtractedText.slice(0, 2000);
      }
    } catch {
      pages = [{
        pageNumber: 1,
        imageUrl: `/api/thumbnail?jobId=${encodeURIComponent(params.jobId || '')}&file=${encodeURIComponent(fileName)}&page=1`,
        thumbnailUrl: `/api/thumbnail?jobId=${encodeURIComponent(params.jobId || '')}&file=${encodeURIComponent(fileName)}&page=1`,
        textContent: `File: ${fileName}`,
        annotations: []
      }];
    }
  } else {
    pages = [{
      pageNumber: 1,
      imageUrl: `/api/files?jobId=${encodeURIComponent(params.jobId || '')}&file=${encodeURIComponent(fileName)}&type=preview`,
      thumbnailUrl: `/api/files?jobId=${encodeURIComponent(params.jobId || '')}&file=${encodeURIComponent(fileName)}&type=preview`,
      textContent: `File: ${fileName}`,
      annotations: []
    }];
  }

  const preview: DocumentPreview = {
    id: fileId || `preview_${Date.now()}`,
    fileId: fileId || fileName,
    type: getDocumentType(fileExt),
    pages,
    metadata: {
      totalPages: pages.length,
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
      imageUrl: `/api/files?file=${encodeURIComponent(fileId)}&type=preview`,
      thumbnailUrl: `/api/files?file=${encodeURIComponent(fileId)}&type=preview`,
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
