import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { propertyDatabase } from '@/lib/property-database';
import { analyzeProperty, FinancialInputs } from '@/lib/financial-calculations';
import { PropertyAnalysis } from '@/types/property';

// GET /api/properties/[id]/analysis - Get property analysis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const analysis = await propertyDatabase.getAnalysis(id);
    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Analysis GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}

// POST /api/properties/[id]/analysis - Create/update property analysis
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const financialInputs: FinancialInputs = body;

    // Validate required financial inputs
    if (!financialInputs.purchasePrice || !financialInputs.grossIncome || !financialInputs.operatingExpenses) {
      return NextResponse.json(
        { error: 'Missing required financial data: purchasePrice, grossIncome, operatingExpenses' },
        { status: 400 }
      );
    }

    // Verify property exists
    const property = await propertyDatabase.getProperty(id);
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Run financial analysis
    const analysisResults = analyzeProperty(financialInputs);

    // Create analysis record
    const analysisData: Omit<PropertyAnalysis, 'id' | 'createdAt'> = {
      propertyId: id,
      sessionId: `session_${Date.now()}`, // In production, use proper session tracking
      
      // Financial Metrics
      purchasePrice: financialInputs.purchasePrice,
      grossIncome: financialInputs.grossIncome,
      operatingExpenses: financialInputs.operatingExpenses,
      noi: analysisResults.noi,
      capRate: analysisResults.capRate,
      
      // Financing
      loanAmount: financialInputs.loanAmount,
      interestRate: financialInputs.interestRate,
      loanTerm: financialInputs.loanTerm,
      debtService: analysisResults.noi - analysisResults.projections[0]?.cashFlow || 0,
      cashInvested: financialInputs.cashInvested,
      
      // Returns
      cashOnCashReturn: analysisResults.cashOnCashReturn,
      irr: analysisResults.irr,
      equityMultiple: analysisResults.equityMultiple,
      dscr: analysisResults.dscr,
      ltv: analysisResults.ltv,
      
      // Projections
      projections: analysisResults.projections,
      
      // Viability
      viabilityScore: analysisResults.viabilityScore,
      viabilityRating: analysisResults.viabilityRating as PropertyAnalysis['viabilityRating'],
      
      // Risk Factors (mock data - in production, this would be AI-generated)
      riskFactors: [
        'Market saturation in local area',
        'Rising interest rates may affect refinancing',
        'Potential regulatory changes'
      ],
      opportunities: [
        'Value-add through renovations',
        'Below-market rents with upside potential',
        'Strong local job growth'
      ],
      
      // Market Data (mock data - in production, fetch from market data API)
      marketData: {
        averageCapRate: 6.5,
        marketRentGrowth: 3.2,
        occupancyRate: 94.5,
        medianPrice: financialInputs.purchasePrice * 0.9,
      },
    };

    const savedAnalysis = await propertyDatabase.saveAnalysis(analysisData);

    return NextResponse.json({ 
      analysis: savedAnalysis,
      results: analysisResults 
    }, { status: 201 });
  } catch (error) {
    console.error('Analysis creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create analysis' },
      { status: 500 }
    );
  }
}
