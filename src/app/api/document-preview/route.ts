import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DocumentPreview, DocumentPage, DocumentAnnotation } from '@/types/processing';
import fs from 'fs';
import path from 'path';

// Document preview generation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fileId, jobId, filePath, options = {} } = body;

    if (!fileId && !filePath) {
      return NextResponse.json(
        { error: 'File ID or file path is required' },
        { status: 400 }
      );
    }

    // Generate document preview
    const preview = await generateDocumentPreview({
      fileId,
      jobId,
      filePath,
      userId: session.user.id,
      options
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
    const previewId = searchParams.get('id');
    const fileId = searchParams.get('fileId');

    if (!previewId && !fileId) {
      return NextResponse.json(
        { error: 'Preview ID or File ID is required' },
        { status: 400 }
      );
    }

    // Load preview from storage
    const preview = await loadDocumentPreview(previewId || fileId!, session.user.id);
    
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

async function generateDocumentPreview(params: {
  fileId?: string;
  jobId?: string;
  filePath?: string;
  userId: string;
  options: any;
}): Promise<DocumentPreview> {
  const { fileId, jobId, filePath, userId, options } = params;
  
  let actualFilePath = filePath;
  
  // If jobId and fileId provided, construct file path
  if (jobId && fileId && !filePath) {
    const jobDir = path.join(process.cwd(), 'uploads', jobId);
    // This would typically involve looking up the file in job metadata
    actualFilePath = path.join(jobDir, fileId);
  }

  if (!actualFilePath || !fs.existsSync(actualFilePath)) {
    throw new Error('File not found');
  }

  const fileStats = fs.statSync(actualFilePath);
  const fileName = path.basename(actualFilePath);
  const fileExt = path.extname(fileName).toLowerCase();
  
  // Determine document type and generate preview
  let previewType: 'image' | 'pdf' | 'text' = 'text';
  let pages: DocumentPage[] = [];
  let extractedData: any = {};

  switch (fileExt) {
    case '.pdf':
      previewType = 'pdf';
      pages = await generatePDFPreview(actualFilePath, options);
      extractedData = await extractPDFData(actualFilePath);
      break;
    case '.xlsx':
    case '.xls':
      pages = await generateExcelPreview(actualFilePath, options);
      extractedData = await extractExcelData(actualFilePath);
      break;
    case '.docx':
    case '.doc':
      pages = await generateWordPreview(actualFilePath, options);
      extractedData = await extractWordData(actualFilePath);
      break;
    case '.jpg':
    case '.jpeg':
    case '.png':
    case '.gif':
      previewType = 'image';
      pages = await generateImagePreview(actualFilePath, options);
      break;
    case '.txt':
    case '.csv':
      pages = await generateTextPreview(actualFilePath, options);
      extractedData = await extractTextData(actualFilePath);
      break;
    default:
      pages = await generateGenericPreview(actualFilePath, options);
  }

  const preview: DocumentPreview = {
    id: fileId || `preview_${Date.now()}`,
    fileId: fileId || fileName,
    type: previewType,
    pages,
    metadata: {
      totalPages: pages.length,
      hasText: pages.some(p => p.textContent && p.textContent.length > 0),
      quality: determineQuality(pages, fileStats.size),
      extractedData
    }
  };

  // Save preview for future requests
  await saveDocumentPreview(preview, userId);

  return preview;
}

async function generatePDFPreview(filePath: string, options: any): Promise<DocumentPage[]> {
  // In a real implementation, you would use a library like pdf-poppler or pdf2pic
  // For now, simulate PDF page generation
  const pages: DocumentPage[] = [];
  const pageCount = Math.floor(Math.random() * 10) + 1;

  for (let i = 1; i <= pageCount; i++) {
    pages.push({
      pageNumber: i,
      imageUrl: `/api/document-preview/page?file=${encodeURIComponent(filePath)}&page=${i}`,
      thumbnailUrl: `/api/document-preview/thumbnail?file=${encodeURIComponent(filePath)}&page=${i}`,
      textContent: await extractPageText(filePath, i),
      annotations: []
    });
  }

  return pages;
}

async function generateExcelPreview(filePath: string, options: any): Promise<DocumentPage[]> {
  // Simulate Excel sheet preview
  const pages: DocumentPage[] = [];
  const sheetCount = Math.floor(Math.random() * 3) + 1;

  for (let i = 1; i <= sheetCount; i++) {
    pages.push({
      pageNumber: i,
      imageUrl: `/api/document-preview/sheet?file=${encodeURIComponent(filePath)}&sheet=${i}`,
      thumbnailUrl: `/api/document-preview/sheet-thumb?file=${encodeURIComponent(filePath)}&sheet=${i}`,
      textContent: `Sheet ${i} content preview...`,
      annotations: await generateDataAnnotations(filePath, i)
    });
  }

  return pages;
}

async function generateWordPreview(filePath: string, options: any): Promise<DocumentPage[]> {
  // Simulate Word document preview
  const pages: DocumentPage[] = [];
  const pageCount = Math.floor(Math.random() * 5) + 1;

  for (let i = 1; i <= pageCount; i++) {
    pages.push({
      pageNumber: i,
      imageUrl: `/api/document-preview/doc-page?file=${encodeURIComponent(filePath)}&page=${i}`,
      thumbnailUrl: `/api/document-preview/doc-thumb?file=${encodeURIComponent(filePath)}&page=${i}`,
      textContent: await extractDocPageText(filePath, i),
      annotations: []
    });
  }

  return pages;
}

async function generateImagePreview(filePath: string, options: any): Promise<DocumentPage[]> {
  return [{
    pageNumber: 1,
    imageUrl: `/api/files/image?path=${encodeURIComponent(filePath)}`,
    thumbnailUrl: `/api/files/thumbnail?path=${encodeURIComponent(filePath)}`,
    textContent: undefined,
    annotations: []
  }];
}

async function generateTextPreview(filePath: string, options: any): Promise<DocumentPage[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const linesPerPage = options.linesPerPage || 50;
  const pages: DocumentPage[] = [];

  for (let i = 0; i < lines.length; i += linesPerPage) {
    const pageLines = lines.slice(i, i + linesPerPage);
    const pageNumber = Math.floor(i / linesPerPage) + 1;
    
    pages.push({
      pageNumber,
      imageUrl: `/api/document-preview/text-page?file=${encodeURIComponent(filePath)}&page=${pageNumber}`,
      thumbnailUrl: `/api/document-preview/text-thumb?file=${encodeURIComponent(filePath)}&page=${pageNumber}`,
      textContent: pageLines.join('\n'),
      annotations: await generateTextAnnotations(pageLines.join('\n'))
    });
  }

  return pages;
}

async function generateGenericPreview(filePath: string, options: any): Promise<DocumentPage[]> {
  return [{
    pageNumber: 1,
    imageUrl: '/images/file-icons/generic.png',
    thumbnailUrl: '/images/file-icons/generic-thumb.png',
    textContent: 'Preview not available for this file type',
    annotations: []
  }];
}

// Text extraction functions
async function extractPageText(filePath: string, pageNumber: number): Promise<string> {
  // Simulate PDF text extraction
  const sampleTexts = [
    'Property Financial Summary\nGross Income: $1,200,000\nNet Operating Income: $800,000',
    'Unit Mix Analysis\n1BR: 40 units\n2BR: 35 units\n3BR: 15 units',
    'Market Comparables\nAverage Cap Rate: 6.2%\nPrice Per Unit: $120,000',
    'Investment Returns\nCash-on-Cash: 8.5%\nIRR: 12.3%'
  ];
  
  return sampleTexts[pageNumber % sampleTexts.length] || 'Text content extracted from page ' + pageNumber;
}

async function extractDocPageText(filePath: string, pageNumber: number): Promise<string> {
  // Simulate Word document text extraction
  return `Document page ${pageNumber} content would be extracted here using libraries like mammoth or docx-parser.`;
}

// Data extraction functions
async function extractPDFData(filePath: string): Promise<any> {
  return {
    documentType: 'PDF',
    pageCount: Math.floor(Math.random() * 10) + 1,
    hasFinancialTables: Math.random() > 0.5,
    keyMetrics: {
      grossIncome: Math.floor(Math.random() * 1000000) + 500000,
      noi: Math.floor(Math.random() * 500000) + 300000,
      capRate: (Math.random() * 5 + 4).toFixed(1)
    }
  };
}

async function extractExcelData(filePath: string): Promise<any> {
  return {
    documentType: 'Excel',
    sheetCount: Math.floor(Math.random() * 3) + 1,
    hasFormulas: Math.random() > 0.3,
    dataRows: Math.floor(Math.random() * 1000) + 50,
    identifiedTables: ['Rent Roll', 'Operating Expenses', 'Unit Mix']
  };
}

async function extractWordData(filePath: string): Promise<any> {
  return {
    documentType: 'Word',
    wordCount: Math.floor(Math.random() * 5000) + 1000,
    hasImages: Math.random() > 0.6,
    hasTables: Math.random() > 0.4,
    sections: ['Executive Summary', 'Property Overview', 'Financial Analysis']
  };
}

async function extractTextData(filePath: string): Promise<any> {
  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    documentType: 'Text',
    lineCount: content.split('\n').length,
    wordCount: content.split(/\s+/).length,
    hasStructuredData: content.includes(',') || content.includes('\t')
  };
}

// Annotation generation
async function generateDataAnnotations(filePath: string, sheetNumber: number): Promise<DocumentAnnotation[]> {
  const annotations: DocumentAnnotation[] = [];
  
  // Simulate finding data patterns in Excel
  if (Math.random() > 0.5) {
    annotations.push({
      id: `annotation_${Date.now()}_1`,
      type: 'extraction',
      coordinates: { x: 10, y: 50, width: 200, height: 25 },
      content: 'Financial data detected: Revenue figures',
      confidence: 0.85
    });
  }
  
  if (Math.random() > 0.7) {
    annotations.push({
      id: `annotation_${Date.now()}_2`,
      type: 'highlight',
      coordinates: { x: 10, y: 100, width: 150, height: 20 },
      content: 'Key metric: Cap Rate',
      confidence: 0.92
    });
  }
  
  return annotations;
}

async function generateTextAnnotations(content: string): Promise<DocumentAnnotation[]> {
  const annotations: DocumentAnnotation[] = [];
  
  // Look for financial patterns
  const dollarMatches = content.match(/\$[\d,]+/g);
  if (dollarMatches) {
    dollarMatches.forEach((match, index) => {
      annotations.push({
        id: `dollar_${index}`,
        type: 'extraction',
        coordinates: { x: 0, y: index * 20, width: 100, height: 15 },
        content: `Financial value: ${match}`,
        confidence: 0.9
      });
    });
  }
  
  return annotations;
}

// Quality assessment
function determineQuality(pages: DocumentPage[], fileSize: number): 'high' | 'medium' | 'low' {
  if (pages.length === 0) return 'low';
  
  const hasText = pages.some(p => p.textContent && p.textContent.length > 100);
  const hasAnnotations = pages.some(p => p.annotations && p.annotations.length > 0);
  
  if (hasText && hasAnnotations && fileSize > 50000) return 'high';
  if (hasText || hasAnnotations) return 'medium';
  return 'low';
}

// Storage functions
async function saveDocumentPreview(preview: DocumentPreview, userId: string): Promise<void> {
  const previewDir = path.join(process.cwd(), 'storage', 'previews', userId);
  if (!fs.existsSync(previewDir)) {
    fs.mkdirSync(previewDir, { recursive: true });
  }
  
  const previewPath = path.join(previewDir, `${preview.id}.json`);
  fs.writeFileSync(previewPath, JSON.stringify(preview, null, 2));
}

async function loadDocumentPreview(previewId: string, userId: string): Promise<DocumentPreview | null> {
  const previewPath = path.join(process.cwd(), 'storage', 'previews', userId, `${previewId}.json`);
  
  if (!fs.existsSync(previewPath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(previewPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading preview:', error);
    return null;
  }
}