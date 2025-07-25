// Property data types and interfaces
export type PropertyType = 'multifamily' | 'commercial' | 'mixed-use' | 'single-family' | 'other';
export type PropertyStatus = 'Analyzed' | 'Pending' | 'Processing' | 'Acquired' | 'Rejected' | 'Under Review';
export type UnitStatus = 'Current' | 'Vacant' | 'Notice' | 'Pending';

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  units: number;
  location: string;
  status: PropertyStatus;
  dateCreated: string;
  dateAnalyzed?: string;
  capRate?: number;
  noi?: number;
  askingPrice?: number;
  pricePerUnit?: number;
  grossIncome?: number;
  operatingExpenses?: number;
  vacancy?: number;
  cashOnCashReturn?: number;
  irr?: number;
  equityMultiple?: number;
  dscr?: number;
  ltv?: number;
  viabilityScore?: number;
  investmentStrategy?: string;
  files?: PropertyFile[];
  notes?: string;
}

export interface Unit {
  id: string;
  propertyId: string;
  unit: string;
  bedrooms: number;
  bathrooms: number;
  tenant?: string;
  status: UnitStatus;
  sqft: number;
  marketRent: number;
  currentRent: number;
  deposit?: number;
  leaseFrom?: string;
  leaseTo?: string;
  pastDue?: number;
  moveInDate?: string;
  moveOutDate?: string;
}

export interface PropertyFile {
  id: string;
  propertyId: string;
  name: string;
  type: 'rent_roll' | 't12' | 'offering_memo' | 'template' | 'pitch_deck' | 'analysis' | 'other';
  fileType: string; // e.g., 'pdf', 'xlsx', 'pptx'
  size: number;
  uploadedAt: string;
  downloadUrl?: string;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface FinancialProjection {
  year: number;
  grossIncome: number;
  operatingExpenses: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  propertyValue: number;
  cumulativeCashFlow: number;
}

export interface PropertyAnalysis {
  id: string;
  propertyId: string;
  sessionId: string;
  createdAt: string;
  
  // Financial Metrics
  purchasePrice: number;
  grossIncome: number;
  operatingExpenses: number;
  noi: number;
  capRate: number;
  
  // Financing
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
  debtService: number;
  cashInvested: number;
  
  // Returns
  cashOnCashReturn: number;
  irr: number;
  equityMultiple: number;
  dscr: number;
  ltv: number;
  
  // Projections
  projections?: FinancialProjection[];
  
  // Viability
  viabilityScore: number;
  viabilityRating: 'Excellent' | 'Very Good' | 'Good' | 'Fair' | 'Marginal' | 'Poor';
  
  // Risk Factors
  riskFactors?: string[];
  opportunities?: string[];
  
  // Market Data
  marketData?: {
    averageCapRate: number;
    marketRentGrowth: number;
    occupancyRate: number;
    medianPrice: number;
  };
}

export interface DashboardMetrics {
  totalProperties: number;
  averageUnits: number;
  averageCapRate: number;
  potentialDeals: number;
  totalValue: number;
  monthlyIncome: number;
  occupancyRate: number;
  portfolioIRR: number;
}

export interface PropertyFilter {
  search?: string;
  type?: PropertyType;
  status?: PropertyStatus;
  location?: string;
  minUnits?: number;
  maxUnits?: number;
  minCapRate?: number;
  maxCapRate?: number;
  minPrice?: number;
  maxPrice?: number;
  dateFrom?: string;
  dateTo?: string;
}