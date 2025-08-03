'use client';

import React, { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { Property } from '@/types/property';

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.id as string;
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch property data from API
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/properties/${propertyId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Property not found');
          }
          throw new Error('Failed to fetch property');
        }
        
        const data = await response.json();
        setProperty(data.property);
      } catch (err) {
        console.error('Error fetching property:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch property');
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: Property['status']) => {
    switch (status) {
      case 'Analyzed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Under Review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Acquired': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading property...</span>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-red-600 mb-2">Error Loading Property</h1>
              <p className="text-gray-600 mb-4">{error}</p>
              <Link href="/properties">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Properties
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-600 mb-2">Property Not Found</h1>
              <p className="text-gray-600 mb-4">The property you're looking for doesn't exist.</p>
              <Link href="/properties">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Properties
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/properties">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Properties
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Building2 className="h-8 w-8" />
                  {property.name}
                </h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {property.location}
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

          {/* Property Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className={getStatusColor(property.status)}>
                  {property.status}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  Created: {new Date(property.dateCreated).toLocaleDateString()}
                </p>
                {property.dateAnalyzed && (
                  <p className="text-xs text-muted-foreground">
                    Analyzed: {new Date(property.dateAnalyzed).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Property Type</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{property.type.replace('-', ' ')}</div>
                <p className="text-xs text-muted-foreground">
                  {property.units} units
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Viability Score</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {property.viabilityScore ? (
                  <div>
                    <div className="text-2xl font-bold">{property.viabilityScore}/100</div>
                    <Badge variant="outline" className={getViabilityColor(property.viabilityScore)}>
                      {property.viabilityScore >= 80 ? 'Excellent' : 
                       property.viabilityScore >= 60 ? 'Good' : 
                       property.viabilityScore >= 40 ? 'Fair' : 'Poor'}
                    </Badge>
                  </div>
                ) : (
                  <div className="text-gray-500">Not analyzed</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Financial Overview */}
          {(property.askingPrice || property.grossIncome || property.noi) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {property.askingPrice && (
                    <div>
                      <div className="text-2xl font-bold">{formatCurrency(property.askingPrice)}</div>
                      <p className="text-sm text-muted-foreground">Asking Price</p>
                      {property.pricePerUnit && (
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(property.pricePerUnit)}/unit
                        </p>
                      )}
                    </div>
                  )}
                  
                  {property.grossIncome && (
                    <div>
                      <div className="text-2xl font-bold">{formatCurrency(property.grossIncome)}</div>
                      <p className="text-sm text-muted-foreground">Gross Income</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(property.grossIncome / property.units)}/unit
                      </p>
                    </div>
                  )}
                  
                  {property.noi && (
                    <div>
                      <div className="text-2xl font-bold">{formatCurrency(property.noi)}</div>
                      <p className="text-sm text-muted-foreground">Net Operating Income</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(property.noi / property.units)}/unit
                      </p>
                    </div>
                  )}
                  
                  {property.capRate && (
                    <div>
                      <div className="text-2xl font-bold text-green-600">{property.capRate.toFixed(1)}%</div>
                      <p className="text-sm text-muted-foreground">Cap Rate</p>
                      {property.cashOnCashReturn && (
                        <p className="text-xs text-muted-foreground">
                          {property.cashOnCashReturn.toFixed(1)}% Cash-on-Cash
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Investment Metrics */}
          {(property.irr || property.dscr || property.ltv || property.equityMultiple) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Investment Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {property.irr && (
                    <div>
                      <div className="text-2xl font-bold">{property.irr.toFixed(1)}%</div>
                      <p className="text-sm text-muted-foreground">Internal Rate of Return</p>
                    </div>
                  )}
                  
                  {property.equityMultiple && (
                    <div>
                      <div className="text-2xl font-bold">{property.equityMultiple.toFixed(2)}x</div>
                      <p className="text-sm text-muted-foreground">Equity Multiple</p>
                    </div>
                  )}
                  
                  {property.dscr && (
                    <div>
                      <div className="text-2xl font-bold">{property.dscr.toFixed(2)}</div>
                      <p className="text-sm text-muted-foreground">Debt Service Coverage Ratio</p>
                    </div>
                  )}
                  
                  {property.ltv && (
                    <div>
                      <div className="text-2xl font-bold">{property.ltv}%</div>
                      <p className="text-sm text-muted-foreground">Loan-to-Value Ratio</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Property Notes */}
          {property.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Property Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{property.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Property Files */}
          {property.files && property.files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Property Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {property.files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {file.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} • 
                            {(file.size / 1024).toFixed(1)} KB • 
                            Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={
                        file.processingStatus === 'completed' ? 'bg-green-100 text-green-800' :
                        file.processingStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {file.processingStatus}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Investment Strategy */}
          {property.investmentStrategy && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Investment Strategy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{property.investmentStrategy}</p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analysis Report
            </Button>
            <Button variant="outline">
              <PieChart className="h-4 w-4 mr-2" />
              Financial Projections
            </Button>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Investor Presentation
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}