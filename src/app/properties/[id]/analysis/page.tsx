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
  ArrowLeft, 
  Building2, 
  DollarSign,
  TrendingUp,
  BarChart3,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileText,
  Calculator
} from 'lucide-react';
import { Property } from '@/types/property';

export default function PropertyAnalysisPage() {
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

  const getViabilityColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-800 border-gray-200';
    if (score >= 85) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 70) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 55) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score >= 40) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getViabilityGrade = (score?: number) => {
    if (!score) return 'Not Analyzed';
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C-';
    if (score >= 45) return 'D+';
    if (score >= 40) return 'D';
    return 'F';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading analysis report...</span>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-red-600 mb-2">Analysis Report Not Available</h1>
              <p className="text-gray-600 mb-4">{error || 'Property not found'}</p>
              <Link href={`/properties/${propertyId}`}>
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Property
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
              <Link href={`/properties/${propertyId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Property
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <BarChart3 className="h-8 w-8" />
                  Analysis Report
                </h1>
                <p className="text-muted-foreground mt-1">
                  {property.name} - Comprehensive Investment Analysis
                </p>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {getViabilityGrade(property.viabilityScore)}
                  </div>
                  <p className="text-sm text-muted-foreground">Investment Grade</p>
                  <Badge variant="outline" className={getViabilityColor(property.viabilityScore)}>
                    {property.viabilityScore}/100
                  </Badge>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {property.noi && property.askingPrice ? 
                      `${((property.noi / property.askingPrice) * 100).toFixed(2)}%` : 'N/A'}
                  </div>
                  <p className="text-sm text-muted-foreground">Cap Rate</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {property.noi ? formatCurrency(property.noi) : 'N/A'}
                  </div>
                  <p className="text-sm text-muted-foreground">Annual NOI</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {property.askingPrice && property.units ? 
                      formatCurrency(property.askingPrice / property.units) : 'N/A'}
                  </div>
                  <p className="text-sm text-muted-foreground">Price per Unit</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {property.askingPrice && (
                  <div className="flex justify-between">
                    <span>Asking Price:</span>
                    <span className="font-semibold">{formatCurrency(property.askingPrice)}</span>
                  </div>
                )}
                {property.grossIncome && (
                  <div className="flex justify-between">
                    <span>Gross Income:</span>
                    <span className="font-semibold">{formatCurrency(property.grossIncome)}</span>
                  </div>
                )}
                {property.operatingExpenses && (
                  <div className="flex justify-between">
                    <span>Operating Expenses:</span>
                    <span className="font-semibold">{formatCurrency(property.operatingExpenses)}</span>
                  </div>
                )}
                {property.noi && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Net Operating Income:</span>
                    <span className="font-bold text-green-600">{formatCurrency(property.noi)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Investment Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {property.capRate && (
                  <div className="flex justify-between">
                    <span>Cap Rate:</span>
                    <span className="font-semibold">{property.capRate.toFixed(2)}%</span>
                  </div>
                )}
                {property.cashOnCashReturn && (
                  <div className="flex justify-between">
                    <span>Cash-on-Cash Return:</span>
                    <span className="font-semibold">{property.cashOnCashReturn.toFixed(2)}%</span>
                  </div>
                )}
                {property.irr && (
                  <div className="flex justify-between">
                    <span>Internal Rate of Return:</span>
                    <span className="font-semibold">{property.irr.toFixed(2)}%</span>
                  </div>
                )}
                {property.equityMultiple && (
                  <div className="flex justify-between">
                    <span>Equity Multiple:</span>
                    <span className="font-semibold">{property.equityMultiple.toFixed(2)}x</span>
                  </div>
                )}
                {property.dscr && (
                  <div className="flex justify-between">
                    <span>DSCR:</span>
                    <span className="font-semibold">{property.dscr.toFixed(2)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Analysis Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Investment Analysis & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Strengths:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• {property.units}-unit {property.type} property in {property.location}</li>
                    {property.viabilityScore && property.viabilityScore >= 75 && (
                      <li>• High viability score ({property.viabilityScore}/100) indicates strong investment potential</li>
                    )}
                    {property.noi && property.askingPrice && ((property.noi / property.askingPrice) * 100) >= 6 && (
                      <li>• Strong cap rate of {((property.noi / property.askingPrice) * 100).toFixed(2)}% indicates good income yield</li>
                    )}
                    {property.status === 'Analyzed' && (
                      <li>• Complete AI analysis performed with comprehensive data processing</li>
                    )}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Considerations:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {property.viabilityScore && property.viabilityScore < 60 && (
                      <li>• Viability score of {property.viabilityScore}/100 suggests careful due diligence is needed</li>
                    )}
                    <li>• Market conditions and local economic factors should be thoroughly evaluated</li>
                    <li>• Property condition and required capital improvements should be assessed</li>
                    <li>• Financing terms and leverage ratios should be optimized for maximum returns</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Next Steps:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Schedule property inspection and physical due diligence</li>
                    <li>• Obtain detailed rent rolls and lease abstracts</li>
                    <li>• Review 3 years of financial statements and tax returns</li>
                    <li>• Analyze local market comparables and rent growth trends</li>
                    <li>• Develop detailed business plan and value-add strategy</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Notes */}
          {property.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Analysis Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{property.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}