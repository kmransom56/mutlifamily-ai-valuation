'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  DollarSign,
  TrendingUp,
  Download,
  Edit,
  Share,
  FileText,
  Users,
  Calculator,
  BarChart3,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle2,
  Cloud
} from 'lucide-react';
import { Property, FinancialProjection } from '@/types/property';
import { FinancialInputs, analyzeProperty } from '@/lib/financial-calculations';
import GoogleDriveAuth from '@/components/GoogleDriveAuth';
import GoogleDriveUpload from '@/components/GoogleDriveUpload';

// Mock property data - this would come from your backend
const mockPropertyData: Property & { analysis?: any } = {
  id: '1',
  name: 'Sunset Apartments',
  type: 'multifamily',
  units: 48,
  location: 'Seattle, WA',
  status: 'Analyzed',
  dateCreated: '2025-01-15',
  dateAnalyzed: '2025-01-20',
  askingPrice: 4800000,
  pricePerUnit: 100000,
  grossIncome: 576000,
  operatingExpenses: 201600,
  noi: 374400,
  capRate: 7.8,
  cashOnCashReturn: 12.5,
  irr: 14.2,
  dscr: 1.35,
  ltv: 75,
  viabilityScore: 85,
  notes: 'Premium location with excellent upside potential. Recently renovated units command higher rents.',
  files: [
    {
      id: '1',
      propertyId: '1',
      name: 'Rent Roll - Q4 2024.xlsx',
      type: 'rent_roll',
      fileType: 'xlsx',
      size: 245000,
      uploadedAt: '2025-01-15T10:30:00Z',
      processingStatus: 'completed'
    },
    {
      id: '2',
      propertyId: '1',
      name: 'T12 Operating Statement.pdf',
      type: 't12',
      fileType: 'pdf',
      size: 1200000,
      uploadedAt: '2025-01-15T10:32:00Z',
      processingStatus: 'completed'
    },
    {
      id: '3',
      propertyId: '1',
      name: 'Investment Analysis.pdf',
      type: 'analysis',
      fileType: 'pdf',
      size: 890000,
      uploadedAt: '2025-01-20T14:15:00Z',
      processingStatus: 'completed'
    }
  ]
};

// Mock financial analysis
const mockFinancialInputs: FinancialInputs = {
  purchasePrice: 4800000,
  grossIncome: 576000,
  operatingExpenses: 201600,
  vacancy: 5,
  loanAmount: 3600000,
  interestRate: 6.5,
  loanTerm: 30,
  cashInvested: 1200000,
  appreciationRate: 3,
  rentGrowthRate: 2.5,
  expenseGrowthRate: 3,
  holdingPeriod: 10,
  capRateAtSale: 7.5
};

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const [googleDriveToken, setGoogleDriveToken] = React.useState<string | null>(null);

  // In a real app, you would fetch the property data based on the ID
  const property = mockPropertyData;
  const analysis = analyzeProperty(mockFinancialInputs);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Analyzed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Under Review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getViabilityColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-800 border-gray-200';
    if (score >= 85) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 70) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 55) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score >= 40) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getViabilityRating = (score?: number) => {
    if (!score) return 'Not Assessed';
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Very Good';
    if (score >= 55) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const riskFactors = [
    'Market saturation in Seattle multifamily sector',
    'Rising interest rates may affect refinancing',
    'Potential rent control legislation'
  ];

  const opportunities = [
    'Value-add through unit renovations',
    'Below-market rents with upside potential',
    'Strong job growth in surrounding area',
    'Transit-oriented development nearby'
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/properties">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Properties
                </Button>
              </Link>
              
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                  <Building2 className="h-8 w-8" />
                  {property.name}
                  <Badge variant="outline" className={getStatusColor(property.status)}>
                    {property.status}
                  </Badge>
                </h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {property.location} • {property.units} units • {property.type.replace('-', ' ')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit Property
              </Button>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Purchase Price</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(property.askingPrice || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(property.pricePerUnit || 0)}/unit
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cap Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {property.capRate ? formatPercentage(property.capRate) : '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Above market average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">IRR</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {property.irr ? formatPercentage(property.irr) : '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  10-year projection
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Viability Score</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{property.viabilityScore || 0}/100</div>
                <Badge variant="outline" className={getViabilityColor(property.viabilityScore)}>
                  {getViabilityRating(property.viabilityScore)}
                </Badge>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Financial Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Financial Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Income & Operations
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">Gross Income</span>
                          <span className="font-bold">{formatCurrency(property.grossIncome || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">Operating Expenses</span>
                          <span className="font-bold">{formatCurrency(property.operatingExpenses || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                          <span className="text-sm font-medium">Net Operating Income</span>
                          <span className="font-bold text-green-600">{formatCurrency(property.noi || 0)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Investment Returns
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">Cash-on-Cash</span>
                          <span className="font-bold">{property.cashOnCashReturn ? formatPercentage(property.cashOnCashReturn) : '-'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">DSCR</span>
                          <span className="font-bold">{property.dscr ? `${property.dscr.toFixed(2)}x` : '-'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">LTV</span>
                          <span className="font-bold">{property.ltv ? formatPercentage(property.ltv) : '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cash Flow Projections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    10-Year Cash Flow Projections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {analysis.projections.map((projection: any, index: number) => (
                      <div key={index} className="grid grid-cols-5 gap-4 p-3 border rounded-lg">
                        <div className="text-center">
                          <div className="text-sm font-medium">Year {projection.year}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Gross Income</div>
                          <div className="font-medium">{formatCurrency(projection.grossIncome)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">NOI</div>
                          <div className="font-medium">{formatCurrency(projection.noi)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Cash Flow</div>
                          <div className={`font-medium ${projection.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(projection.cashFlow)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Property Value</div>
                          <div className="font-medium">{formatCurrency(projection.propertyValue)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Property Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Property Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Property Type</span>
                        <span className="capitalize">{property.type.replace('-', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Total Units</span>
                        <span>{property.units}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Date Created</span>
                        <span>{new Date(property.dateCreated).toLocaleDateString()}</span>
                      </div>
                      {property.dateAnalyzed && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Date Analyzed</span>
                          <span>{new Date(property.dateAnalyzed).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Location</span>
                        <span>{property.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Current Status</span>
                        <Badge variant="outline" className={getStatusColor(property.status)}>
                          {property.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {property.notes && (
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Notes</h4>
                      <p className="text-sm text-muted-foreground">{property.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Google Drive Integration */}
              <GoogleDriveAuth
                onAuthSuccess={(token) => setGoogleDriveToken(token)}
                onDisconnect={() => setGoogleDriveToken(null)}
              />

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/calculator" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Calculator className="h-4 w-4 mr-2" />
                      Run Calculator
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Pitch Deck
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Notify Investors
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Export Analysis
                  </Button>
                </CardContent>
              </Card>

              {/* Risk Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Risk Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {riskFactors.map((risk, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{risk}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Opportunities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {opportunities.map((opportunity, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{opportunity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Google Drive File Management */}
              {googleDriveToken && (
                <GoogleDriveUpload
                  propertyId={propertyId}
                  propertyName={property.name}
                  accessToken={googleDriveToken}
                />
              )}

              {/* Local Property Files (fallback) */}
              {!googleDriveToken && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Property Files
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {property.files?.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">{file.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {(file.size / 1024).toFixed(0)} KB • {file.fileType.toUpperCase()}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Google Drive Integration Section */}
          {googleDriveToken && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Cloud className="h-6 w-6" />
                Document Management
              </h2>
              <GoogleDriveUpload
                propertyId={propertyId}
                propertyName={property.name}
                accessToken={googleDriveToken}
                className="max-w-4xl"
              />
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}