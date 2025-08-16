import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ExportRequest, ExportResponse } from '@/types/processing';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest): Promise<NextResponse<ExportResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        downloadUrl: '',
        filename: '',
        format: '',
        size: 0,
        expiresAt: '',
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body: ExportRequest = await request.json();
    const { jobId, type, options } = body;

    if (!jobId || !type || !options) {
      return NextResponse.json({
        success: false,
        downloadUrl: '',
        filename: '',
        format: '',
        size: 0,
        expiresAt: '',
        error: 'Job ID, export type, and options are required'
      }, { status: 400 });
    }

    const userId = (session.user as any).id || session.user.email || 'anonymous';
    const hasAccess = await verifyJobAccess(jobId, userId);
    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        downloadUrl: '',
        filename: '',
        format: '',
        size: 0,
        expiresAt: '',
        error: 'Access denied to this job'
      }, { status: 403 });
    }

    const exportId = uuidv4();
    const exportsDir = path.join(process.cwd(), 'storage', 'exports', userId);
    
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const filename = `${type}_export_${exportId}.${options.format}`;
    const exportPath = path.join(exportsDir, filename);

    // Load job data
    const jobData = await loadJobData(jobId);
    if (!jobData) {
      throw new Error('Job data not found');
    }

    // Generate export content based on format
    let content: string;
    switch (options.format) {
      case 'json':
        content = JSON.stringify(jobData, null, 2);
        break;
      case 'csv':
        content = generateCSVContent(jobData, type);
        break;
      case 'pdf':
        content = `PDF Export - ${type}\n\nGenerated at: ${new Date().toISOString()}\n\nNote: PDF generation requires additional libraries`;
        break;
      case 'excel':
        content = JSON.stringify({ note: 'Excel generation requires additional libraries' }, null, 2);
        break;
      case 'pptx':
        content = JSON.stringify({ note: 'PowerPoint generation requires additional libraries' }, null, 2);
        break;
      default:
        content = JSON.stringify(jobData, null, 2);
    }

    fs.writeFileSync(exportPath, content);
    const fileSize = fs.statSync(exportPath).size;

    // Set expiration time (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      success: true,
      downloadUrl: `/api/files/export?id=${exportId}`,
      filename,
      format: options.format,
      size: fileSize,
      expiresAt
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({
      success: false,
      downloadUrl: '',
      filename: '',
      format: '',
      size: 0,
      expiresAt: '',
      error: error instanceof Error ? error.message : 'Export failed'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const userId = (session.user as any).id || session.user.email || 'anonymous';
    const hasAccess = await verifyJobAccess(jobId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const availableExports = [
      {
        type: 'analysis',
        name: 'Detailed Analysis Report',
        description: 'Complete financial analysis with all metrics and projections',
        formats: ['excel', 'pdf', 'json']
      },
      {
        type: 'summary',
        name: 'Executive Summary',
        description: 'High-level overview with key metrics',
        formats: ['pdf', 'excel', 'json']
      },
      {
        type: 'pitch_deck',
        name: 'Investment Pitch Deck',
        description: 'Professional presentation for investors',
        formats: ['pptx', 'pdf']
      },
      {
        type: 'full_report',
        name: 'Complete Report Package',
        description: 'All data and analysis in comprehensive format',
        formats: ['excel', 'json', 'csv']
      }
    ];

    return NextResponse.json({ exports: availableExports });

  } catch (error) {
    console.error('Error getting available exports:', error);
    return NextResponse.json(
      { error: 'Failed to get available exports' },
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
    console.error('Error verifying job access:', error);
    return false;
  }
}

async function loadJobData(jobId: string) {
  try {
    const jobDir = path.join(process.cwd(), 'uploads', jobId);
    const outputDir = path.join(process.cwd(), 'outputs', jobId);
    
    const metadataPath = path.join(jobDir, 'job_metadata.json');
    if (!fs.existsSync(metadataPath)) {
      return null;
    }
    const jobMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    const integratedDataPath = path.join(outputDir, 'integrated_data.json');
    const analysisDataPath = path.join(outputDir, 'analysis_data.json');
    
    let integratedData = null;
    let analysisData = null;
    
    if (fs.existsSync(integratedDataPath)) {
      integratedData = JSON.parse(fs.readFileSync(integratedDataPath, 'utf-8'));
    }
    
    if (fs.existsSync(analysisDataPath)) {
      analysisData = JSON.parse(fs.readFileSync(analysisDataPath, 'utf-8'));
    }

    return {
      job: jobMetadata,
      integratedData,
      analysisData,
      outputDir
    };
  } catch (error) {
    console.error('Error loading job data:', error);
    return null;
  }
}

function generateCSVContent(jobData: any, type: string): string {
  const property = jobData.integratedData?.property || {};
  const financial = jobData.integratedData?.financial || {};
  
  return `Property Name,${property.name || 'N/A'}
Property Type,${property.type || 'N/A'}
Location,${property.location || 'N/A'}
Units,${property.units || 'N/A'}
Asking Price,${property.askingPrice || 'N/A'}
Gross Income,${financial.grossIncome || 'N/A'}
NOI,${financial.noi || 'N/A'}
Export Type,${type}
Generated At,${new Date().toISOString()}`;
}
