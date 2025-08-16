import { 
  calculateCapRate, 
  calculateCashOnCashReturn, 
  calculateNOI, 
  calculateDSCR,
  calculateLTV,
  calculateBreakEvenOccupancy,
  calculateViabilityScore,
  calculateDebtService,
  analyzeProperty,
  type FinancialInputs 
} from '../financial-calculations';

describe('Financial Calculations', () => {
  const mockFinancialInputs: FinancialInputs = {
    purchasePrice: 1000000,
    grossIncome: 120000,
    operatingExpenses: 45000,
    vacancy: 0.05,
    loanAmount: 750000,
    interestRate: 0.05,
    loanTerm: 30,
    cashInvested: 250000,
    appreciationRate: 0.03,
    rentGrowthRate: 0.03,
    expenseGrowthRate: 0.03,
    holdingPeriod: 10,
    capRateAtSale: 0.06,
  };

  describe('calculateNOI', () => {
    it('should calculate NOI correctly', () => {
      const result = calculateNOI(mockFinancialInputs.grossIncome, mockFinancialInputs.operatingExpenses, mockFinancialInputs.vacancy * 100);
      // Expected: 120000 * (1 - 5/100) - 45000 = 114000 - 45000 = 69000
      expect(result).toBe(69000);
    });

    it('should handle zero income', () => {
      const result = calculateNOI(0, mockFinancialInputs.operatingExpenses, mockFinancialInputs.vacancy * 100);
      expect(result).toBe(-45000);
    });

    it('should handle 100% vacancy', () => {
      const result = calculateNOI(mockFinancialInputs.grossIncome, mockFinancialInputs.operatingExpenses, 100);
      expect(result).toBe(-45000);
    });
  });

  describe('calculateCapRate', () => {
    it('should calculate cap rate correctly', () => {
      const noi = calculateNOI(mockFinancialInputs.grossIncome, mockFinancialInputs.operatingExpenses, mockFinancialInputs.vacancy * 100);
      const result = calculateCapRate(noi, mockFinancialInputs.purchasePrice);
      // Expected: 69000 / 1000000 = 0.069 = 6.9%
      expect(result).toBeCloseTo(6.9, 1);
    });

    it('should return 0 for zero purchase price', () => {
      const result = calculateCapRate(69000, 0);
      expect(result).toBe(0);
    });

    it('should handle negative NOI', () => {
      const result = calculateCapRate(-10000, 1000000);
      expect(result).toBe(-1);
    });
  });

  describe('calculateCashOnCashReturn', () => {
    it('should calculate cash-on-cash return correctly', () => {
      // Mock annual cash flow calculation
      const annualCashFlow = 15000; // This would come from the full calculation
      const result = calculateCashOnCashReturn(annualCashFlow, mockFinancialInputs.cashInvested);
      // Expected: 15000 / 250000 = 0.06 = 6%
      expect(result).toBeCloseTo(6, 1);
    });

    it('should return 0 for zero cash invested', () => {
      const result = calculateCashOnCashReturn(15000, 0);
      expect(result).toBe(0);
    });
  });

  describe('calculateDSCR', () => {
    it('should calculate DSCR correctly', () => {
      const noi = calculateNOI(mockFinancialInputs.grossIncome, mockFinancialInputs.operatingExpenses, mockFinancialInputs.vacancy * 100);
      const annualDebtService = 48000; // Mock debt service
      const result = calculateDSCR(noi, annualDebtService);
      // Expected: 69000 / 48000 = 1.4375
      expect(result).toBeCloseTo(1.44, 2);
    });

    it('should return 0 for zero debt service', () => {
      const result = calculateDSCR(69000, 0);
      expect(result).toBe(0);
    });
  });

  describe('calculateLTV', () => {
    it('should calculate LTV correctly', () => {
      const result = calculateLTV(mockFinancialInputs.loanAmount, mockFinancialInputs.purchasePrice);
      // Expected: 750000 / 1000000 = 0.75 = 75%
      expect(result).toBe(75);
    });

    it('should return 0 for zero property value', () => {
      const result = calculateLTV(750000, 0);
      expect(result).toBe(0);
    });
  });

  describe('calculateBreakEvenOccupancy', () => {
    it('should calculate break-even occupancy correctly', () => {
      const annualDebtService = 48000; // Mock debt service
      const result = calculateBreakEvenOccupancy(
        mockFinancialInputs.operatingExpenses, 
        annualDebtService, 
        mockFinancialInputs.grossIncome
      );
      // Expected: (45000 + 48000) / 120000 = 0.775 = 77.5%
      expect(result).toBeCloseTo(77.5, 1);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100);
    });
  });

  describe('calculateViabilityScore', () => {
    it('should calculate viability score within valid range', () => {
      const result = calculateViabilityScore(6.9, 6.0, 12.5, 1.44, 75, 2.0);
      
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should return higher score for better metrics', () => {
      const goodMetrics = calculateViabilityScore(8.0, 10.0, 15.0, 1.8, 70, 2.5);
      const poorMetrics = calculateViabilityScore(4.0, 3.0, 8.0, 1.1, 90, 1.2);

      expect(goodMetrics).toBeGreaterThan(poorMetrics);
    });
  });

  describe('Edge Cases', () => {
    it('should handle extremely large numbers', () => {
      const grossIncome = 1e8;   // $100 million
      const purchasePrice = 1e9; // $1 billion
      const operatingExpenses = 1e7; // $10 million
      
      const noi = calculateNOI(grossIncome, operatingExpenses, 5);
      const capRate = calculateCapRate(noi, purchasePrice);
      
      expect(noi).toBeFinite();
      expect(capRate).toBeFinite();
    });

    it('should handle very small numbers', () => {
      const grossIncome = 120;
      const purchasePrice = 1000;
      const operatingExpenses = 45;
      
      const noi = calculateNOI(grossIncome, operatingExpenses, 5);
      const capRate = calculateCapRate(noi, purchasePrice);
      
      expect(noi).toBeFinite();
      expect(capRate).toBeFinite();
    });
  });

  describe('analyzeProperty', () => {
    it('should return comprehensive analysis', () => {
      const result = analyzeProperty(mockFinancialInputs);
      
      expect(result).toHaveProperty('noi');
      expect(result).toHaveProperty('capRate');
      expect(result).toHaveProperty('cashOnCashReturn');
      expect(result).toHaveProperty('irr');
      expect(result).toHaveProperty('equityMultiple');
      expect(result).toHaveProperty('dscr');
      expect(result).toHaveProperty('ltv');
      expect(result).toHaveProperty('breakEvenOccupancy');
      expect(result).toHaveProperty('viabilityScore');
      expect(result).toHaveProperty('viabilityRating');
      expect(result).toHaveProperty('projections');
      
      expect(Array.isArray(result.projections)).toBe(true);
      expect(result.projections.length).toBe(mockFinancialInputs.holdingPeriod);
    });
  });
});