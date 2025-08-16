import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  ProcessingJob, 
  ProcessingFile, 
  ProcessingResponse, 
  JobStatusResponse,
  ProcessingStatus,
  NotificationConfig
} from '@/types/processing';
import { sendProcessingUpdate, sendProgressUpdate, sendJobComplete, sendError } from '@/lib/websocket-manager';
import { propertyDatabase } from '@/lib/property-database';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import { sseSendProcessingUpdate, sseSendProgressUpdate, sseSendJobComplete, sseSendError } from '@/lib/sse-manager';
import { enqueueProcessing } from '@/lib/queue';
import { recordJobStart, recordJobProgress, recordJobComplete, recordJobFailed } from '@/lib/job-db';

const execPromise = promisify(exec);

// Define upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const OUTPUT_DIR = path.join(process.cwd(), 'outputs');
const MAX_UPLOAD_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES || '209715200'); // 200MB default

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper: sanitize filenames
function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_');
}

// Helper: allowed extensions per file type
function isAllowedExtension(fileName: string, type: 'rent_roll' | 't12' | 'offering_memo' | 'template'): boolean {
  const ext = path.extname(fileName).toLowerCase();
  const byType: Record<string, string[]> = {
    rent_roll: ['.pdf', '.xlsx', '.xls', '.xlsb'],
    t12: ['.xlsx', '.xls', '.xlsb'],
    offering_memo: ['.pdf'],
    template: ['.xlsx', '.xls', '.xlsb', '.xltx']
  };
  return byType[type].includes(ext);
}

// Helper: stream write uploaded file to disk
async function writeUploadedFile(file: File, destPath: string): Promise<void> {
  const webStream = (file as any).stream?.();
  if (webStream && (Readable as any).fromWeb) {
    await new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(destPath);
      const nodeStream = (Readable as any).fromWeb(webStream);
      nodeStream.pipe(writeStream);
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
      nodeStream.on('error', reject);
    });
  } else {
    // Fallback to buffer if stream not available
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(destPath, buf);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ProcessingResponse>> {
  try {
    // Authenticate user (skip in development)
    const session = await getServerSession(authOptions);
    if (!session?.user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        success: false,
        jobId: '',
        message: 'Authentication required',
        statusUrl: '',
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Create a mock user for development if no session
    const user = session?.user || { 
      id: 'dev-user', 
      email: 'dev@example.com', 
      name: 'Development User' 
    };

    const formData = await request.formData();
    const jobId = uuidv4();
    const jobDir = path.join(UPLOAD_DIR, jobId);
    const outputDir = path.join(OUTPUT_DIR, jobId);
    
    // Create job directory
    fs.mkdirSync(jobDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
    
    // Extract form data with type safety
    const rentRollFile = formData.get('rentRoll') as File | null;
    const t12File = formData.get('t12') as File | null;
    const omFile = formData.get('offeringMemo') as File | null;
    const templateFile = formData.get('template') as File | null;
    const email = formData.get('email') as string | null;
    const propertyId = formData.get('propertyId') as string | null;
    const generatePitchDeck = formData.get('generatePitchDeck') === 'true';
    const includeAnalysis = formData.get('includeAnalysis') === 'true';

    // New: Extract high-level property info and persist immediately
    const propertyName = (formData.get('propertyName') as string | null) || undefined;
    const propertyType = (formData.get('propertyType') as string | null) || 'multifamily';
    const investmentStrategy = (formData.get('investmentStrategy') as string | null) || undefined;
    const unitsStr = (formData.get('units') as string | null) || undefined;
    const location = (formData.get('location') as string | null) || undefined;
    const parsedUnits = unitsStr ? parseInt(unitsStr, 10) : undefined;
    
    // Validate at least one file is provided
    if (!rentRollFile && !t12File && !omFile) {
      return NextResponse.json({
        success: false,
        jobId: '',
        message: 'At least one file (rent roll, T12, or offering memo) is required',
        statusUrl: '',
        error: 'No files provided'
      }, { status: 400 });
    }
    
    // Initialize processing job
    const notifications: NotificationConfig[] = [];
    if (email) {
      notifications.push({
        type: 'email',
        target: email,
        events: ['job_completed', 'job_failed'],
        enabled: true
      });
    }

    const processingJob: ProcessingJob = {
      id: jobId,
      userId: (user as any).id,
      propertyId: propertyId || undefined,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      files: [],
      notifications
    };

    // If client provided property info, create a placeholder property immediately
    if (!processingJob.propertyId && propertyName && location) {
      try {
        const created = await propertyDatabase.saveProperty({
          name: propertyName,
          type: (propertyType as any) || 'multifamily',
          location,
          units: parsedUnits && !Number.isNaN(parsedUnits) ? parsedUnits : 1,
          userId: (user as any).id,
          notes: investmentStrategy ? `Investment strategy: ${investmentStrategy}` : undefined
        });
        processingJob.propertyId = created.id;
      } catch (e) {
        // Non-fatal
        console.error('Failed to create placeholder property:', e);
      }
    }

    // File paths and processing files
    const filePaths: Record<string, string> = {};
    const processingFiles: ProcessingFile[] = [];
    
    // Save files if provided with enhanced metadata (streaming + sanitization)
    if (rentRollFile && rentRollFile.size > 0) {
      if (rentRollFile.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ success: false, jobId: '', message: 'Rent roll file too large', statusUrl: '', error: 'File too large' }, { status: 400 });
      }
      const safeOriginal = sanitizeFilename(rentRollFile.name);
      if (!isAllowedExtension(safeOriginal, 'rent_roll')) {
        return NextResponse.json({ success: false, jobId: '', message: 'Invalid rent roll file type', statusUrl: '', error: 'Unsupported file type' }, { status: 400 });
      }
      const fileName = `rent_roll_${Date.now()}_${safeOriginal}`;
      const rentRollPath = path.join(jobDir, fileName);
      await writeUploadedFile(rentRollFile, rentRollPath);
      filePaths.rentRoll = rentRollPath;
      
      processingFiles.push({
        id: uuidv4(),
        jobId,
        name: fileName,
        originalName: rentRollFile.name,
        type: 'rent_roll',
        mimeType: rentRollFile.type,
        size: rentRollFile.size,
        path: rentRollPath,
        uploadedAt: new Date().toISOString(),
        processed: false
      });
    }
    
    if (t12File && t12File.size > 0) {
      if (t12File.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ success: false, jobId: '', message: 'T12 file too large', statusUrl: '', error: 'File too large' }, { status: 400 });
      }
      const safeOriginal = sanitizeFilename(t12File.name);
      if (!isAllowedExtension(safeOriginal, 't12')) {
        return NextResponse.json({ success: false, jobId: '', message: 'Invalid T12 file type', statusUrl: '', error: 'Unsupported file type' }, { status: 400 });
      }
      const fileName = `t12_${Date.now()}_${safeOriginal}`;
      const t12Path = path.join(jobDir, fileName);
      await writeUploadedFile(t12File, t12Path);
      filePaths.t12 = t12Path;
      
      processingFiles.push({
        id: uuidv4(),
        jobId,
        name: fileName,
        originalName: t12File.name,
        type: 't12',
        mimeType: t12File.type,
        size: t12File.size,
        path: t12Path,
        uploadedAt: new Date().toISOString(),
        processed: false
      });
    }
    
    if (omFile && omFile.size > 0) {
      if (omFile.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ success: false, jobId: '', message: 'Offering memo file too large', statusUrl: '', error: 'File too large' }, { status: 400 });
      }
      const safeOriginal = sanitizeFilename(omFile.name);
      if (!isAllowedExtension(safeOriginal, 'offering_memo')) {
        return NextResponse.json({ success: false, jobId: '', message: 'Invalid offering memo file type', statusUrl: '', error: 'Unsupported file type' }, { status: 400 });
      }
      const fileName = `offering_memo_${Date.now()}_${safeOriginal}`;
      const omPath = path.join(jobDir, fileName);
      await writeUploadedFile(omFile, omPath);
      filePaths.om = omPath;
      
      processingFiles.push({
        id: uuidv4(),
        jobId,
        name: fileName,
        originalName: omFile.name,
        type: 'offering_memo',
        mimeType: omFile.type,
        size: omFile.size,
        path: omPath,
        uploadedAt: new Date().toISOString(),
        processed: false
      });
    }
    
    if (templateFile && templateFile.size > 0) {
      if (templateFile.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ success: false, jobId: '', message: 'Template file too large', statusUrl: '', error: 'File too large' }, { status: 400 });
      }
      const safeOriginal = sanitizeFilename(templateFile.name);
      if (!isAllowedExtension(safeOriginal, 'template')) {
        return NextResponse.json({ success: false, jobId: '', message: 'Invalid template file type', statusUrl: '', error: 'Unsupported file type' }, { status: 400 });
      }
      const fileName = `template_${Date.now()}_${safeOriginal}`;
      const templatePath = path.join(jobDir, fileName);
      await writeUploadedFile(templateFile, templatePath);
      filePaths.template = templatePath;
      
      processingFiles.push({
        id: uuidv4(),
        jobId,
        name: fileName,
        originalName: templateFile.name,
        type: 'template',
        mimeType: templateFile.type,
        size: templateFile.size,
        path: templatePath,
        uploadedAt: new Date().toISOString(),
        processed: false
      });
    }
    
    // Update processing job with files
    processingJob.files = processingFiles;
    
    // Save job metadata
    const jobMetadataPath = path.join(jobDir, 'job_metadata.json');
    fs.writeFileSync(jobMetadataPath, JSON.stringify({
      ...processingJob,
      propertyInfo: { propertyName, propertyType, investmentStrategy, units: parsedUnits, location }
    }, null, 2));
    
    // Build command to run Python processing system
    const aiProcessingDir = path.join(process.cwd(), 'ai_processing');
    const mainScript = path.join(aiProcessingDir, 'src', 'main.py');
    
    // Check if AI processing system exists
    if (!fs.existsSync(mainScript)) {
      return NextResponse.json({
        success: false,
        jobId: '',
        message: 'AI processing system not found. Please install the Python processing environment.',
        statusUrl: '',
        error: 'Processing system not available'
      }, { status: 500 });
    }
    
    // Build spawn arguments
    const spawnArgs: string[] = [
      mainScript,
      '--output-dir', outputDir,
      '--job-id', jobId
    ];
    if (processingJob.propertyId) { spawnArgs.push('--property-id', processingJob.propertyId); }
    if (filePaths.rentRoll) { spawnArgs.push('--rent-roll', filePaths.rentRoll); }
    if (filePaths.t12) { spawnArgs.push('--t12', filePaths.t12); }
    if (filePaths.om) { spawnArgs.push('--om', filePaths.om); }
    if (filePaths.template) { spawnArgs.push('--template', filePaths.template); }
    if (generatePitchDeck) { spawnArgs.push('--generate-pitch-deck'); }
    if (includeAnalysis) { spawnArgs.push('--include-analysis'); }
    
    // Use virtual environment if available, otherwise use system Python
    const venvPythonUnix = path.join(aiProcessingDir, 'venv', 'bin', 'python3');
    const venvPythonWin = path.join(aiProcessingDir, 'venv', 'Scripts', 'python.exe');
    
    let pythonCmd = 'python3';
    if (fs.existsSync(venvPythonUnix)) {
      pythonCmd = venvPythonUnix;
    } else if (fs.existsSync(venvPythonWin)) {
      pythonCmd = venvPythonWin;
    }
    
    // Send initial processing update (WS + SSE)
    const initialUpdate = {
      jobId,
      status: 'processing' as const,
      progress: 0,
      currentStep: 'Initializing processing job',
      message: 'Job started, preparing to process files',
      timestamp: new Date().toISOString(),
      files: {
        processed: 0,
        total: processingFiles.length
      }
    };
    sendProcessingUpdate(jobId, (user as any).id, initialUpdate);
    sseSendProcessingUpdate(jobId, (user as any).id, initialUpdate);
    await recordJobStart({ jobId, userId: (user as any).id, status: 'processing', progress: 0, propertyId: processingJob.propertyId, files: processingFiles });

    // Execute the command asynchronously with real-time updates
    const useQueue = !!process.env.REDIS_URL;
    if (useQueue) {
      await enqueueProcessing({
        jobId,
        userId: (user as any).id,
        args: { cwd: aiProcessingDir, cmd: pythonCmd, args: spawnArgs }
      });
    } else {
      setTimeout(() => {
        executeProcessingWithUpdates({
          cwd: aiProcessingDir,
          cmd: pythonCmd,
          args: spawnArgs
        }, jobId, (user as any).id, processingFiles.length);
      }, 100);
    }
    
    // Calculate estimated completion time
    const estimatedMinutes = processingFiles.length * 2 + (generatePitchDeck ? 3 : 0) + (includeAnalysis ? 2 : 0);
    const estimatedCompletion = new Date(Date.now() + estimatedMinutes * 60000).toISOString();
    
    // Return comprehensive response
    return NextResponse.json({ 
      success: true, 
      message: 'Processing started successfully',
      jobId,
      statusUrl: `/api/process?jobId=${jobId}`,
      estimatedCompletion
    });
    
  } catch (error) {
    console.error('Error processing files:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process files', 
        jobId: '',
        statusUrl: '',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<JobStatusResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json(
        { 
          success: false, 
          job: {} as ProcessingJob,
          error: 'Job ID is required' 
        },
        { status: 400 }
      );
    }
    
    // Authenticate user (skip in development)
    const session = await getServerSession(authOptions);
    if (!session?.user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        success: false,
        job: {} as ProcessingJob,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Create a mock user for development if no session
    const user = session?.user || { 
      id: 'dev-user', 
      email: 'dev@example.com', 
      name: 'Development User' 
    };
    
    const jobDir = path.join(UPLOAD_DIR, jobId);
    const outputDir = path.join(OUTPUT_DIR, jobId);
    const jobMetadataPath = path.join(jobDir, 'job_metadata.json');
    
    // Check if job exists
    if (!fs.existsSync(jobDir) || !fs.existsSync(jobMetadataPath)) {
      return NextResponse.json(
        { 
          success: false, 
          job: {} as ProcessingJob,
          error: 'Job not found' 
        },
        { status: 404 }
      );
    }
    
    // Load job metadata
    let processingJob: ProcessingJob;
    try {
      const jobMetadata = fs.readFileSync(jobMetadataPath, 'utf-8');
      processingJob = JSON.parse(jobMetadata);
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          job: {} as ProcessingJob,
          error: 'Invalid job metadata' 
        },
        { status: 500 }
      );
    }
    
    // Verify user owns this job
    if (processingJob.userId !== (user as any).id && (user as any).role !== 'admin') {
      return NextResponse.json(
        { 
          success: false, 
          job: {} as ProcessingJob,
          error: 'Access denied' 
        },
        { status: 403 }
      );
    }
    
    // Update job status based on output files
    let currentStatus: ProcessingStatus = 'processing';
    let progress = 10; // Started
    const downloadUrls: Record<string, string> = {};
    
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      
      // Check for specific output files from Python processing system
      const integratedDataPath = path.join(outputDir, 'integratedData.json');
      const populatedTemplatePath = path.join(outputDir, 'populatedTemplate.xlsx');
      const analysisReportPath = path.join(outputDir, 'analysisReport.pdf');
      const pitchDeckPath = path.join(outputDir, 'pitchDeck.pptx');
      const processingResultsPath = path.join(outputDir, 'processing_results.json');
      const errorDetailsPath = path.join(outputDir, 'error_details.json');
      
      // Check for errors
      if (fs.existsSync(errorDetailsPath)) {
        currentStatus = 'failed';
        try {
          const errorDetails = JSON.parse(fs.readFileSync(errorDetailsPath, 'utf-8'));
          (processingJob as any).error = errorDetails.error;
        } catch {
          (processingJob as any).error = 'Processing failed with unknown error';
        }
        (processingJob as any).failedAt = new Date().toISOString();
      } else {
        // Calculate progress based on completed files
        if (fs.existsSync(integratedDataPath)) {
          progress = Math.max(progress, 40);
          downloadUrls.integratedData = `/api/files?jobId=${jobId}&file=integratedData.json`;
        }
        
        if (fs.existsSync(populatedTemplatePath)) {
          progress = Math.max(progress, 65);
          downloadUrls.populatedTemplate = `/api/files?jobId=${jobId}&file=populatedTemplate.xlsx`;
        }
        
        if (fs.existsSync(analysisReportPath)) {
          progress = Math.max(progress, 80);
          downloadUrls.analysisReport = `/api/files?jobId=${jobId}&file=analysisReport.pdf`;
        }
        
        if (fs.existsSync(pitchDeckPath)) {
          progress = Math.max(progress, 95);
          downloadUrls.pitchDeck = `/api/files?jobId=${jobId}&file=pitchDeck.pptx`;
        }
        
        // Check if processing completed successfully
        if (fs.existsSync(processingResultsPath)) {
          try {
            const results = JSON.parse(fs.readFileSync(processingResultsPath, 'utf-8'));
            if (results.status === 'completed') {
              currentStatus = 'completed';
              progress = 100;
              (processingJob as any).completedAt = new Date().toISOString();
            }
          } catch {
            // Continue with file-based progress calculation
          }
        }
      }
      
      // Add all available files to download URLs
      files.forEach(file => {
        const key = file.replace(/\.[^/.]+$/, "");
        if (!downloadUrls[key]) {
          downloadUrls[key] = `/api/files?jobId=${jobId}&file=${encodeURIComponent(file)}`;
        }
      });
    }
    
    // Update job metadata
    processingJob.status = currentStatus;
    processingJob.progress = progress;
    
    // Save updated job metadata
    fs.writeFileSync(jobMetadataPath, JSON.stringify(processingJob, null, 2));
    
    return NextResponse.json({
      success: true,
      job: processingJob,
      files: processingJob.files,
      downloadUrls
    });
    
  } catch (error) {
    console.error('Error checking job status:', error);
    return NextResponse.json(
      { 
        success: false, 
        job: {} as ProcessingJob,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Function to create property from processing results
async function createPropertyFromProcessingResults(outputDir: string, jobId: string, userId: string) {
  try {
    // Check for processing results file
    const processingResultsPath = path.join(outputDir, 'processing_results.json');
    const integratedDataPath = path.join(outputDir, 'integratedData.json');
    
    let propertyData: any = null;
    
    // Try to load property data from results
    if (fs.existsSync(processingResultsPath)) {
      try {
        const results = JSON.parse(fs.readFileSync(processingResultsPath, 'utf-8'));
        propertyData = results.property || results;
      } catch (error) {
        console.error('Error parsing processing results:', error);
      }
    }
    
    // Fallback to integrated data
    if (!propertyData && fs.existsSync(integratedDataPath)) {
      try {
        const integratedData = JSON.parse(fs.readFileSync(integratedDataPath, 'utf-8'));
        propertyData = integratedData.property || integratedData;
      } catch (error) {
        console.error('Error parsing integrated data:', error);
      }
    }
    
    // Create property if we have data
    if (propertyData && propertyData.name) {
      const newProperty = await propertyDatabase.saveProperty({
        name: propertyData.name || `Property ${jobId}`,
        type: propertyData.type || 'multifamily',
        location: propertyData.location || 'Unknown Location',
        units: propertyData.units || propertyData.totalUnits || 1,
        userId: userId,
        financialData: propertyData.askingPrice || propertyData.grossIncome ? {
          purchasePrice: propertyData.askingPrice || propertyData.price || 0,
          grossIncome: propertyData.grossIncome || propertyData.totalIncome || 0,
          operatingExpenses: propertyData.operatingExpenses || propertyData.totalExpenses || 0,
          vacancy: 0.05, // Default 5% vacancy
          loanAmount: 0,
          interestRate: 0.05,
          loanTerm: 30,
          cashInvested: 0,
          appreciationRate: 0.03,
          rentGrowthRate: 0.03,
          expenseGrowthRate: 0.03,
          holdingPeriod: 10,
          capRateAtSale: propertyData.capRate || 0.06,
          askingPrice: propertyData.askingPrice || propertyData.price,
          noi: propertyData.noi || propertyData.netOperatingIncome,
          capRate: propertyData.capRate,
          cashOnCashReturn: propertyData.cashOnCashReturn,
          irr: propertyData.irr,
          dscr: propertyData.dscr,
          ltv: propertyData.ltv
        } : undefined,
        notes: `Created from document processing job ${jobId}`
      });
      
      console.log(`Created property ${newProperty.id} from processing job ${jobId}`);
      
      // Update property with analysis data if available
      if (propertyData.capRate || propertyData.noi) {
        await propertyDatabase.updateProperty({
          id: newProperty.id,
          status: 'Analyzed',
          askingPrice: propertyData.askingPrice || propertyData.price,
          pricePerUnit: propertyData.pricePerUnit,
          grossIncome: propertyData.grossIncome || propertyData.totalIncome,
          operatingExpenses: propertyData.operatingExpenses || propertyData.totalExpenses,
          noi: propertyData.noi || propertyData.netOperatingIncome,
          capRate: propertyData.capRate,
          cashOnCashReturn: propertyData.cashOnCashReturn,
          irr: propertyData.irr,
          dscr: propertyData.dscr,
          ltv: propertyData.ltv,
          viabilityScore: propertyData.viabilityScore || calculateViabilityScore(propertyData)
        });
      }
      
      return newProperty;
    } else {
      // Create a basic property with minimal info if no detailed data available
      // Try to extract property name from job metadata or files
      let propertyName = `Property Analysis ${new Date().toLocaleDateString()}`;
      
      try {
        const jobDir = path.join(process.cwd(), 'uploads', jobId);
        const jobMetadataPath = path.join(jobDir, 'job_metadata.json');
        
        if (fs.existsSync(jobMetadataPath)) {
          const jobMetadata = JSON.parse(fs.readFileSync(jobMetadataPath, 'utf-8'));
          
          // Try to extract property name from file names
          const t12File = jobMetadata.files?.find((f: any) => f.type === 't12');
          if (t12File?.originalName) {
            const fileName = t12File.originalName;
            if (fileName.includes('HC') && fileName.includes('LLC')) {
              const match = fileName.match(/HC\s+\d+\s+\w+\s+LLC/);
              if (match) {
                propertyName = match[0];
              }
            }
          }
        }
      } catch (error) {
        console.error('Error extracting property name:', error);
      }
      
      const basicProperty = await propertyDatabase.saveProperty({
        name: propertyName,
        type: 'multifamily',
        location: 'To be determined',
        units: 1,
        userId: userId,
        notes: `Created from document processing job ${jobId}. Please update property details and financial information.`
      });
      
      console.log(`Created basic property ${basicProperty.id} from processing job ${jobId}`);
      return basicProperty;
    }
  } catch (error) {
    console.error('Error creating property from processing results:', error);
    return null;
  }
}

// Helper function to calculate viability score
function calculateViabilityScore(propertyData: any): number {
  let score = 50; // Base score
  
  if (propertyData.capRate) {
    if (propertyData.capRate >= 8) score += 20;
    else if (propertyData.capRate >= 6) score += 10;
    else if (propertyData.capRate < 4) score -= 20;
  }
  
  if (propertyData.cashOnCashReturn) {
    if (propertyData.cashOnCashReturn >= 12) score += 15;
    else if (propertyData.cashOnCashReturn >= 8) score += 5;
    else if (propertyData.cashOnCashReturn < 4) score -= 15;
  }
  
  if (propertyData.dscr) {
    if (propertyData.dscr >= 1.3) score += 10;
    else if (propertyData.dscr >= 1.2) score += 5;
    else if (propertyData.dscr < 1.1) score -= 20;
  }
  
  if (propertyData.ltv) {
    if (propertyData.ltv <= 70) score += 5;
    else if (propertyData.ltv >= 85) score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

// Enhanced processing function with real-time WebSocket + SSE updates (spawn-based)
async function executeProcessingWithUpdates(
  proc: { cwd: string; cmd: string; args: string[] }, 
  jobId: string, 
  userId: string, 
  totalFiles: number
) {
  const steps = [
    { progress: 10, message: "Setting up processing environment" },
    { progress: 25, message: "Extracting data from uploaded files" },
    { progress: 50, message: "Analyzing financial metrics" },
    { progress: 70, message: "Generating market insights" },
    { progress: 85, message: "Creating comprehensive analysis" },
    { progress: 95, message: "Finalizing results and generating reports" }
  ];

  try {
    // Simulate progressive updates during processing
    let currentStepIndex = 0;
    
    const interval = setInterval(() => {
      if (currentStepIndex < steps.length) {
        const step = steps[currentStepIndex];
        sendProgressUpdate(jobId, userId, step.progress, step.message);
        sseSendProgressUpdate(jobId, userId, step.progress, step.message);
        recordJobProgress(jobId, step.progress).catch(() => {});
        currentStepIndex++;
      } else {
        clearInterval(interval);
      }
    }, 2000);

    // Execute the actual command via spawn
    try {
      const child = spawn(proc.cmd, proc.args, { cwd: proc.cwd });
      // Persist PID for cancel support
      try {
        const pidPath = path.join(process.cwd(), 'uploads', jobId, 'pid');
        fs.writeFileSync(pidPath, String(child.pid));
      } catch {}

      child.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        // Optional: parse lines for progress hints like "PROGRESS: 60 Processing..."
        const match = text.match(/PROGRESS:\s*(\d{1,3})\s*(.*)/i);
        if (match) {
          const pct = Math.min(100, Math.max(0, parseInt(match[1], 10)));
          const msg = match[2] || 'Processing';
          sendProgressUpdate(jobId, userId, pct, msg);
          sseSendProgressUpdate(jobId, userId, pct, msg);
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        console.error('Processing stderr:', text);
      });

      await new Promise<void>((resolve, reject) => {
        child.on('error', reject);
        child.on('close', (code) => {
          clearInterval(interval);
          // Clear PID file on exit
          try {
            const pidPath = path.join(process.cwd(), 'uploads', jobId, 'pid');
            if (fs.existsSync(pidPath)) fs.unlinkSync(pidPath);
          } catch {}
          if (code === 0) resolve();
          else reject(new Error(`Processing exited with code ${code}`));
        });
      });
    } catch (cmdError) {
      clearInterval((global as any).noopInterval ?? undefined);
      console.error("Command execution failed:", cmdError);
      
      // For development, provide helpful error message
      if (process.env.NODE_ENV === 'development') {
        throw new Error(`Processing system not available in development mode. This application requires Python processing scripts to analyze real documents. Error: ${cmdError}`);
      } else {
        throw cmdError;
      }
    }

    // Send completion update
    sendProgressUpdate(jobId, userId, 100, "Processing completed successfully");
    sseSendProgressUpdate(jobId, userId, 100, "Processing completed successfully");
    
    // Load results and send completion notification
    setTimeout(async () => {
      const outputDir = path.join(process.cwd(), "outputs", jobId);
      const downloadUrls: Record<string, string> = {};
      
      // Check for generated files
      if (fs.existsSync(outputDir)) {
        const files = fs.readdirSync(outputDir);
        files.forEach(file => {
          if (file.endsWith(".json") || file.endsWith(".pdf") || file.endsWith(".xlsx") || file.endsWith(".pptx")) {
            const fileName = file.replace(/\.[^/.]+$/, "");
            downloadUrls[fileName] = `/api/files?jobId=${jobId}&file=${encodeURIComponent(file)}`;
          }
        });

        // Try to create property from processing results
        await createPropertyFromProcessingResults(outputDir, jobId, userId);
      }
      
      const completionPayload = {
        jobId,
        status: "completed",
        message: "All processing tasks completed successfully",
        downloadUrls,
        timestamp: new Date().toISOString()
      };
      sendJobComplete(jobId, userId, completionPayload);
      sseSendJobComplete(jobId, userId, completionPayload);
      recordJobComplete(jobId).catch(() => {});
    }, 1000);

  } catch (error) {
    console.error("Processing failed:", error);
    
    // Send error update
    const errorMessage = error instanceof Error ? error.message : "Processing failed";
    sendError(jobId, userId, errorMessage);
    sseSendError(jobId, userId, errorMessage);
    recordJobFailed(jobId, errorMessage).catch(() => {});
    
    // Update job metadata with error
    const jobDir = path.join(process.cwd(), "uploads", jobId);
    const metadataPath = path.join(jobDir, "job_metadata.json");
    
    if (fs.existsSync(metadataPath)) {
      try {
        const jobMetadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
        jobMetadata.status = "failed";
        jobMetadata.error = errorMessage;
        jobMetadata.failedAt = new Date().toISOString();
        fs.writeFileSync(metadataPath, JSON.stringify(jobMetadata, null, 2));
      } catch (updateError) {
        console.error("Failed to update job metadata:", updateError);
      }
    }
  }
}
