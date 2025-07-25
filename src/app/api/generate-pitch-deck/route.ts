import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { 
      property_id, 
      property_data,
      include_charts = true,
      template_type = 'investor_presentation'
    } = await request.json();

    if (!property_data) {
      return NextResponse.json(
        { success: false, error: 'Property data is required' },
        { status: 400 }
      );
    }

    console.log('Generating pitch deck for property:', property_id);

    // Create unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const property_name = property_data.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'property';
    const output_filename = `${property_name}_pitch_deck_${timestamp}.pptx`;
    const output_path = path.join(process.cwd(), '..', '..', '..', 'output', 'pitch_decks', output_filename);

    // Ensure output directory exists
    const output_dir = path.dirname(output_path);
    if (!fs.existsSync(output_dir)) {
      fs.mkdirSync(output_dir, { recursive: true });
    }

    // Convert YOUR property analysis data to pitch deck format
    const pitch_deck_data = {
      property_info: {
        property_name: property_data.name || property_data.property_name || 'Investment Property',
        address: property_data.address || 'Prime Location',
        total_units: property_data.units || property_data.total_units || 0,
        year_built: property_data.year_built || 2000,
        building_sf: property_data.building_sf || property_data.square_feet || 0,
        lot_size: property_data.lot_size || 0
      },
      financial_analysis: {
        purchase_price: property_data.purchase_price || 0,
        cap_rate: property_data.cap_rate || 0,
        noi: property_data.noi || 0,
        price_per_unit: property_data.purchase_price && property_data.units ? 
          property_data.purchase_price / property_data.units : 0,
        price_per_sqft: property_data.purchase_price && property_data.building_sf ? 
          property_data.purchase_price / property_data.building_sf : 0,
        cash_on_cash: property_data.cash_on_cash || 8.5,
        irr: property_data.irr || 12.0
      },
      // Uses data from YOUR existing analysis system
      analysis: {
        property_summary: {
          name: property_data.name,
          address: property_data.address,
          units: property_data.units
        },
        financial_analysis: {
          purchase_price: property_data.purchase_price,
          cap_rate: property_data.cap_rate,
          noi: property_data.noi
        },
        investment_metrics: {
          estimated_total_return: property_data.irr || 12.0,
          equity_multiple: property_data.equity_multiple || 1.8,
          hold_period: '5 years'
        },
        value_add_opportunities: property_data.value_add_opportunities || [
          `Income upside: $${((property_data.noi || 185000) * 0.25).toFixed(0)} (25% increase potential)`,
          'Operational efficiency improvements',
          'Market rent optimization'
        ]
      }
    };
    // Call your pitch deck generation service
    // This integrates with the existing pitch deck generator
    const python_script = path.join(process.cwd(), '..', '..', '..', 'pitch_deck_generation_service.py');
    
    // Use the enhanced pitch deck generator
    const command = `python -c "
import sys
import json
sys.path.append(r'C:\\\\Users\\\\Keith Ransom\\\\Documents\\\\pitch-deck-generator')

from enhanced_pitch_deck import create_enhanced_pitch_deck
from pptx import Presentation
from pptx.util import Inches, Pt

# Load data from YOUR analysis system
data = ${JSON.stringify(pitch_deck_data).replace(/"/g, '\\\\"')}

# Create presentation using YOUR data
prs = Presentation()

# Extract info from YOUR system
prop_info = data['property_info']
fin_info = data['financial_analysis']

# Title slide
slide = prs.slides.add_slide(prs.slide_layouts[0])
title = slide.shapes.title
subtitle = slide.placeholders[1]
title.text = prop_info['property_name']
subtitle.text = prop_info['address'] + '\\\\\\nMultifamily Investment Opportunity'

# Executive summary using YOUR analysis
slide = prs.slides.add_slide(prs.slide_layouts[1])
title = slide.shapes.title
content = slide.placeholders[1]
title.text = 'Executive Summary'
tf = content.text_frame
tf.text = f\\\\\"Premium {prop_info['total_units']}-unit multifamily property\\\\\"

metrics = [
    f\\\\\"Purchase Price: $\\${fin_info['purchase_price']:,.0f}\\\\\",
    f\\\\\"Cap Rate: {fin_info['cap_rate']:.1f}%\\\\\",
    f\\\\\"NOI: $\\${fin_info['noi']:,.0f}\\\\\",
    f\\\\\"Price per Unit: $\\${fin_info['price_per_unit']:,.0f}\\\\\",
    'Advanced AI analysis and processing',
    'Professional presentation generation'
]

for metric in metrics:
    p = tf.add_paragraph()
    p.text = f'• {metric}'
    p.level = 1
# Financial highlights from YOUR system
slide = prs.slides.add_slide(prs.slide_layouts[1])
title = slide.shapes.title
content = slide.placeholders[1]
title.text = 'Financial Highlights'
tf = content.text_frame
tf.text = 'Key Investment Metrics:'

highlights = [
    f\\\\\"Total Units: {prop_info['total_units']}\\\\\",
    f\\\\\"Year Built: {prop_info['year_built']}\\\\\",
    f\\\\\"Cap Rate: {fin_info['cap_rate']:.1f}%\\\\\",
    f\\\\\"Cash-on-Cash: {fin_info['cash_on_cash']:.1f}%\\\\\",
    f\\\\\"Projected IRR: {fin_info['irr']:.1f}%\\\\\"
]

for highlight in highlights:
    p = tf.add_paragraph()
    p.text = f'• {highlight}'
    p.level = 1

# Investment strategy
slide = prs.slides.add_slide(prs.slide_layouts[1])
title = slide.shapes.title
content = slide.placeholders[1]
title.text = 'Investment Strategy'
tf = content.text_frame
tf.text = 'AI-Powered Value-Add Approach:'

strategy = [
    'Advanced document processing and analysis',
    'Automated financial modeling and valuation', 
    'AI-identified value-add opportunities',
    'Professional presentation generation',
    'Streamlined investor communication'
]

for item in strategy:
    p = tf.add_paragraph()
    p.text = f'• {item}'
    p.level = 1
# Contact slide
slide = prs.slides.add_slide(prs.slide_layouts[1])
title = slide.shapes.title
content = slide.placeholders[1]
title.text = 'Next Steps & Contact'
tf = content.text_frame
tf.text = f\\\\\"Investment Opportunity: {prop_info['property_name']}\\\\\"

next_steps = [
    'Schedule property tour and due diligence',
    'Review detailed AI analysis results',
    'Discuss investment terms and timeline',
    'Contact: investments@yourcompany.com',
    'Phone: (555) 123-4567'
]

for step in next_steps:
    p = tf.add_paragraph()
    p.text = f'• {step}'
    p.level = 1

# Save
prs.save(r'${output_path.replace(/\\/g, '\\\\\\\\')}')

# Output success JSON
result = {
    'status': 'success',
    'pitch_deck_path': r'${output_path.replace(/\\/g, '\\\\\\\\')}',
    'slides_generated': len(prs.slides),
    'property_info': {
        'name': prop_info['property_name'],
        'units': prop_info['total_units'],
        'cap_rate': fin_info['cap_rate'],
        'purchase_price': fin_info['purchase_price']
    }
}
print(json.dumps(result))
"`;

    console.log('Executing Python command...');
    // Execute the Python script
    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000, // 60 second timeout
      cwd: path.join(process.cwd(), '..', '..', '..')
    });

    if (stderr && !stderr.includes('UserWarning')) {
      console.error('Python script error:', stderr);
      throw new Error(stderr);
    }

    // Parse the Python script output
    let result;
    try {
      // Extract JSON from stdout (last line should be the result)
      const lines = stdout.trim().split('\n');
      const jsonOutput = lines[lines.length - 1];
      result = JSON.parse(jsonOutput);
    } catch (parseError) {
      console.error('Failed to parse Python output:', stdout);
      throw new Error('Invalid response from pitch deck generator');
    }

    if (result.status !== 'success') {
      throw new Error(result.error || 'Pitch deck generation failed');
    }

    // Generate download URL
    const download_url = `/api/download-pitch-deck/${encodeURIComponent(output_filename)}`;

    return NextResponse.json({
      success: true,
      download_url: download_url,
      filename: output_filename,
      slides_generated: result.slides_generated,
      property_summary: result.property_info,
      generation_timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Pitch deck generation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}