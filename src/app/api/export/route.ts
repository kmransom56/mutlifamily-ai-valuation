import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ExportRequest, ExportResponse, ExportOptions } from '@/types/processing';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Multi-format export API
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

    // Verify user has access to the job
    const hasAccess = await verifyJobAccess(jobId, session.user.id);
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

    // Generate export
    const exportResult = await generateExport(jobId, type, options, session.user.id);

    return NextResponse.json({
      success: true,
      downloadUrl: exportResult.downloadUrl,
      filename: exportResult.filename,
      format: exportResult.format,
      size: exportResult.size,
      expiresAt: exportResult.expiresAt
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

// Get list of available exports for a job
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

    const hasAccess = await verifyJobAccess(jobId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const availableExports = await getAvailableExports(jobId);
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

async function generateExport(
  jobId: string,
  type: string,
  options: ExportOptions,
  userId: string
) {
  const exportId = uuidv4();
  const exportsDir = path.join(process.cwd(), 'storage', 'exports', userId);
  
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  // Load job data
  const jobData = await loadJobData(jobId);
  if (!jobData) {
    throw new Error('Job data not found');
  }

  let filename: string;
  let exportPath: string;
  let fileSize: number;

  // Generate export based on format
  switch (options.format) {
    case 'excel':
      const excelResult = await generateExcelExport(jobData, type, options, exportId, exportsDir);
      filename = excelResult.filename;
      exportPath = excelResult.path;
      fileSize = excelResult.size;
      break;

    case 'pdf':
      const pdfResult = await generatePDFExport(jobData, type, options, exportId, exportsDir);
      filename = pdfResult.filename;
      exportPath = pdfResult.path;
      fileSize = pdfResult.size;
      break;

    case 'pptx':
      const pptxResult = await generatePowerPointExport(jobData, type, options, exportId, exportsDir);
      filename = pptxResult.filename;
      exportPath = pptxResult.path;
      fileSize = pptxResult.size;
      break;

    case 'json':
      const jsonResult = await generateJSONExport(jobData, type, options, exportId, exportsDir);
      filename = jsonResult.filename;
      exportPath = jsonResult.path;
      fileSize = jsonResult.size;
      break;

    case 'csv':
      const csvResult = await generateCSVExport(jobData, type, options, exportId, exportsDir);
      filename = csvResult.filename;
      exportPath = csvResult.path;
      fileSize = csvResult.size;
      break;

    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }

  // Set expiration time (24 hours from now)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Save export metadata
  const exportMetadata = {
    id: exportId,
    jobId,
    userId,
    type,
    options,
    filename,
    path: exportPath,
    size: fileSize,
    format: options.format,
    createdAt: new Date().toISOString(),
    expiresAt
  };

  const metadataPath = path.join(exportsDir, `${exportId}_metadata.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(exportMetadata, null, 2));

  return {
    downloadUrl: `/api/files/export?id=${exportId}`,
    filename,
    format: options.format,
    size: fileSize,
    expiresAt
  };
}

async function loadJobData(jobId: string) {
  try {
    const jobDir = path.join(process.cwd(), 'uploads', jobId);
    const outputDir = path.join(process.cwd(), 'outputs', jobId);
    
    // Load job metadata
    const metadataPath = path.join(jobDir, 'job_metadata.json');
    if (!fs.existsSync(metadataPath)) {
      return null;
    }
    const jobMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    // Load processed data
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

// Excel export generator
async function generateExcelExport(
  jobData: any,
  type: string,
  options: ExportOptions,
  exportId: string,
  exportsDir: string
) {
  const filename = `${type}_export_${exportId}.xlsx`;
  const exportPath = path.join(exportsDir, filename);

  // In a real implementation, you would use a library like ExcelJS
  // For now, create a structured JSON that represents the Excel data
  const excelData = {
    workbook: {
      sheets: []
    },
    note: 'Excel generation requires libraries like ExcelJS or node-xlsx'
  };

  switch (type) {
    case 'analysis':
      excelData.workbook.sheets = [
        {
          name: 'Property Overview',
          data: generatePropertyOverviewSheet(jobData)
        },
        {
          name: 'Financial Analysis',
          data: generateFinancialAnalysisSheet(jobData)
        },
        {
          name: 'Unit Mix',
          data: generateUnitMixSheet(jobData)
        },
        {
          name: 'Return Analysis',
          data: generateReturnAnalysisSheet(jobData)
        }
      ];
      break;

    case 'summary':
      excelData.workbook.sheets = [
        {
          name: 'Executive Summary',
          data: generateExecutiveSummarySheet(jobData)
        },
        {
          name: 'Key Metrics',
          data: generateKeyMetricsSheet(jobData)
        }
      ];
      break;

    case 'full_report':
      excelData.workbook.sheets = [
        { name: 'Executive Summary', data: generateExecutiveSummarySheet(jobData) },
        { name: 'Property Overview', data: generatePropertyOverviewSheet(jobData) },
        { name: 'Financial Analysis', data: generateFinancialAnalysisSheet(jobData) },
        { name: 'Unit Mix', data: generateUnitMixSheet(jobData) },
        { name: 'Return Analysis', data: generateReturnAnalysisSheet(jobData) },
        { name: 'Raw Data', data: generateRawDataSheet(jobData) }
      ];
      break;
  }

  // Write the Excel data structure (in production, this would generate actual Excel file)
  fs.writeFileSync(exportPath, JSON.stringify(excelData, null, 2));
  
  return {
    filename,
    path: exportPath,
    size: fs.statSync(exportPath).size
  };
}

// PDF export generator
async function generatePDFExport(
  jobData: any,
  type: string,
  options: ExportOptions,
  exportId: string,
  exportsDir: string
) {
  const filename = `${type}_export_${exportId}.pdf`;
  const exportPath = path.join(exportsDir, filename);

  // Generate HTML content for PDF
  const htmlContent = generateHTMLForPDF(jobData, type, options);
  
  // In production, you would use puppeteer or similar to convert HTML to PDF
  const pdfContent = `PDF Export - ${type}\n\nGenerated at: ${new Date().toISOString()}\n\nNote: PDF generation requires libraries like puppeteer or wkhtmltopdf.\n\nContent:\n${htmlContent.replace(/<[^>]*>/g, '')}`;
  
  fs.writeFileSync(exportPath, pdfContent);
  
  return {
    filename,
    path: exportPath,
    size: fs.statSync(exportPath).size
  };
}

// PowerPoint export generator
async function generatePowerPointExport(
  jobData: any,
  type: string,
  options: ExportOptions,
  exportId: string,
  exportsDir: string
) {
  const filename = `${type}_export_${exportId}.pptx`;
  const exportPath = path.join(exportsDir, filename);

  // Generate PowerPoint structure
  const pptxData = {
    presentation: {
      slides: generateSlidesForPowerPoint(jobData, type, options)
    },
    note: 'PowerPoint generation requires libraries like officegen or pptxgenjs'
  };
  
  fs.writeFileSync(exportPath, JSON.stringify(pptxData, null, 2));
  
  return {
    filename,
    path: exportPath,
    size: fs.statSync(exportPath).size
  };
}

// JSON export generator
async function generateJSONExport(
  jobData: any,
  type: string,
  options: ExportOptions,
  exportId: string,
  exportsDir: string
) {
  const filename = `${type}_export_${exportId}.json`;
  const exportPath = path.join(exportsDir, filename);

  let exportData: any = {};

  switch (type) {
    case 'analysis':
      exportData = {
        analysisData: jobData.analysisData,
        integratedData: jobData.integratedData,
        exportMetadata: {
          type,
          generatedAt: new Date().toISOString(),
          options
        }
      };
      break;

    case 'summary':
      exportData = {
        executiveSummary: generateExecutiveSummaryData(jobData),
        keyMetrics: generateKeyMetricsData(jobData),
        exportMetadata: {
          type,
          generatedAt: new Date().toISOString(),
          options
        }
      };
      break;

    case 'full_report':
      exportData = {
        ...jobData,
        exportMetadata: {
          type,
          generatedAt: new Date().toISOString(),
          options
        }
      };
      break;
  }

  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  
  return {
    filename,
    path: exportPath,
    size: fs.statSync(exportPath).size
  };
}

// CSV export generator
async function generateCSVExport(
  jobData: any,
  type: string,
  options: ExportOptions,
  exportId: string,
  exportsDir: string
) {
  const filename = `${type}_export_${exportId}.csv`;
  const exportPath = path.join(exportsDir, filename);

  let csvContent = '';

  switch (type) {
    case 'analysis':
      csvContent = generateAnalysisCSV(jobData);
      break;
    case 'summary':
      csvContent = generateSummaryCSV(jobData);
      break;
    default:
      csvContent = generateGenericCSV(jobData);
  }

  fs.writeFileSync(exportPath, csvContent);
  
  return {
    filename,
    path: exportPath,
    size: fs.statSync(exportPath).size
  };
}

// Helper functions for generating sheet data
function generatePropertyOverviewSheet(jobData: any) {
  const property = jobData.integratedData?.property || {};
  return [
    ['Property Name', property.name || 'N/A'],
    ['Property Type', property.type || 'N/A'],
    ['Location', property.location || 'N/A'],
    ['Units', property.units || 'N/A'],
    ['Total Sq Ft', property.totalSqft || 'N/A'],
    ['Year Built', property.yearBuilt || 'N/A'],
    ['Asking Price', property.askingPrice || 'N/A']
  ];
}

function generateFinancialAnalysisSheet(jobData: any) {
  const financial = jobData.integratedData?.financial || {};
  return [
    ['Metric', 'Value'],
    ['Gross Income', financial.grossIncome || 'N/A'],
    ['Operating Expenses', financial.operatingExpenses || 'N/A'],
    ['Net Operating Income', financial.noi || 'N/A'],
    ['Cap Rate', financial.capRate || 'N/A'],
    ['Cash Flow', financial.cashFlow || 'N/A'],
    ['Vacancy Rate', financial.vacancy || 'N/A']
  ];
}

function generateUnitMixSheet(jobData: any) {
  const units = jobData.integratedData?.units || [];
  const headers = ['Unit', 'Type', 'Bedrooms', 'Bathrooms', 'Sq Ft', 'Current Rent', 'Market Rent', 'Status'];
  const rows = [headers];
  
  units.forEach((unit: any) => {
    rows.push([
      unit.unit || '',
      unit.type || '',
      unit.bedrooms || '',
      unit.bathrooms || '',
      unit.sqft || '',
      unit.currentRent || '',
      unit.marketRent || '',
      unit.status || ''
    ]);
  });
  
  return rows;
}

function generateReturnAnalysisSheet(jobData: any) {
  const returns = jobData.analysisData?.returns || {};
  return [
    ['Return Metric', 'Value'],
    ['Cap Rate', `${returns.capRate || 'N/A'}%`],
    ['Cash on Cash Return', `${returns.cashOnCashReturn || 'N/A'}%`],
    ['IRR', `${returns.irr || 'N/A'}%`],
    ['Equity Multiple', `${returns.equityMultiple || 'N/A'}x`],
    ['Total Return', `${returns.totalReturn || 'N/A'}%`]
  ];
}

function generateExecutiveSummarySheet(jobData: any) {
  const property = jobData.integratedData?.property || {};
  const financial = jobData.integratedData?.financial || {};
  const returns = jobData.analysisData?.returns || {};
  
  return [
    ['Executive Summary'],
    [''],
    ['Property', property.name || 'N/A'],
    ['Location', property.location || 'N/A'],
    ['Units', property.units || 'N/A'],
    ['Asking Price', property.askingPrice || 'N/A'],
    ['NOI', financial.noi || 'N/A'],
    ['Cap Rate', `${returns.capRate || 'N/A'}%`],
    ['Cash on Cash', `${returns.cashOnCashReturn || 'N/A'}%`],
    ['IRR', `${returns.irr || 'N/A'}%`]
  ];
}

function generateKeyMetricsSheet(jobData: any) {
  const metrics = jobData.analysisData?.metrics || {};
  return [
    ['Key Metrics', 'Value'],
    ['DSCR', metrics.dscr || 'N/A'],
    ['LTV', `${metrics.ltv || 'N/A'}%`],
    ['Debt Yield', `${metrics.debtYield || 'N/A'}%`],
    ['Break-even Occupancy', `${metrics.breakEvenOccupancy || 'N/A'}%`],
    ['Price Per Unit', metrics.pricePerUnit || 'N/A'],
    ['Price Per Sq Ft', metrics.pricePerSqft || 'N/A'],
    ['Rent Per Sq Ft', metrics.rentPerSqft || 'N/A']
  ];
}

function generateRawDataSheet(jobData: any) {
  return [
    ['Raw Data Export'],
    ['Job ID', jobData.job?.id || 'N/A'],
    ['Created At', jobData.job?.createdAt || 'N/A'],
    ['Status', jobData.job?.status || 'N/A'],
    [''],
    ['Full Data (JSON)'],
    [JSON.stringify(jobData, null, 2)]
  ];
}

// HTML generation for PDF
function generateHTMLForPDF(jobData: any, type: string, options: ExportOptions): string {
  return `
    <html>
      <head>
        <title>${type} Export</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; border-bottom: 2px solid #007bff; }
          h2 { color: #666; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>${type.charAt(0).toUpperCase() + type.slice(1)} Report</h1>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
        
        <h2>Property Overview</h2>
        <table>
          <tr><th>Property Name</th><td>${jobData.integratedData?.property?.name || 'N/A'}</td></tr>
          <tr><th>Location</th><td>${jobData.integratedData?.property?.location || 'N/A'}</td></tr>
          <tr><th>Units</th><td>${jobData.integratedData?.property?.units || 'N/A'}</td></tr>
        </table>
        
        <h2>Financial Summary</h2>
        <table>
          <tr><th>Gross Income</th><td>$${jobData.integratedData?.financial?.grossIncome?.toLocaleString() || 'N/A'}</td></tr>
          <tr><th>NOI</th><td>$${jobData.integratedData?.financial?.noi?.toLocaleString() || 'N/A'}</td></tr>
          <tr><th>Cap Rate</th><td>${jobData.analysisData?.returns?.capRate || 'N/A'}%</td></tr>
        </table>
      </body>
    </html>
  `;
}

// PowerPoint slide generation
function generateSlidesForPowerPoint(jobData: any, type: string, options: ExportOptions) {
  return [
    {
      title: 'Property Investment Analysis',
      content: 'Executive Summary and Key Findings'
    },
    {
      title: 'Property Overview',
      content: `${jobData.integratedData?.property?.name || 'Property'} - ${jobData.integratedData?.property?.location || 'Location'}`
    },
    {
      title: 'Financial Analysis',
      content: `NOI: $${jobData.integratedData?.financial?.noi?.toLocaleString() || 'N/A'}`
    },
    {
      title: 'Investment Returns',
      content: `Cap Rate: ${jobData.analysisData?.returns?.capRate || 'N/A'}%, IRR: ${jobData.analysisData?.returns?.irr || 'N/A'}%`
    }
  ];
}

// CSV generation functions
function generateAnalysisCSV(jobData: any): string {
  const rows = [
    ['Metric', 'Value'],
    ['Property Name', jobData.integratedData?.property?.name || 'N/A'],
    ['Location', jobData.integratedData?.property?.location || 'N/A'],
    ['Units', jobData.integratedData?.property?.units || 'N/A'],
    ['Gross Income', jobData.integratedData?.financial?.grossIncome || 'N/A'],
    ['NOI', jobData.integratedData?.financial?.noi || 'N/A'],
    ['Cap Rate', `${jobData.analysisData?.returns?.capRate || 'N/A'}%`],
    ['Cash on Cash', `${jobData.analysisData?.returns?.cashOnCashReturn || 'N/A'}%`],
    ['IRR', `${jobData.analysisData?.returns?.irr || 'N/A'}%`]
  ];
  
  return rows.map(row => row.join(',')).join('\n');
}

function generateSummaryCSV(jobData: any): string {
  const rows = [
    ['Summary Item', 'Value'],
    ['Property', jobData.integratedData?.property?.name || 'N/A'],
    ['Asking Price', jobData.integratedData?.property?.askingPrice || 'N/A'],
    ['NOI', jobData.integratedData?.financial?.noi || 'N/A'],
    ['Cap Rate', `${jobData.analysisData?.returns?.capRate || 'N/A'}%`]
  ];
  
  return rows.map(row => row.join(',')).join('\n');
}

function generateGenericCSV(jobData: any): string {
  return 'Type,Value\nExport Type,Generic\nGenerated At,' + new Date().toISOString();
}

// Helper functions
function generateExecutiveSummaryData(jobData: any) {
  return {
    property: jobData.integratedData?.property || {},
    keyMetrics: {
      noi: jobData.integratedData?.financial?.noi,
      capRate: jobData.analysisData?.returns?.capRate,
      cashOnCash: jobData.analysisData?.returns?.cashOnCashReturn,
      irr: jobData.analysisData?.returns?.irr
    }
  };
}

function generateKeyMetricsData(jobData: any) {
  return jobData.analysisData?.metrics || {};
}

async function getAvailableExports(jobId: string) {
  return [
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
}