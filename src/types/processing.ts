// Processing system types and interfaces

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type FileType = 'rent_roll' | 't12' | 'offering_memo' | 'template' | 'analysis' | 'pitch_deck' | 'other';

export interface ProcessingJob {
  id: string;
  userId: string;
  propertyId?: string;
  status: ProcessingStatus;
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
  files: ProcessingFile[];
  results?: ProcessingResults;
  notifications: NotificationConfig[];
}

export interface ProcessingFile {
  id: string;
  jobId: string;
  name: string;
  originalName: string;
  type: FileType;
  mimeType: string;
  size: number;
  path: string;
  url?: string;
  uploadedAt: string;
  processed: boolean;
  extractedData?: any;
}

export interface ProcessingResults {
  integratedData?: IntegratedData;
  analysisData?: AnalysisData;
  pitchDeck?: PitchDeckData;
  reports?: ReportData[];
  metrics?: ProcessingMetrics;
}

export interface IntegratedData {
  property: {
    name: string;
    type: string;
    location: string;
    units: number;
    totalSqft?: number;
    yearBuilt?: number;
    askingPrice?: number;
  };
  financial: {
    grossIncome: number;
    operatingExpenses: number;
    noi: number;
    capRate?: number;
    cashFlow?: number;
    vacancy?: number;
  };
  units: UnitData[];
  expenses: ExpenseBreakdown;
  assumptions: InvestmentAssumptions;
}

export interface UnitData {
  unit: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  currentRent: number;
  marketRent: number;
  tenant?: string;
  leaseExpiration?: string;
  status: 'occupied' | 'vacant' | 'notice';
}

export interface ExpenseBreakdown {
  management: number;
  maintenance: number;
  utilities: number;
  insurance: number;
  taxes: number;
  marketing: number;
  other: number;
  total: number;
}

export interface InvestmentAssumptions {
  purchasePrice: number;
  downPayment: number;
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
  closingCosts: number;
  renovationBudget?: number;
  holdPeriod: number;
  exitCapRate: number;
  appreciationRate: number;
  rentGrowthRate: number;
  expenseGrowthRate: number;
}

export interface AnalysisData {
  returns: {
    capRate: number;
    cashOnCashReturn: number;
    irr: number;
    equityMultiple: number;
    totalReturn: number;
  };
  metrics: {
    dscr: number;
    ltv: number;
    debtYield: number;
    breakEvenOccupancy: number;
    pricePerUnit: number;
    pricePerSqft: number;
    rentPerSqft: number;
  };
  projections: YearlyProjection[];
  sensitivity: SensitivityAnalysis;
  comparables?: ComparableProperty[];
}

export interface YearlyProjection {
  year: number;
  grossIncome: number;
  operatingExpenses: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  propertyValue: number;
  cumulativeCashFlow: number;
}

export interface SensitivityAnalysis {
  capRateRange: { min: number; max: number; base: number };
  rentGrowthRange: { min: number; max: number; base: number };
  expenseGrowthRange: { min: number; max: number; base: number };
  scenarios: {
    pessimistic: { irr: number; cashOnCash: number };
    base: { irr: number; cashOnCash: number };
    optimistic: { irr: number; cashOnCash: number };
  };
}

export interface ComparableProperty {
  address: string;
  distance: number;
  units: number;
  sqft: number;
  yearBuilt: number;
  salePrice: number;
  saleDate: string;
  pricePerUnit: number;
  pricePerSqft: number;
  capRate?: number;
}

export interface PitchDeckData {
  templateUsed: string;
  slides: PitchDeckSlide[];
  metadata: {
    generatedAt: string;
    version: string;
    format: 'pptx' | 'pdf' | 'html';
  };
  downloadUrl: string;
}

export interface PitchDeckSlide {
  id: number;
  title: string;
  type: 'title' | 'overview' | 'financials' | 'location' | 'photos' | 'returns' | 'summary';
  content: any;
  notes?: string;
}

export interface ReportData {
  id: string;
  type: 'executive_summary' | 'detailed_analysis' | 'market_report' | 'due_diligence';
  title: string;
  format: 'pdf' | 'excel' | 'html';
  downloadUrl: string;
  generatedAt: string;
  size: number;
}

export interface ProcessingMetrics {
  processingTime: number;
  filesProcessed: number;
  errorsEncountered: number;
  dataPointsExtracted: number;
  confidenceScore: number;
  qualityScore: number;
}

export interface NotificationConfig {
  type: 'email' | 'webhook' | 'sms';
  target: string;
  events: NotificationEvent[];
  enabled: boolean;
}

export type NotificationEvent = 
  | 'job_started' 
  | 'job_progress' 
  | 'job_completed' 
  | 'job_failed' 
  | 'file_processed' 
  | 'analysis_ready' 
  | 'pitch_deck_generated';

export interface ProcessingRequest {
  files: {
    rentRoll?: File;
    t12?: File;
    offeringMemo?: File;
    template?: File;
    additional?: File[];
  };
  options: {
    propertyId?: string;
    generatePitchDeck: boolean;
    includeAnalysis: boolean;
    notifications: NotificationConfig[];
    customAssumptions?: Partial<InvestmentAssumptions>;
  };
}

export interface ProcessingResponse {
  success: boolean;
  jobId: string;
  message: string;
  estimatedCompletion?: string;
  statusUrl: string;
  error?: string;
}

export interface JobStatusResponse {
  success: boolean;
  job: ProcessingJob;
  files?: ProcessingFile[];
  downloadUrls?: Record<string, string>;
  error?: string;
}

export interface WebSocketMessage {
  type: 'status_update' | 'progress_update' | 'file_processed' | 'job_completed' | 'error';
  jobId: string;
  data: any;
  timestamp: string;
}

// Real-time processing status updates
export interface ProcessingStatusUpdate {
  jobId: string;
  status: ProcessingStatus;
  progress: number;
  currentStep: string;
  message: string;
  timestamp: string;
  files?: {
    processed: number;
    total: number;
    current?: string;
  };
}

// Export formats
export interface ExportOptions {
  format: 'excel' | 'pdf' | 'pptx' | 'json' | 'csv';
  template?: string;
  includeCharts: boolean;
  includeRawData: boolean;
  customSections?: string[];
}

export interface ExportRequest {
  jobId: string;
  type: 'analysis' | 'pitch_deck' | 'summary' | 'full_report';
  options: ExportOptions;
}

export interface ExportResponse {
  success: boolean;
  downloadUrl: string;
  filename: string;
  format: string;
  size: number;
  expiresAt: string;
  error?: string;
}

// Document preview types
export interface DocumentPreview {
  id: string;
  fileId: string;
  type: 'image' | 'pdf' | 'text';
  pages: DocumentPage[];
  metadata: {
    totalPages: number;
    hasText: boolean;
    quality: 'high' | 'medium' | 'low';
    extractedData?: any;
  };
}

export interface DocumentPage {
  pageNumber: number;
  imageUrl: string;
  thumbnailUrl: string;
  textContent?: string;
  annotations?: DocumentAnnotation[];
}

export interface DocumentAnnotation {
  id: string;
  type: 'highlight' | 'note' | 'extraction';
  coordinates: { x: number; y: number; width: number; height: number };
  content: string;
  confidence?: number;
}

// Investor notification types
export interface InvestorNotification {
  id: string;
  jobId?: string;
  propertyId?: string;
  type: 'new_deal' | 'analysis_complete' | 'price_change' | 'market_update';
  recipients: InvestorRecipient[];
  subject: string;
  content: string;
  attachments: NotificationAttachment[];
  scheduledAt?: string;
  sentAt?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
}

export interface InvestorRecipient {
  id: string;
  email: string;
  name: string;
  type: 'investor' | 'broker' | 'partner' | 'team';
  preferences: {
    dealTypes: string[];
    locationPreferences: string[];
    investmentRange: { min: number; max: number };
    frequency: 'immediate' | 'daily' | 'weekly';
  };
}

export interface NotificationAttachment {
  filename: string;
  type: 'pitch_deck' | 'analysis' | 'photos' | 'documents';
  url: string;
  size: number;
}

// Validation schemas
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}
