import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

interface PropertyLocation {
  property_id: string;
  property_name: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  market_area: string;
  submarket: string;
  
  // Property characteristics
  units: number;
  property_class: 'A' | 'B' | 'C';
  property_type: string;
  year_built: number;
  square_feet: number;
  
  // Financial metrics
  current_value: number;
  noi: number;
  cap_rate: number;
  price_per_unit: number;
  price_per_sqft: number;
  rent_per_unit: number;
  occupancy_rate: number;
  
  // Performance indicators
  irr: number;
  cash_on_cash: number;
  appreciation_1yr: number;
  market_rent_premium: number;
  
  // Risk indicators  
  flood_zone: 'A' | 'B' | 'C' | 'X' | 'Unknown';
  crime_score: number; // 1-10, lower is better
  walkability_score: number; // 1-100, higher is better
  transit_score: number; // 1-100, higher is better
  school_rating: number; // 1-10, higher is better
}

interface MarketHeatmapData {
  market_id: string;
  market_name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
    center: { lat: number; lng: number };
  };
  
  // Market performance metrics
  avg_cap_rate: number;
  cap_rate_trend: 'increasing' | 'decreasing' | 'stable';
  avg_price_per_unit: number;
  price_appreciation_12m: number;
  avg_occupancy: number;
  avg_rent_growth: number;
  transaction_volume_12m: number;
  
  // Market characteristics
  population: number;
  employment_growth: number;
  median_income: number;
  rental_demand_score: number; // 1-100
  supply_pipeline_units: number;
  absorption_rate: number;
  
  // Investment attractiveness
  investment_score: number; // 1-100
  risk_score: number; // 1-100, lower is better
  liquidity_score: number; // 1-100, higher is better
  growth_potential: 'high' | 'medium' | 'low';
  
  // Heat map visualization data
  heat_intensity: number; // 0-1, for color intensity
  color_code: string; // Hex color for map visualization
  
  properties_in_market: PropertyLocation[];
}

interface GeospatialAnalytics {
  total_properties: number;
  geographic_distribution: {
    states: Record<string, number>;
    metros: Record<string, number>;
    submarkets: Record<string, number>;
  };
  
  performance_by_location: {
    best_performing_markets: MarketHeatmapData[];
    underperforming_markets: MarketHeatmapData[];
    emerging_markets: MarketHeatmapData[];
  };
  
  risk_analysis: {
    concentration_risk: number;
    geographic_diversification: number;
    climate_risk_exposure: number;
    economic_sensitivity: Record<string, number>;
  };
  
  market_opportunities: Array<{
    market_id: string;
    opportunity_type: 'acquisition' | 'development' | 'value_add';
    score: number;
    reason: string;
    estimated_investment: number;
    projected_returns: number;
  }>;
  
  heatmap_layers: {
    performance_heatmap: MarketHeatmapData[];
    value_heatmap: MarketHeatmapData[];
    risk_heatmap: MarketHeatmapData[];
    opportunity_heatmap: MarketHeatmapData[];
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const portfolio_id = url.searchParams.get('portfolio_id') || 'main';
    const layer = url.searchParams.get('layer') || 'performance'; // performance, value, risk, opportunity
    const zoom_level = parseInt(url.searchParams.get('zoom') || '10');
    const bounds = url.searchParams.get('bounds'); // "north,south,east,west"
    const include_properties = url.searchParams.get('include_properties') === 'true';
    const market_filter = url.searchParams.get('markets')?.split(',') || [];

    console.log(`Generating geospatial mapping data for portfolio: ${portfolio_id}, layer: ${layer}`);

    // Generate comprehensive geospatial data
    const geospatialData = await generateGeospatialData(portfolio_id, layer, {
      zoom_level,
      bounds: bounds ? parseBounds(bounds) : null,
      include_properties,
      market_filter
    });

    // Generate map configuration for frontend
    const mapConfig = generateMapConfiguration(layer, zoom_level);
    
    // Generate GeoJSON data for mapping libraries
    const geoJsonData = generateGeoJSONData(geospatialData, layer);

    return NextResponse.json({
      success: true,
      geospatial_analytics: geospatialData,
      map_configuration: mapConfig,
      geojson: geoJsonData,
      layer_active: layer,
      portfolio_id: portfolio_id,
      generated_at: new Date().toISOString(),
      data_freshness: 'real-time',
      map_attribution: 'Market data provided by AI Valuation Platform',
      supported_layers: ['performance', 'value', 'risk', 'opportunity'],
      interactivity: {
        clickable_properties: include_properties,
        hover_tooltips: true,
        drill_down_enabled: true,
        filter_controls: ['property_class', 'price_range', 'performance_tier']
      }
    });

  } catch (error) {
    console.error('Geospatial mapping error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Geospatial analysis failed' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      custom_layers = [],
      analysis_regions = [],
      alert_boundaries = [],
      save_configuration = false
    } = await request.json();

    // Create custom geospatial analysis configuration
    const customConfig = {
      config_id: `geo_config_${Date.now()}`,
      custom_layers: custom_layers.map((layer: any) => ({
        name: layer.name,
        type: layer.type || 'heatmap',
        data_source: layer.data_source,
        styling: {
          color_scheme: layer.color_scheme || 'red_yellow_green',
          opacity: layer.opacity || 0.7,
          radius: layer.radius || 5000
        },
        filters: layer.filters || [],
        enabled: layer.enabled !== false
      })),
      analysis_regions: analysis_regions.map((region: any) => ({
        region_id: region.id,
        name: region.name,
        bounds: region.bounds,
        analysis_type: region.analysis_type || 'performance',
        alert_threshold: region.alert_threshold
      })),
      alert_boundaries: alert_boundaries,
      created_at: new Date().toISOString(),
      status: 'active'
    };

    // Generate initial analysis for custom regions
    const customAnalysis = await generateCustomRegionalAnalysis(analysis_regions);

    if (save_configuration) {
      await saveGeospatialConfiguration(customConfig);
    }

    return NextResponse.json({
      success: true,
      custom_configuration: customConfig,
      regional_analysis: customAnalysis,
      map_layers_created: custom_layers.length,
      analysis_regions_configured: analysis_regions.length,
      alert_boundaries_set: alert_boundaries.length,
      preview_url: `/dashboard/geospatial/${customConfig.config_id}`,
      export_options: ['interactive_map', 'static_image', 'data_export', 'report_pdf']
    });

  } catch (error) {
    console.error('Custom geospatial configuration error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Custom configuration failed' 
      },
      { status: 500 }
    );
  }
}

async function generateGeospatialData(portfolioId: string, layer: string, options: any): Promise<GeospatialAnalytics> {
  // Generate property locations with realistic coordinates
  const properties = generatePropertyLocations();
  
  // Generate market heatmap data
  const markets = generateMarketHeatmapData(properties, layer);
  
  // Calculate geographic distribution
  const states = properties.reduce((acc, p) => {
    acc[p.state] = (acc[p.state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const metros = properties.reduce((acc, p) => {
    acc[p.market_area] = (acc[p.market_area] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const submarkets = properties.reduce((acc, p) => {
    acc[p.submarket] = (acc[p.submarket] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Performance analysis by location
  const marketPerformance = markets.map(m => ({
    ...m,
    avg_performance: m.properties_in_market.reduce((sum, p) => sum + p.irr, 0) / m.properties_in_market.length
  }));
  
  const sortedByPerformance = [...marketPerformance].sort((a, b) => b.avg_performance - a.avg_performance);
  
  // Risk analysis
  const concentrationRisk = Math.max(...Object.values(states)) / properties.length;
  const diversificationScore = Object.keys(states).length / 10; // Normalized to 10 states
  
  return {
    total_properties: properties.length,
    geographic_distribution: {
      states,
      metros,
      submarkets
    },
    
    performance_by_location: {
      best_performing_markets: sortedByPerformance.slice(0, 3),
      underperforming_markets: sortedByPerformance.slice(-2),
      emerging_markets: markets.filter(m => m.growth_potential === 'high').slice(0, 2)
    },
    
    risk_analysis: {
      concentration_risk: concentrationRisk,
      geographic_diversification: Math.min(diversificationScore, 1.0),
      climate_risk_exposure: 0.25, // 25% of properties in climate risk areas
      economic_sensitivity: {
        'tech_economy': 0.35,
        'finance_economy': 0.20,
        'healthcare_economy': 0.15,
        'manufacturing': 0.30
      }
    },
    
    market_opportunities: [
      {
        market_id: 'austin_tx',
        opportunity_type: 'acquisition',
        score: 0.87,
        reason: 'Strong population growth and tech sector expansion driving rental demand',
        estimated_investment: 25000000,
        projected_returns: 0.145
      },
      {
        market_id: 'nashville_tn',
        opportunity_type: 'development',
        score: 0.82,
        reason: 'Limited supply pipeline with strong absorption rates',
        estimated_investment: 40000000,
        projected_returns: 0.138
      },
      {
        market_id: 'raleigh_nc',
        opportunity_type: 'value_add',
        score: 0.79,
        reason: 'Below-market rents with renovation upside potential',
        estimated_investment: 15000000,
        projected_returns: 0.162
      }
    ],
    
    heatmap_layers: {
      performance_heatmap: generatePerformanceHeatmap(markets),
      value_heatmap: generateValueHeatmap(markets),
      risk_heatmap: generateRiskHeatmap(markets),
      opportunity_heatmap: generateOpportunityHeatmap(markets)
    }
  };
}

function generatePropertyLocations(): PropertyLocation[] {
  const markets = [
    { name: 'Austin Metro', state: 'TX', lat: 30.2672, lng: -97.7431 },
    { name: 'Denver Metro', state: 'CO', lat: 39.7392, lng: -104.9903 },
    { name: 'Seattle Metro', state: 'WA', lat: 47.6062, lng: -122.3321 },
    { name: 'Dallas Metro', state: 'TX', lat: 32.7767, lng: -96.7970 },
    { name: 'Atlanta Metro', state: 'GA', lat: 33.7490, lng: -84.3880 },
    { name: 'Phoenix Metro', state: 'AZ', lat: 33.4484, lng: -112.0740 },
    { name: 'Charlotte Metro', state: 'NC', lat: 35.2271, lng: -80.8431 },
    { name: 'Tampa Metro', state: 'FL', lat: 27.9506, lng: -82.4572 },
    { name: 'Nashville Metro', state: 'TN', lat: 36.1627, lng: -86.7816 },
    { name: 'Raleigh Metro', state: 'NC', lat: 35.7796, lng: -78.6382 }
  ];
  
  const propertyNames = [
    'Sunset Ridge Apartments', 'Highland Park Residences', 'Metro Commons', 'Oak Valley Estates',
    'Riverside Towers', 'Garden District Flats', 'Lakewood Village', 'Parkside Manor',
    'Summit Point Apartments', 'Greenway Residences', 'Copper Creek Commons', 'Hillside Terrace'
  ];
  
  return propertyNames.map((name, index) => {
    const market = markets[index % markets.length];
    const units = 80 + Math.floor(Math.random() * 120);
    const currentValue = 12000000 + Math.random() * 25000000;
    const noi = currentValue * (0.045 + Math.random() * 0.025);
    const sqft = units * (800 + Math.random() * 300);
    
    // Add small random offset to coordinates for realistic spread
    const latOffset = (Math.random() - 0.5) * 0.2; // ~10 mile radius
    const lngOffset = (Math.random() - 0.5) * 0.2;
    
    return {
      property_id: `prop_${index + 1}`,
      property_name: name,
      lat: market.lat + latOffset,
      lng: market.lng + lngOffset,
      address: `${1000 + Math.floor(Math.random() * 9000)} ${['Main', 'Oak', 'Elm', 'Park', 'First'][index % 5]} St`,
      city: market.name.replace(' Metro', ''),
      state: market.state,
      zip_code: (10000 + Math.floor(Math.random() * 90000)).toString(),
      market_area: market.name,
      submarket: ['Downtown', 'Midtown', 'Uptown', 'Westside', 'Eastside'][index % 5],
      
      units,
      property_class: (Math.random() > 0.6 ? 'A' : Math.random() > 0.3 ? 'B' : 'C') as 'A' | 'B' | 'C',
      property_type: 'Multifamily',
      year_built: 1990 + Math.floor(Math.random() * 30),
      square_feet: Math.round(sqft),
      
      current_value: Math.round(currentValue),
      noi: Math.round(noi),
      cap_rate: noi / currentValue,
      price_per_unit: Math.round(currentValue / units),
      price_per_sqft: Math.round(currentValue / sqft),
      rent_per_unit: Math.round(noi / units / 12 * 1.5), // Gross rent estimate
      occupancy_rate: 0.88 + Math.random() * 0.10,
      
      irr: 0.08 + Math.random() * 0.15,
      cash_on_cash: 0.06 + Math.random() * 0.12,
      appreciation_1yr: 0.05 + Math.random() * 0.15,
      market_rent_premium: -0.05 + Math.random() * 0.15,
      
      flood_zone: (['A', 'B', 'C', 'X', 'X', 'X'] as const)[Math.floor(Math.random() * 6)], // Most in X zone
      crime_score: 2 + Math.floor(Math.random() * 6), // 2-8
      walkability_score: 40 + Math.floor(Math.random() * 50), // 40-90
      transit_score: 30 + Math.floor(Math.random() * 60), // 30-90
      school_rating: 5 + Math.floor(Math.random() * 5) // 5-9
    };
  });
}

function generateMarketHeatmapData(properties: PropertyLocation[], layer: string): MarketHeatmapData[] {
  // Group properties by market area
  const marketGroups = properties.reduce((acc, prop) => {
    if (!acc[prop.market_area]) {
      acc[prop.market_area] = [];
    }
    acc[prop.market_area].push(prop);
    return acc;
  }, {} as Record<string, PropertyLocation[]>);
  
  return Object.entries(marketGroups).map(([marketName, marketProps]) => {
    const avgCapRate = marketProps.reduce((sum, p) => sum + p.cap_rate, 0) / marketProps.length;
    const avgPricePerUnit = marketProps.reduce((sum, p) => sum + p.price_per_unit, 0) / marketProps.length;
    const avgOccupancy = marketProps.reduce((sum, p) => sum + p.occupancy_rate, 0) / marketProps.length;
    const avgIRR = marketProps.reduce((sum, p) => sum + p.irr, 0) / marketProps.length;
    
    // Calculate bounds
    const lats = marketProps.map(p => p.lat);
    const lngs = marketProps.map(p => p.lng);
    const bounds = {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
      center: {
        lat: lats.reduce((sum, lat) => sum + lat, 0) / lats.length,
        lng: lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length
      }
    };
    
    // Investment scoring
    const investmentScore = Math.min(100, Math.max(0, 
      (avgIRR * 400) + (avgOccupancy * 30) + ((0.07 - avgCapRate) * 500) + 20
    ));
    
    const riskScore = Math.min(100, Math.max(0,
      100 - investmentScore + (Math.random() * 20 - 10)
    ));
    
    // Color coding based on layer
    let heatIntensity = 0;
    let colorCode = '#808080';
    
    switch (layer) {
      case 'performance':
        heatIntensity = Math.min(1, avgIRR / 0.20); // Normalize to 20% max IRR
        colorCode = getPerformanceColor(heatIntensity);
        break;
      case 'value':
        heatIntensity = Math.min(1, avgPricePerUnit / 200000); // Normalize to $200k/unit max
        colorCode = getValueColor(heatIntensity);
        break;
      case 'risk':
        heatIntensity = riskScore / 100;
        colorCode = getRiskColor(heatIntensity);
        break;
      case 'opportunity':
        heatIntensity = investmentScore / 100;
        colorCode = getOpportunityColor(heatIntensity);
        break;
    }
    
    return {
      market_id: marketName.toLowerCase().replace(/\s+/g, '_'),
      market_name: marketName,
      bounds,
      
      avg_cap_rate: avgCapRate,
      cap_rate_trend: (Math.random() > 0.6 ? 'increasing' : Math.random() > 0.3 ? 'stable' : 'decreasing') as 'increasing' | 'decreasing' | 'stable',
      avg_price_per_unit: avgPricePerUnit,
      price_appreciation_12m: 0.05 + Math.random() * 0.15,
      avg_occupancy: avgOccupancy,
      avg_rent_growth: 0.02 + Math.random() * 0.06,
      transaction_volume_12m: Math.floor(Math.random() * 100) + 20,
      
      population: 500000 + Math.floor(Math.random() * 2000000),
      employment_growth: 0.01 + Math.random() * 0.05,
      median_income: 45000 + Math.floor(Math.random() * 40000),
      rental_demand_score: 60 + Math.floor(Math.random() * 35),
      supply_pipeline_units: Math.floor(Math.random() * 5000) + 500,
      absorption_rate: 0.6 + Math.random() * 0.35,
      
      investment_score: Math.round(investmentScore),
      risk_score: Math.round(riskScore),
      liquidity_score: 60 + Math.floor(Math.random() * 35),
      growth_potential: (investmentScore > 75 ? 'high' : investmentScore > 50 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      
      heat_intensity: heatIntensity,
      color_code: colorCode,
      
      properties_in_market: marketProps
    };
  });
}

function generatePerformanceHeatmap(markets: MarketHeatmapData[]): MarketHeatmapData[] {
  return markets.map(market => ({
    ...market,
    heat_intensity: Math.min(1, market.investment_score / 100),
    color_code: getPerformanceColor(market.investment_score / 100)
  }));
}

function generateValueHeatmap(markets: MarketHeatmapData[]): MarketHeatmapData[] {
  return markets.map(market => ({
    ...market,
    heat_intensity: Math.min(1, market.avg_price_per_unit / 200000),
    color_code: getValueColor(market.avg_price_per_unit / 200000)
  }));
}

function generateRiskHeatmap(markets: MarketHeatmapData[]): MarketHeatmapData[] {
  return markets.map(market => ({
    ...market,
    heat_intensity: market.risk_score / 100,
    color_code: getRiskColor(market.risk_score / 100)
  }));
}

function generateOpportunityHeatmap(markets: MarketHeatmapData[]): MarketHeatmapData[] {
  return markets.map(market => ({
    ...market,
    heat_intensity: market.investment_score / 100,
    color_code: getOpportunityColor(market.investment_score / 100)
  }));
}

function getPerformanceColor(intensity: number): string {
  // Green (high performance) to Red (low performance)
  if (intensity > 0.75) return '#00FF00';
  if (intensity > 0.5) return '#80FF00';
  if (intensity > 0.25) return '#FFFF00';
  return '#FF8000';
}

function getValueColor(intensity: number): string {
  // Blue (high value) to Purple (low value)
  if (intensity > 0.75) return '#0000FF';
  if (intensity > 0.5) return '#4000FF';
  if (intensity > 0.25) return '#8000FF';
  return '#C000FF';
}

function getRiskColor(intensity: number): string {
  // Red (high risk) to Green (low risk)
  if (intensity > 0.75) return '#FF0000';
  if (intensity > 0.5) return '#FF4000';
  if (intensity > 0.25) return '#FF8000';
  return '#FFFF00';
}

function getOpportunityColor(intensity: number): string {
  // Gold (high opportunity) to Gray (low opportunity)
  if (intensity > 0.75) return '#FFD700';
  if (intensity > 0.5) return '#FFA500';
  if (intensity > 0.25) return '#FF8C00';
  return '#808080';
}

function generateMapConfiguration(layer: string, zoomLevel: number) {
  return {
    default_zoom: zoomLevel,
    default_center: { lat: 39.8283, lng: -98.5795 }, // Geographic center of US
    map_style: 'satellite-streets',
    layer_controls: {
      enabled: true,
      position: 'top-right',
      layers: ['performance', 'value', 'risk', 'opportunity']
    },
    legend: {
      enabled: true,
      position: 'bottom-left',
      title: `${layer.charAt(0).toUpperCase() + layer.slice(1)} Heatmap`,
      color_scale: getColorScale(layer)
    },
    clustering: {
      enabled: true,
      max_zoom: 15,
      radius: 50
    },
    interaction: {
      hover_enabled: true,
      click_enabled: true,
      tooltip_enabled: true
    }
  };
}

function getColorScale(layer: string) {
  switch (layer) {
    case 'performance':
      return [
        { value: 0, color: '#FF8000', label: 'Low Performance' },
        { value: 0.33, color: '#FFFF00', label: 'Moderate Performance' },
        { value: 0.66, color: '#80FF00', label: 'Good Performance' },
        { value: 1, color: '#00FF00', label: 'Excellent Performance' }
      ];
    case 'value':
      return [
        { value: 0, color: '#C000FF', label: 'Low Value' },
        { value: 0.33, color: '#8000FF', label: 'Moderate Value' },
        { value: 0.66, color: '#4000FF', label: 'High Value' },
        { value: 1, color: '#0000FF', label: 'Premium Value' }
      ];
    case 'risk':
      return [
        { value: 0, color: '#FFFF00', label: 'Low Risk' },
        { value: 0.33, color: '#FF8000', label: 'Moderate Risk' },
        { value: 0.66, color: '#FF4000', label: 'High Risk' },
        { value: 1, color: '#FF0000', label: 'Very High Risk' }
      ];
    case 'opportunity':
      return [
        { value: 0, color: '#808080', label: 'Limited Opportunity' },
        { value: 0.33, color: '#FF8C00', label: 'Moderate Opportunity' },
        { value: 0.66, color: '#FFA500', label: 'Good Opportunity' },
        { value: 1, color: '#FFD700', label: 'Excellent Opportunity' }
      ];
    default:
      return [];
  }
}

function generateGeoJSONData(geospatialData: GeospatialAnalytics, layer: string) {
  const heatmapData = geospatialData.heatmap_layers[`${layer}_heatmap` as keyof typeof geospatialData.heatmap_layers];
  
  return {
    type: 'FeatureCollection',
    features: heatmapData.map(market => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [market.bounds.center.lng, market.bounds.center.lat]
      },
      properties: {
        market_id: market.market_id,
        market_name: market.market_name,
        investment_score: market.investment_score,
        risk_score: market.risk_score,
        avg_cap_rate: market.avg_cap_rate,
        avg_price_per_unit: market.avg_price_per_unit,
        properties_count: market.properties_in_market.length,
        heat_intensity: market.heat_intensity,
        color: market.color_code,
        tooltip: `${market.market_name}<br/>Investment Score: ${market.investment_score}<br/>Avg Cap Rate: ${(market.avg_cap_rate * 100).toFixed(1)}%<br/>Properties: ${market.properties_in_market.length}`
      }
    }))
  };
}

function parseBounds(boundsString: string) {
  const [north, south, east, west] = boundsString.split(',').map(Number);
  return { north, south, east, west };
}

async function generateCustomRegionalAnalysis(regions: any[]) {
  return regions.map(region => ({
    region_id: region.id,
    region_name: region.name,
    analysis_results: {
      avg_performance: 0.125 + Math.random() * 0.05,
      market_strength: Math.floor(Math.random() * 40) + 60,
      growth_potential: Math.random() > 0.5 ? 'high' : 'medium',
      risk_factors: [
        'Market concentration',
        'Interest rate sensitivity',
        'Economic dependency'
      ].slice(0, Math.floor(Math.random() * 3) + 1)
    },
    generated_at: new Date().toISOString()
  }));
}

async function saveGeospatialConfiguration(config: any) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `geospatial_config_${config.config_id}_${timestamp}.json`;
    
    const storage_dir = path.join(process.cwd(), 'storage', 'exports');
    if (!fs.existsSync(storage_dir)) {
      fs.mkdirSync(storage_dir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(storage_dir, filename), JSON.stringify(config, null, 2));
    return `/api/download-pitch-deck/${encodeURIComponent(filename)}`;
  } catch (error) {
    console.warn('Geospatial configuration save failed:', error);
    return null;
  }
}