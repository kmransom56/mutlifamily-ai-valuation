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

const execPromise = promisify(exec);

// Define upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const OUTPUT_DIR = path.join(process.cwd(), 'outputs');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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

    // File paths and processing files
    const filePaths: Record<string, string> = {};
    const processingFiles: ProcessingFile[] = [];
    
    // Save files if provided with enhanced metadata
    if (rentRollFile && rentRollFile.size > 0) {
      const fileName = `rent_roll_${Date.now()}_${rentRollFile.name}`;
      const rentRollPath = path.join(jobDir, fileName);
      const rentRollBuffer = Buffer.from(await rentRollFile.arrayBuffer());
      fs.writeFileSync(rentRollPath, rentRollBuffer);
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
      const fileName = `t12_${Date.now()}_${t12File.name}`;
      const t12Path = path.join(jobDir, fileName);
      const t12Buffer = Buffer.from(await t12File.arrayBuffer());
      fs.writeFileSync(t12Path, t12Buffer);
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
      const fileName = `offering_memo_${Date.now()}_${omFile.name}`;
      const omPath = path.join(jobDir, fileName);
      const omBuffer = Buffer.from(await omFile.arrayBuffer());
      fs.writeFileSync(omPath, omBuffer);
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
      const fileName = `template_${Date.now()}_${templateFile.name}`;
      const templatePath = path.join(jobDir, fileName);
      const templateBuffer = Buffer.from(await templateFile.arrayBuffer());
      fs.writeFileSync(templatePath, templateBuffer);
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
    fs.writeFileSync(jobMetadataPath, JSON.stringify(processingJob, null, 2));
    
    // Show what files were uploaded and explain the processing requirement
    const filesList = [
      filePaths.rentRoll && `- Rent Roll: ${filePaths.rentRoll}`,
      filePaths.t12 && `- T12: ${filePaths.t12}`,
      filePaths.om && `- Offering Memo: ${filePaths.om}`,
      filePaths.template && `- Template: ${filePaths.template}`
    ].filter(Boolean).join('\\n');
    
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
    
    // Build command arguments
    const args = [
      `--output-dir "${outputDir}"`,
      `--job-id "${jobId}"`,
      propertyId ? `--property-id "${propertyId}"` : '',
      filePaths.rentRoll ? `--rent-roll "${filePaths.rentRoll}"` : '',
      filePaths.t12 ? `--t12 "${filePaths.t12}"` : '',
      filePaths.om ? `--om "${filePaths.om}"` : '',
      filePaths.template ? `--template "${filePaths.template}"` : '',
      generatePitchDeck ? '--generate-pitch-deck' : '',
      includeAnalysis ? '--include-analysis' : ''
    ].filter(Boolean).join(' ');
    
    // Use virtual environment if available, otherwise use system Python
    const venvPythonUnix = path.join(aiProcessingDir, 'venv', 'bin', 'python3');
    const venvPythonWin = path.join(aiProcessingDir, 'venv', 'Scripts', 'python.exe');
    
    let pythonCmd = 'python3';
    if (fs.existsSync(venvPythonUnix)) {
      pythonCmd = venvPythonUnix;
    } else if (fs.existsSync(venvPythonWin)) {
      pythonCmd = venvPythonWin;
    }
    
    const command = `cd "${aiProcessingDir}" && "${pythonCmd}" "${mainScript}" ${args}`;
    
    // Send initial processing update
    sendProcessingUpdate(jobId, (user as any).id, {
      jobId,
      status: 'processing',
      progress: 0,
      currentStep: 'Initializing processing job',
      message: 'Job started, preparing to process files',
      timestamp: new Date().toISOString(),
      files: {
        processed: 0,
        total: processingFiles.length
      }
    });

    // Execute the command asynchronously with real-time updates
    // In a production environment, this would be handled by a job queue
    setTimeout(() => {
      executeProcessingWithUpdates(command, jobId, (user as any).id, processingFiles.length);
    }, 100);
    
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
          processingJob.error = errorDetails.error;
        } catch {
          processingJob.error = 'Processing failed with unknown error';
        }
        processingJob.failedAt = new Date().toISOString();
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
              processingJob.completedAt = new Date().toISOString();
            }
          } catch {
            // Continue with file-based progress calculation
          }
        }
      }
      
      // Add all available files to download URLs
      files.forEach(file => {
        if (!downloadUrls[file.replace(/\.[^/.]+$/, "")]) {
          downloadUrls[file.replace(/\.[^/.]+$/, "")] = `/api/files?jobId=${jobId}&file=${file}`;
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
            // Extract property name from T12 filename (e.g., "052125 HC 12712 C LLC Trailing 12mth Financials.xlsx")
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

// Enhanced processing function with real-time WebSocket updates
async function executeProcessingWithUpdates(
  command: string, 
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
    
    const updateInterval = setInterval(() => {
      if (currentStepIndex < steps.length) {
        const step = steps[currentStepIndex];
        sendProgressUpdate(jobId, userId, step.progress, step.message);
        currentStepIndex++;
      } else {
        clearInterval(updateInterval);
      }
    }, 2000);

    // Execute the actual command
    try {
      const { stdout, stderr } = await execPromise(command);
      clearInterval(updateInterval);
      console.log("Processing completed:", stdout);
      if (stderr) {
        console.error("Processing errors:", stderr);
      }
    } catch (cmdError) {
      clearInterval(updateInterval);
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
            downloadUrls[fileName] = `/api/files?jobId=${jobId}&file=${file}`;
          }
        });

        // Try to create property from processing results
        await createPropertyFromProcessingResults(outputDir, jobId, userId);
      }
      
      sendJobComplete(jobId, userId, {
        jobId,
        status: "completed",
        message: "All processing tasks completed successfully",
        downloadUrls,
        timestamp: new Date().toISOString()
      });
    }, 1000);

  } catch (error) {
    console.error("Processing failed:", error);
    
    // Send error update
    const errorMessage = error instanceof Error ? error.message : "Processing failed";
    sendError(jobId, userId, errorMessage);
    
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
