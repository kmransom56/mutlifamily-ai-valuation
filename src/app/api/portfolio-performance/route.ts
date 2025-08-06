import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

interface PropertyPerformance {
  property_id: string;
  property_name: string;
  acquisition_date: string;
  acquisition_price: number;
  current_value: number;
  units: number;
  location: string;
  property_class: 'A' | 'B' | 'C';
  
  // Financial Performance
  monthly_noi: number;
  annual_noi: number;
  gross_income: number;
  operating_expenses: number;
  cap_rate: number;
  cash_flow: number;
  cash_on_cash_return: number;
  irr: number;
  equity_multiple: number;
  
  // Operational Metrics
  occupancy_rate: number;
  avg_rent_per_unit: number;
  rent_growth_12m: number;
  expense_ratio: number;
  noi_growth_12m: number;
  
  // Market Position
  market_rent_premium: number;
  days_to_lease: number;
  tenant_retention_rate: number;
  property_age: number;
  
  // Value Creation
  appreciation: number;
  total_return: number;
  value_add_progress: number;
  capex_invested: number;
}

interface PortfolioAnalytics {
  performance_summary: {
    total_portfolio_value: number;
    total_acquisition_cost: number;
    total_appreciation: number;
    total_units: number;
    avg_portfolio_irr: number;
    avg_cash_on_cash: number;
    portfolio_cap_rate: number;
    total_monthly_noi: number;
    total_annual_noi: number;
    portfolio_occupancy: number;
    avg_rent_per_unit: number;
    expense_ratio: number;
  };
  
  risk_metrics: {
    portfolio_concentration: {
      geographic: Record<string, number>;
      property_class: Record<string, number>;
      vintage: Record<string, number>;
    };
    performance_volatility: number;
    correlation_to_market: number;
    liquidity_score: number;
    debt_service_coverage: number;
    loan_to_value: number;
  };
  
  benchmark_comparison: {
    ncreif_comparison: number;
    market_comparison: number;
    peer_group_ranking: number;
    alpha_generation: number;
  };
  
  trend_analysis: {
    noi_growth_trend: number[];
    occupancy_trend: number[];
    rent_growth_trend: number[];
    value_appreciation_trend: number[];
    periods: string[];
  };
  
  property_rankings: {
    best_performers: PropertyPerformance[];
    underperformers: PropertyPerformance[];
    value_add_opportunities: PropertyPerformance[];
    disposition_candidates: PropertyPerformance[];
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const portfolio_id = url.searchParams.get('portfolio_id') || 'main';
    const period = url.searchParams.get('period') || '12m';
    const metrics = url.searchParams.get('metrics')?.split(',') || ['all'];
    const benchmark = url.searchParams.get('benchmark') || 'ncreif';

    console.log(`Generating portfolio performance analytics for portfolio: ${portfolio_id}, period: ${period}`);

    // Generate comprehensive portfolio performance data
    const portfolioData = await generatePortfolioPerformanceData(portfolio_id, period, benchmark);

    // Generate Excel report if requested
    const includeExport = url.searchParams.get('export') === 'true';
    let downloadUrl = null;
    
    if (includeExport) {
      downloadUrl = await generatePortfolioExcelReport(portfolioData, portfolio_id);
    }

    return NextResponse.json({
      success: true,
      portfolio_analytics: portfolioData,
      analysis_period: period,
      benchmark: benchmark,
      properties_analyzed: portfolioData.performance_summary.total_units > 0 ? 
        Math.floor(portfolioData.performance_summary.total_units / 85) : 12, // Estimate properties from units
      generated_at: new Date().toISOString(),
      download_url: downloadUrl,
      key_insights: generateKeyInsights(portfolioData),
      recommendations: generatePortfolioRecommendations(portfolioData),
      next_review_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    });

  } catch (error) {
    console.error('Portfolio performance analysis error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Portfolio analysis failed' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      portfolio_id = 'main',
      properties = [],
      benchmark_settings = {},
      alert_thresholds = {},
      reporting_frequency = 'monthly'
    } = await request.json();

    // Set up portfolio monitoring and automated reporting
    const monitoringSetup = {
      portfolio_id,
      monitoring_id: `portfolio_${Date.now()}`,
      properties_tracked: properties.length,
      alert_thresholds: {
        min_irr: alert_thresholds.min_irr || 0.08,
        min_occupancy: alert_thresholds.min_occupancy || 0.90,
        max_expense_ratio: alert_thresholds.max_expense_ratio || 0.45,
        min_dscr: alert_thresholds.min_dscr || 1.25,
        ...alert_thresholds
      },
      benchmark_settings: {
        primary_benchmark: benchmark_settings.primary_benchmark || 'ncreif',
        custom_benchmarks: benchmark_settings.custom_benchmarks || [],
        peer_group: benchmark_settings.peer_group || 'institutional_multifamily'
      },
      reporting_schedule: {
        frequency: reporting_frequency,
        recipients: ['portfolio@multifamily-ai.com'],
        format: ['excel', 'pdf', 'dashboard'],
        next_report: new Date(Date.now() + getReportingInterval(reporting_frequency)).toISOString()
      },
      created_at: new Date().toISOString(),
      status: 'active'
    };

    return NextResponse.json({
      success: true,
      monitoring_setup: monitoringSetup,
      performance_dashboard_url: `/dashboard/portfolio/${portfolio_id}`,
      automated_reporting: {
        enabled: true,
        frequency: reporting_frequency,
        next_report: monitoringSetup.reporting_schedule.next_report
      },
      alert_system: {
        enabled: true,
        thresholds_configured: Object.keys(monitoringSetup.alert_thresholds).length,
        notification_channels: ['email', 'dashboard', 'api_webhook']
      }
    });

  } catch (error) {
    console.error('Portfolio monitoring setup error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Portfolio monitoring setup failed' 
      },
      { status: 500 }
    );
  }
}

async function generatePortfolioPerformanceData(portfolioId: string, period: string, benchmark: string): Promise<PortfolioAnalytics> {
  // Generate realistic portfolio data based on 12 institutional-quality properties
  const properties: PropertyPerformance[] = generatePropertyPerformanceData();
  
  // Aggregate portfolio-level metrics
  const totalValue = properties.reduce((sum, p) => sum + p.current_value, 0);
  const totalAcquisitionCost = properties.reduce((sum, p) => sum + p.acquisition_price, 0);
  const totalUnits = properties.reduce((sum, p) => sum + p.units, 0);
  const totalNOI = properties.reduce((sum, p) => sum + p.annual_noi, 0);
  const totalGrossIncome = properties.reduce((sum, p) => sum + p.gross_income, 0);
  const totalOpEx = properties.reduce((sum, p) => sum + p.operating_expenses, 0);
  
  // Weighted averages
  const portfolioIRR = properties.reduce((sum, p) => sum + p.irr * (p.current_value / totalValue), 0);
  const portfolioCashOnCash = properties.reduce((sum, p) => sum + p.cash_on_cash_return * (p.current_value / totalValue), 0);
  const portfolioOccupancy = properties.reduce((sum, p) => sum + p.occupancy_rate * (p.units / totalUnits), 0);
  
  // Geographic concentration analysis
  const locationCounts = properties.reduce((acc, p) => {
    const market = p.location.split(',').pop()?.trim() || 'Unknown';
    acc[market] = (acc[market] || 0) + p.current_value;
    return acc;
  }, {} as { [key: string]: number });
  
  const geoConcentration = Object.fromEntries(
    Object.entries(locationCounts).map(([market, value]) => [market, value / totalValue])
  );
  
  // Property class concentration
  const classCounts = properties.reduce((acc, p) => {
    acc[`Class ${p.property_class}`] = (acc[`Class ${p.property_class}`] || 0) + p.current_value;
    return acc;
  }, {} as { [key: string]: number });
  
  const classConcentration = Object.fromEntries(
    Object.entries(classCounts).map(([cls, value]) => [cls, value / totalValue])
  );
  
  // Performance rankings
  const sortedByIRR = [...properties].sort((a, b) => b.irr - a.irr);
  const sortedByCashFlow = [...properties].sort((a, b) => b.cash_on_cash_return - a.cash_on_cash_return);
  const valueAddOpportunities = properties.filter(p => p.value_add_progress < 0.8 && p.irr > 0.12);
  const underperformers = properties.filter(p => p.irr < 0.08 || p.occupancy_rate < 0.88);

  return {
    performance_summary: {
      total_portfolio_value: totalValue,
      total_acquisition_cost: totalAcquisitionCost,
      total_appreciation: totalValue - totalAcquisitionCost,
      total_units: totalUnits,
      avg_portfolio_irr: portfolioIRR,
      avg_cash_on_cash: portfolioCashOnCash,
      portfolio_cap_rate: totalNOI / totalValue,
      total_monthly_noi: totalNOI / 12,
      total_annual_noi: totalNOI,
      portfolio_occupancy: portfolioOccupancy,
      avg_rent_per_unit: totalGrossIncome / totalUnits / 12,
      expense_ratio: totalOpEx / totalGrossIncome
    },
    
    risk_metrics: {
      portfolio_concentration: {
        geographic: geoConcentration,
        property_class: classConcentration,
        vintage: {
          '2020-2025': 0.35,
          '2015-2019': 0.40,
          '2010-2014': 0.25
        }
      },
      performance_volatility: 0.125,
      correlation_to_market: 0.78,
      liquidity_score: 0.72,
      debt_service_coverage: 1.42,
      loan_to_value: 0.68
    },
    
    benchmark_comparison: {
      ncreif_comparison: benchmark === 'ncreif' ? 1.85 : 1.65, // Outperforming by 185bps
      market_comparison: 1.23, // 123bps above market
      peer_group_ranking: 0.15, // Top 15th percentile
      alpha_generation: 0.047 // 4.7% alpha
    },
    
    trend_analysis: {
      noi_growth_trend: [0.028, 0.032, 0.035, 0.041, 0.038, 0.034, 0.029, 0.031, 0.036, 0.039, 0.042, 0.045],
      occupancy_trend: [0.91, 0.92, 0.94, 0.95, 0.93, 0.94, 0.95, 0.96, 0.94, 0.95, 0.96, 0.94],
      rent_growth_trend: [0.025, 0.028, 0.032, 0.038, 0.035, 0.031, 0.027, 0.029, 0.033, 0.036, 0.039, 0.041],
      value_appreciation_trend: [0.08, 0.12, 0.15, 0.18, 0.16, 0.14, 0.11, 0.13, 0.17, 0.19, 0.21, 0.23],
      periods: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    },
    
    property_rankings: {
      best_performers: sortedByIRR.slice(0, 3),
      underperformers: underperformers,
      value_add_opportunities: valueAddOpportunities,
      disposition_candidates: properties.filter(p => p.irr < 0.06 || p.property_age > 35).slice(0, 2)
    }
  };
}

function generatePropertyPerformanceData(): PropertyPerformance[] {
  const markets = ['Austin, TX', 'Denver, CO', 'Seattle, WA', 'Dallas, TX', 'Atlanta, GA', 'Phoenix, AZ', 'Charlotte, NC', 'Tampa, FL', 'Nashville, TN', 'Raleigh, NC'];
  const propertyNames = [
    'Sunset Ridge Apartments', 'Highland Park Residences', 'Metro Commons', 'Oak Valley Estates',
    'Riverside Towers', 'Garden District Flats', 'Lakewood Village', 'Parkside Manor',
    'Summit Point Apartments', 'Greenway Residences', 'Copper Creek Commons', 'Hillside Terrace'
  ];
  
  return propertyNames.map((name, index) => {
    const units = 80 + Math.floor(Math.random() * 120); // 80-200 units
    const acquisitionPrice = 12000000 + Math.random() * 25000000; // $12M-$37M
    const currentValue = acquisitionPrice * (1.1 + Math.random() * 0.3); // 10-40% appreciation
    const annualNOI = currentValue * (0.045 + Math.random() * 0.025); // 4.5-7.0% cap rate
    const grossIncome = annualNOI / (0.6 + Math.random() * 0.15); // 60-75% NOI margin
    const operatingExpenses = grossIncome - annualNOI;
    const propertyClass: 'A' | 'B' | 'C' = Math.random() > 0.6 ? 'A' : Math.random() > 0.3 ? 'B' : 'C';
    const propertyAge = 5 + Math.floor(Math.random() * 25); // 5-30 years old
    const acquisitionDate = new Date(Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000); // Last 5 years
    
    // Financial calculations
    const equityInvested = acquisitionPrice * 0.25; // 25% equity
    const cashFlow = annualNOI - (acquisitionPrice * 0.75 * 0.055); // Debt service at 5.5%
    const appreciation = currentValue - acquisitionPrice;
    const totalReturn = appreciation + cashFlow * 3; // Approximate 3-year hold
    const irr = Math.pow(totalReturn / equityInvested + 1, 1/3) - 1; // 3-year IRR approximation
    
    return {
      property_id: `prop_${index + 1}`,
      property_name: name,
      acquisition_date: acquisitionDate.toISOString().split('T')[0],
      acquisition_price: Math.round(acquisitionPrice),
      current_value: Math.round(currentValue),
      units: units,
      location: markets[index % markets.length],
      property_class: propertyClass,
      
      monthly_noi: Math.round(annualNOI / 12),
      annual_noi: Math.round(annualNOI),
      gross_income: Math.round(grossIncome),
      operating_expenses: Math.round(operatingExpenses),
      cap_rate: annualNOI / currentValue,
      cash_flow: Math.round(cashFlow),
      cash_on_cash_return: cashFlow / equityInvested,
      irr: irr,
      equity_multiple: (currentValue * 0.25 + cashFlow * 3) / equityInvested,
      
      occupancy_rate: 0.88 + Math.random() * 0.10, // 88-98%
      avg_rent_per_unit: Math.round(grossIncome / units / 12),
      rent_growth_12m: 0.02 + Math.random() * 0.04, // 2-6% rent growth
      expense_ratio: operatingExpenses / grossIncome,
      noi_growth_12m: 0.025 + Math.random() * 0.035, // 2.5-6.0% NOI growth
      
      market_rent_premium: -0.05 + Math.random() * 0.15, // -5% to +10% vs market
      days_to_lease: 15 + Math.floor(Math.random() * 25), // 15-40 days
      tenant_retention_rate: 0.75 + Math.random() * 0.20, // 75-95%
      property_age: propertyAge,
      
      appreciation: appreciation,
      total_return: totalReturn / equityInvested,
      value_add_progress: Math.random(), // 0-100% complete
      capex_invested: acquisitionPrice * (0.02 + Math.random() * 0.08) // 2-10% of acquisition
    };
  });
}

async function generatePortfolioExcelReport(portfolioData: PortfolioAnalytics, portfolioId: string): Promise<string> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `portfolio_${portfolioId}_performance_${timestamp}.json`;
    
    const storage_dir = path.join(process.cwd(), 'storage', 'exports');
    if (!fs.existsSync(storage_dir)) {
      fs.mkdirSync(storage_dir, { recursive: true });
    }
    
    const report = {
      metadata: {
        report_type: 'Portfolio Performance Analysis',
        portfolio_id: portfolioId,
        generated_at: new Date().toISOString(),
        report_period: '12 months',
        benchmark: 'NCREIF Property Index'
      },
      executive_summary: {
        total_portfolio_value: portfolioData.performance_summary.total_portfolio_value,
        total_return: portfolioData.performance_summary.avg_portfolio_irr,
        properties_analyzed: portfolioData.property_rankings.best_performers.length + portfolioData.property_rankings.underperformers.length,
        key_metrics: {
          avg_irr: portfolioData.performance_summary.avg_portfolio_irr,
          portfolio_cap_rate: portfolioData.performance_summary.portfolio_cap_rate,
          occupancy: portfolioData.performance_summary.portfolio_occupancy,
          noi_total: portfolioData.performance_summary.total_annual_noi
        }
      },
      detailed_analytics: portfolioData
    };
    
    fs.writeFileSync(path.join(storage_dir, filename), JSON.stringify(report, null, 2));
    
    return `/api/download-pitch-deck/${encodeURIComponent(filename)}`;
    
  } catch (error) {
    console.warn('Portfolio Excel report generation failed, continuing without file:', error);
    return null;
  }
}

function generateKeyInsights(data: PortfolioAnalytics): string[] {
  const insights = [];
  
  // Performance insights
  if (data.performance_summary.avg_portfolio_irr > 0.12) {
    insights.push(`Strong portfolio performance with ${(data.performance_summary.avg_portfolio_irr * 100).toFixed(1)}% average IRR significantly outperforming market benchmarks`);
  }
  
  // Occupancy insights
  if (data.performance_summary.portfolio_occupancy > 0.94) {
    insights.push(`Excellent operational performance with ${(data.performance_summary.portfolio_occupancy * 100).toFixed(1)}% portfolio occupancy rate`);
  }
  
  // Concentration risk
  const maxGeoConcentration = Math.max(...Object.values(data.risk_metrics.portfolio_concentration.geographic));
  if (maxGeoConcentration > 0.4) {
    insights.push(`Geographic concentration risk identified - largest market represents ${(maxGeoConcentration * 100).toFixed(0)}% of portfolio value`);
  }
  
  // Benchmark performance
  if (data.benchmark_comparison.ncreif_comparison > 1.5) {
    insights.push(`Portfolio generating significant alpha with ${((data.benchmark_comparison.ncreif_comparison - 1) * 100).toFixed(0)}bps outperformance vs NCREIF index`);
  }
  
  // Value-add opportunities
  if (data.property_rankings.value_add_opportunities.length > 0) {
    insights.push(`${data.property_rankings.value_add_opportunities.length} properties identified with active value-add programs showing strong return potential`);
  }
  
  return insights;
}

function generatePortfolioRecommendations(data: PortfolioAnalytics): string[] {
  const recommendations = [];
  
  // Performance-based recommendations
  if (data.property_rankings.underperformers.length > 0) {
    recommendations.push(`Review and implement performance improvement plans for ${data.property_rankings.underperformers.length} underperforming assets`);
  }
  
  // Concentration recommendations
  const maxGeoConcentration = Math.max(...Object.values(data.risk_metrics.portfolio_concentration.geographic));
  if (maxGeoConcentration > 0.35) {
    recommendations.push('Consider geographic diversification to reduce concentration risk in single market');
  }
  
  // Capital allocation
  if (data.performance_summary.avg_cash_on_cash > 0.10) {
    recommendations.push('Strong cash generation supports potential for portfolio expansion or increased distributions');
  }
  
  // Disposition recommendations
  if (data.property_rankings.disposition_candidates.length > 0) {
    recommendations.push(`Evaluate disposition opportunities for ${data.property_rankings.disposition_candidates.length} mature assets to optimize portfolio composition`);
  }
  
  // Operational efficiency
  if (data.performance_summary.expense_ratio > 0.42) {
    recommendations.push('Implement operational efficiency initiatives to reduce expense ratio below 40% target');
  }
  
  return recommendations;
}

function getReportingInterval(frequency: string): number {
  switch (frequency) {
    case 'weekly': return 7 * 24 * 60 * 60 * 1000;
    case 'monthly': return 30 * 24 * 60 * 60 * 1000;
    case 'quarterly': return 90 * 24 * 60 * 60 * 1000;
    default: return 30 * 24 * 60 * 60 * 1000;
  }
}