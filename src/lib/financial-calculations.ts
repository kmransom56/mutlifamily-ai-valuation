// Financial calculation utilities for real estate analysis
import { FinancialProjection } from '@/types/property';

export interface FinancialInputs {
  purchasePrice: number;
  grossIncome: number;
  operatingExpenses: number;
  vacancy: number;
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
  cashInvested: number;
  appreciationRate: number;
  rentGrowthRate: number;
  expenseGrowthRate: number;
  holdingPeriod: number;
  capRateAtSale: number;
  askingPrice?: number;
  noi?: number;
  capRate?: number;
  cashOnCashReturn?: number;
  irr?: number;
  dscr?: number;
  ltv?: number;
}

export interface CalculationResults {
  noi: number;
  capRate: number;
  cashOnCashReturn: number;
  irr: number;
  equityMultiple: number;
  dscr: number;
  ltv: number;
  breakEvenOccupancy: number;
  viabilityScore: number;
  viabilityRating: string;
  projections: FinancialProjection[];
}

// Calculate Net Operating Income
export function calculateNOI(grossIncome: number, operatingExpenses: number, vacancy: number): number {
  const effectiveGrossIncome = grossIncome * (1 - vacancy / 100);
  return effectiveGrossIncome - operatingExpenses;
}

// Calculate Cap Rate
export function calculateCapRate(noi: number, purchasePrice: number): number {
  if (purchasePrice === 0) return 0;
  return (noi / purchasePrice) * 100;
}

// Calculate Cash-on-Cash Return
export function calculateCashOnCashReturn(annualCashFlow: number, cashInvested: number): number {
  if (cashInvested === 0) return 0;
  return (annualCashFlow / cashInvested) * 100;
}

// Calculate monthly debt service payment
export function calculateDebtService(loanAmount: number, interestRate: number, loanTerm: number): number {
  if (loanAmount === 0 || interestRate === 0) return 0;
  
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTerm * 12;
  
  return loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
         (Math.pow(1 + monthlyRate, numPayments) - 1);
}

// Calculate Debt Service Coverage Ratio
export function calculateDSCR(noi: number, annualDebtService: number): number {
  if (annualDebtService === 0) return 0;
  return noi / annualDebtService;
}

// Calculate Loan-to-Value Ratio
export function calculateLTV(loanAmount: number, purchasePrice: number): number {
  if (purchasePrice === 0) return 0;
  return (loanAmount / purchasePrice) * 100;
}

// Calculate Break-even Occupancy
export function calculateBreakEvenOccupancy(
  operatingExpenses: number, 
  annualDebtService: number, 
  grossPotentialIncome: number
): number {
  if (grossPotentialIncome === 0) return 0;
  return ((operatingExpenses + annualDebtService) / grossPotentialIncome) * 100;
}

// Calculate IRR using Newton-Raphson method
export function calculateIRR(cashFlows: number[], initialGuess: number = 0.1): number {
  let rate = initialGuess;
  const tolerance = 1e-7;
  const maxIterations = 100;
  
  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let npvDerivative = 0;
    
    for (let j = 0; j < cashFlows.length; j++) {
      const factor = Math.pow(1 + rate, j);
      npv += cashFlows[j] / factor;
      npvDerivative -= (j * cashFlows[j]) / (factor * (1 + rate));
    }
    
    if (Math.abs(npv) < tolerance) {
      return rate * 100; // Return as percentage
    }
    
    if (Math.abs(npvDerivative) < tolerance) {
      break; // Avoid division by zero
    }
    
    rate = rate - npv / npvDerivative;
  }
  
  return rate * 100; // Return as percentage
}

// Calculate Equity Multiple
export function calculateEquityMultiple(totalCashReturned: number, cashInvested: number): number {
  if (cashInvested === 0) return 0;
  return totalCashReturned / cashInvested;
}

// Generate financial projections
export function generateProjections(inputs: FinancialInputs): FinancialProjection[] {
  const projections: FinancialProjection[] = [];
  const monthlyDebtService = calculateDebtService(inputs.loanAmount, inputs.interestRate, inputs.loanTerm);
  const annualDebtService = monthlyDebtService * 12;
  
  for (let year = 1; year <= inputs.holdingPeriod; year++) {
    const grossIncome = inputs.grossIncome * Math.pow(1 + inputs.rentGrowthRate / 100, year - 1);
    const operatingExpenses = inputs.operatingExpenses * Math.pow(1 + inputs.expenseGrowthRate / 100, year - 1);
    const effectiveGrossIncome = grossIncome * (1 - inputs.vacancy / 100);
    const noi = effectiveGrossIncome - operatingExpenses;
    const cashFlow = noi - annualDebtService;
    const propertyValue = inputs.purchasePrice * Math.pow(1 + inputs.appreciationRate / 100, year);
    
    const previousCumulative = year === 1 ? 0 : projections[year - 2].cumulativeCashFlow;
    const cumulativeCashFlow = previousCumulative + cashFlow;
    
    projections.push({
      year,
      grossIncome,
      operatingExpenses,
      noi,
      debtService: annualDebtService,
      cashFlow,
      propertyValue,
      cumulativeCashFlow
    });
  }
  
  return projections;
}

// Calculate property viability score (0-100)
export function calculateViabilityScore(
  capRate: number,
  cashOnCashReturn: number,
  irr: number,
  dscr: number,
  ltv: number,
  equityMultiple: number
): number {
  // Scoring weights
  const weights = {
    capRate: 0.15,
    cashOnCashReturn: 0.20,
    irr: 0.25,
    dscr: 0.15,
    ltv: 0.10,
    equityMultiple: 0.15
  };
  
  // Score each metric (0-100)
  const capRateScore = Math.min(100, Math.max(0, (capRate / 8) * 100)); // 8% cap rate = 100 points
  const cocScore = Math.min(100, Math.max(0, (cashOnCashReturn / 12) * 100)); // 12% CoC = 100 points
  const irrScore = Math.min(100, Math.max(0, (irr / 15) * 100)); // 15% IRR = 100 points
  const dscrScore = Math.min(100, Math.max(0, ((dscr - 1) / 0.5) * 100)); // 1.5 DSCR = 100 points
  const ltvScore = Math.min(100, Math.max(0, ((80 - ltv) / 20) * 100)); // 60% LTV = 100 points
  const emScore = Math.min(100, Math.max(0, ((equityMultiple - 1) / 1) * 100)); // 2x EM = 100 points
  
  const totalScore = 
    capRateScore * weights.capRate +
    cocScore * weights.cashOnCashReturn +
    irrScore * weights.irr +
    dscrScore * weights.dscr +
    ltvScore * weights.ltv +
    emScore * weights.equityMultiple;
    
  return Math.round(totalScore);
}

// Get viability rating based on score
export function getViabilityRating(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Very Good';
  if (score >= 55) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 25) return 'Marginal';
  return 'Poor';
}

// Comprehensive property analysis
export function analyzeProperty(inputs: FinancialInputs): CalculationResults {
  const noi = calculateNOI(inputs.grossIncome, inputs.operatingExpenses, inputs.vacancy);
  const capRate = calculateCapRate(noi, inputs.purchasePrice);
  const monthlyDebtService = calculateDebtService(inputs.loanAmount, inputs.interestRate, inputs.loanTerm);
  const annualDebtService = monthlyDebtService * 12;
  const annualCashFlow = noi - annualDebtService;
  const cashOnCashReturn = calculateCashOnCashReturn(annualCashFlow, inputs.cashInvested);
  const dscr = calculateDSCR(noi, annualDebtService);
  const ltv = calculateLTV(inputs.loanAmount, inputs.purchasePrice);
  const breakEvenOccupancy = calculateBreakEvenOccupancy(inputs.operatingExpenses, annualDebtService, inputs.grossIncome);
  
  const projections = generateProjections(inputs);
  
  // Calculate IRR from cash flows
  const cashFlows = [-inputs.cashInvested]; // Initial investment (negative)
  projections.forEach(proj => cashFlows.push(proj.cashFlow));
  
  // Add sale proceeds to final year
  if (projections.length > 0) {
    const finalYear = projections[projections.length - 1];
    const salePrice = finalYear.propertyValue;
    const remainingLoanBalance = inputs.loanAmount; // Simplified - should calculate actual balance
    const saleProceeds = salePrice - remainingLoanBalance;
    cashFlows[cashFlows.length - 1] += saleProceeds;
  }
  
  const irr = calculateIRR(cashFlows);
  const totalCashReturned = cashFlows.slice(1).reduce((sum, cf) => sum + cf, 0);
  const equityMultiple = calculateEquityMultiple(totalCashReturned, inputs.cashInvested);
  
  const viabilityScore = calculateViabilityScore(capRate, cashOnCashReturn, irr, dscr, ltv, equityMultiple);
  const viabilityRating = getViabilityRating(viabilityScore);
  
  return {
    noi,
    capRate,
    cashOnCashReturn,
    irr,
    equityMultiple,
    dscr,
    ltv,
    breakEvenOccupancy,
    viabilityScore,
    viabilityRating,
    projections
  };
}