import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const { property_id, property_data, formats = ['json', 'excel', 'csv'] } = await request.json();

    if (!property_data) {
      return NextResponse.json(
        { success: false, error: 'Property data is required' },
        { status: 400 }
      );
    }

    console.log('Exporting property data for property:', property_id);

    // Create unique base filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const property_name = property_data.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'property';
    const base_filename = `${property_name}_export_${timestamp}`;
    
    // Use storage directory
    const storage_dir = path.join(process.cwd(), 'storage', 'exports');
    if (!fs.existsSync(storage_dir)) {
      fs.mkdirSync(storage_dir, { recursive: true });
    }

    const downloads: any = {};

    // Prepare comprehensive property data
    const exportData = {
      property_information: {
        id: property_data.id,
        name: property_data.name,
        location: property_data.location,
        type: property_data.type,
        units: property_data.units,
        status: property_data.status,
        viability_score: property_data.viabilityScore,
        date_created: property_data.dateCreated,
        date_analyzed: property_data.dateAnalyzed,
        notes: property_data.notes
      },
      financial_metrics: {
        asking_price: property_data.askingPrice,
        gross_income: property_data.grossIncome,
        operating_expenses: property_data.operatingExpenses,
        net_operating_income: property_data.noi,
        cap_rate: property_data.capRate,
        cash_on_cash_return: property_data.cashOnCashReturn,
        internal_rate_return: property_data.irr,
        equity_multiple: property_data.equityMultiple,
        debt_service_coverage_ratio: property_data.dscr,
        loan_to_value_ratio: property_data.ltv,
        price_per_unit: property_data.pricePerUnit
      },
      calculated_metrics: {
        price_per_unit: property_data.askingPrice && property_data.units ? 
          (property_data.askingPrice / property_data.units) : null,
        income_per_unit: property_data.grossIncome && property_data.units ? 
          (property_data.grossIncome / property_data.units) : null,
        noi_per_unit: property_data.noi && property_data.units ? 
          (property_data.noi / property_data.units) : null,
        cap_rate_calculated: property_data.noi && property_data.askingPrice ? 
          ((property_data.noi / property_data.askingPrice) * 100) : null
      },
      files: property_data.files || [],
      investment_strategy: property_data.investmentStrategy || '',
      export_metadata: {
        exported_at: new Date().toISOString(),
        exported_by: 'Multifamily AI Platform',
        export_version: '1.0'
      }
    };

    // Generate JSON export
    if (formats.includes('json')) {
      const json_filename = `${base_filename}.json`;
      const json_path = path.join(storage_dir, json_filename);
      fs.writeFileSync(json_path, JSON.stringify(exportData, null, 2));
      
      downloads.json = {
        url: `/api/download-pitch-deck/${encodeURIComponent(json_filename)}`,
        filename: json_filename,
        format: 'JSON'
      };
    }

    // Generate Excel export
    if (formats.includes('excel')) {
      const excel_filename = `${base_filename}.xlsx`;
      const excel_path = path.join(storage_dir, excel_filename);
      
      const workbook = XLSX.utils.book_new();
      
      // Property Information Sheet
      const propertyInfoData = [
        ['Property Information'],
        [''],
        ['Field', 'Value'],
        ['ID', exportData.property_information.id],
        ['Name', exportData.property_information.name],
        ['Location', exportData.property_information.location],
        ['Type', exportData.property_information.type],
        ['Units', exportData.property_information.units],
        ['Status', exportData.property_information.status],
        ['Viability Score', exportData.property_information.viability_score],
        ['Date Created', exportData.property_information.date_created],
        ['Date Analyzed', exportData.property_information.date_analyzed],
        ['Notes', exportData.property_information.notes]
      ];
      const propertyWS = XLSX.utils.aoa_to_sheet(propertyInfoData);
      XLSX.utils.book_append_sheet(workbook, propertyWS, 'Property Info');
      
      // Financial Metrics Sheet
      const financialData = [
        ['Financial Metrics'],
        [''],
        ['Metric', 'Value', 'Formatted'],
        ['Asking Price', exportData.financial_metrics.asking_price, exportData.financial_metrics.asking_price ? `$${exportData.financial_metrics.asking_price.toLocaleString()}` : ''],
        ['Gross Income', exportData.financial_metrics.gross_income, exportData.financial_metrics.gross_income ? `$${exportData.financial_metrics.gross_income.toLocaleString()}` : ''],
        ['Operating Expenses', exportData.financial_metrics.operating_expenses, exportData.financial_metrics.operating_expenses ? `$${exportData.financial_metrics.operating_expenses.toLocaleString()}` : ''],
        ['Net Operating Income', exportData.financial_metrics.net_operating_income, exportData.financial_metrics.net_operating_income ? `$${exportData.financial_metrics.net_operating_income.toLocaleString()}` : ''],
        ['Cap Rate', exportData.financial_metrics.cap_rate, exportData.financial_metrics.cap_rate ? `${exportData.financial_metrics.cap_rate.toFixed(2)}%` : ''],
        ['Cash-on-Cash Return', exportData.financial_metrics.cash_on_cash_return, exportData.financial_metrics.cash_on_cash_return ? `${exportData.financial_metrics.cash_on_cash_return.toFixed(2)}%` : ''],
        ['Internal Rate of Return', exportData.financial_metrics.internal_rate_return, exportData.financial_metrics.internal_rate_return ? `${exportData.financial_metrics.internal_rate_return.toFixed(2)}%` : ''],
        ['Equity Multiple', exportData.financial_metrics.equity_multiple, exportData.financial_metrics.equity_multiple ? `${exportData.financial_metrics.equity_multiple.toFixed(2)}x` : ''],
        ['DSCR', exportData.financial_metrics.debt_service_coverage_ratio, exportData.financial_metrics.debt_service_coverage_ratio ? exportData.financial_metrics.debt_service_coverage_ratio.toFixed(2) : ''],
        ['LTV', exportData.financial_metrics.loan_to_value_ratio, exportData.financial_metrics.loan_to_value_ratio ? `${exportData.financial_metrics.loan_to_value_ratio}%` : '']
      ];
      const financialWS = XLSX.utils.aoa_to_sheet(financialData);
      XLSX.utils.book_append_sheet(workbook, financialWS, 'Financial Metrics');
      
      // Calculated Metrics Sheet
      const calculatedData = [
        ['Calculated Metrics'],
        [''],
        ['Metric', 'Value', 'Formatted'],
        ['Price per Unit', exportData.calculated_metrics.price_per_unit, exportData.calculated_metrics.price_per_unit ? `$${Math.round(exportData.calculated_metrics.price_per_unit).toLocaleString()}` : ''],
        ['Income per Unit', exportData.calculated_metrics.income_per_unit, exportData.calculated_metrics.income_per_unit ? `$${Math.round(exportData.calculated_metrics.income_per_unit).toLocaleString()}` : ''],
        ['NOI per Unit', exportData.calculated_metrics.noi_per_unit, exportData.calculated_metrics.noi_per_unit ? `$${Math.round(exportData.calculated_metrics.noi_per_unit).toLocaleString()}` : ''],
        ['Calculated Cap Rate', exportData.calculated_metrics.cap_rate_calculated, exportData.calculated_metrics.cap_rate_calculated ? `${exportData.calculated_metrics.cap_rate_calculated.toFixed(2)}%` : '']
      ];
      const calculatedWS = XLSX.utils.aoa_to_sheet(calculatedData);
      XLSX.utils.book_append_sheet(workbook, calculatedWS, 'Calculated Metrics');
      
      XLSX.writeFile(workbook, excel_path);
      
      downloads.excel = {
        url: `/api/download-pitch-deck/${encodeURIComponent(excel_filename)}`,
        filename: excel_filename,
        format: 'Excel'
      };
    }

    // Generate CSV export
    if (formats.includes('csv')) {
      const csv_filename = `${base_filename}.csv`;
      const csv_path = path.join(storage_dir, csv_filename);
      
      // Create CSV data combining all metrics
      const csvData = [
        ['Field', 'Category', 'Value'],
        // Property Information
        ['Property ID', 'Property Info', exportData.property_information.id],
        ['Property Name', 'Property Info', exportData.property_information.name],
        ['Location', 'Property Info', exportData.property_information.location],
        ['Type', 'Property Info', exportData.property_information.type],
        ['Units', 'Property Info', exportData.property_information.units],
        ['Status', 'Property Info', exportData.property_information.status],
        ['Viability Score', 'Property Info', exportData.property_information.viability_score],
        // Financial Metrics
        ['Asking Price', 'Financial', exportData.financial_metrics.asking_price],
        ['Gross Income', 'Financial', exportData.financial_metrics.gross_income],
        ['Operating Expenses', 'Financial', exportData.financial_metrics.operating_expenses],
        ['Net Operating Income', 'Financial', exportData.financial_metrics.net_operating_income],
        ['Cap Rate', 'Financial', exportData.financial_metrics.cap_rate],
        ['Cash-on-Cash Return', 'Financial', exportData.financial_metrics.cash_on_cash_return],
        ['IRR', 'Financial', exportData.financial_metrics.internal_rate_return],
        ['Equity Multiple', 'Financial', exportData.financial_metrics.equity_multiple],
        // Calculated Metrics
        ['Price per Unit', 'Calculated', exportData.calculated_metrics.price_per_unit],
        ['Income per Unit', 'Calculated', exportData.calculated_metrics.income_per_unit],
        ['NOI per Unit', 'Calculated', exportData.calculated_metrics.noi_per_unit],
        ['Calculated Cap Rate', 'Calculated', exportData.calculated_metrics.cap_rate_calculated]
      ];
      
      const csvContent = csvData.map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
      fs.writeFileSync(csv_path, csvContent);
      
      downloads.csv = {
        url: `/api/download-pitch-deck/${encodeURIComponent(csv_filename)}`,
        filename: csv_filename,
        format: 'CSV'
      };
    }

    return NextResponse.json({
      success: true,
      downloads: downloads,
      property_summary: {
        name: property_data.name,
        units: property_data.units,
        formats_generated: Object.keys(downloads)
      },
      generation_timestamp: new Date().toISOString(),
      note: 'Property data exported in requested formats'
    });

  } catch (error) {
    console.error('Property data export error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}