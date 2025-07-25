'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, DollarSign, Home, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FinancialInputs, analyzeProperty, getViabilityRating } from '@/lib/financial-calculations';

export default function CalculatorPage() {
  const [inputs, setInputs] = useState<FinancialInputs>({
    purchasePrice: 1000000,
    grossIncome: 120000,
    operatingExpenses: 48000,
    vacancy: 5,
    loanAmount: 750000,
    interestRate: 6.5,
    loanTerm: 30,
    cashInvested: 250000,
    appreciationRate: 3,
    rentGrowthRate: 2.5,
    expenseGrowthRate: 3,
    holdingPeriod: 10,
    capRateAtSale: 6.5
  });

  const [results, setResults] = useState<any>(null);

  const handleInputChange = (field: keyof FinancialInputs, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const calculateMetrics = () => {
    const analysisResults = analyzeProperty(inputs);
    setResults(analysisResults);
  };

  const getViabilityColor = (score: number) => {
    if (score >= 85) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 70) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 55) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score >= 40) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
              <Calculator className="h-8 w-8" />
              Property Investment Calculator
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Analyze potential real estate investments with comprehensive financial modeling 
              including IRR, cash-on-cash returns, and multi-year projections.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Property Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Property Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="purchasePrice">Purchase Price</Label>
                      <Input
                        id="purchasePrice"
                        type="number"
                        value={inputs.purchasePrice}
                        onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                        placeholder="1000000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="grossIncome">Annual Gross Income</Label>
                      <Input
                        id="grossIncome"
                        type="number"
                        value={inputs.grossIncome}
                        onChange={(e) => handleInputChange('grossIncome', e.target.value)}
                        placeholder="120000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="operatingExpenses">Annual Operating Expenses</Label>
                      <Input
                        id="operatingExpenses"
                        type="number"
                        value={inputs.operatingExpenses}
                        onChange={(e) => handleInputChange('operatingExpenses', e.target.value)}
                        placeholder="48000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vacancy">Vacancy Rate (%)</Label>
                      <Input
                        id="vacancy"
                        type="number"
                        step="0.1"
                        value={inputs.vacancy}
                        onChange={(e) => handleInputChange('vacancy', e.target.value)}
                        placeholder="5"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financing Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="loanAmount">Loan Amount</Label>
                      <Input
                        id="loanAmount"
                        type="number"
                        value={inputs.loanAmount}
                        onChange={(e) => handleInputChange('loanAmount', e.target.value)}
                        placeholder="750000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interestRate">Interest Rate (%)</Label>
                      <Input
                        id="interestRate"
                        type="number"
                        step="0.1"
                        value={inputs.interestRate}
                        onChange={(e) => handleInputChange('interestRate', e.target.value)}
                        placeholder="6.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loanTerm">Loan Term (years)</Label>
                      <Input
                        id="loanTerm"
                        type="number"
                        value={inputs.loanTerm}
                        onChange={(e) => handleInputChange('loanTerm', e.target.value)}
                        placeholder="30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cashInvested">Total Cash Invested</Label>
                      <Input
                        id="cashInvested"
                        type="number"
                        value={inputs.cashInvested}
                        onChange={(e) => handleInputChange('cashInvested', e.target.value)}
                        placeholder="250000"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Projections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Projection Assumptions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="appreciationRate">Property Appreciation (%)</Label>
                      <Input
                        id="appreciationRate"
                        type="number"
                        step="0.1"
                        value={inputs.appreciationRate}
                        onChange={(e) => handleInputChange('appreciationRate', e.target.value)}
                        placeholder="3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rentGrowthRate">Rent Growth Rate (%)</Label>
                      <Input
                        id="rentGrowthRate"
                        type="number"
                        step="0.1"
                        value={inputs.rentGrowthRate}
                        onChange={(e) => handleInputChange('rentGrowthRate', e.target.value)}
                        placeholder="2.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expenseGrowthRate">Expense Growth Rate (%)</Label>
                      <Input
                        id="expenseGrowthRate"
                        type="number"
                        step="0.1"
                        value={inputs.expenseGrowthRate}
                        onChange={(e) => handleInputChange('expenseGrowthRate', e.target.value)}
                        placeholder="3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="holdingPeriod">Holding Period (years)</Label>
                      <Input
                        id="holdingPeriod"
                        type="number"
                        value={inputs.holdingPeriod}
                        onChange={(e) => handleInputChange('holdingPeriod', e.target.value)}
                        placeholder="10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={calculateMetrics} className="w-full mb-4">
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculate Investment
                  </Button>

                  {results && (
                    <div className="space-y-4">
                      {/* Viability Score */}
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Viability Score</div>
                        <div className="text-3xl font-bold mb-2">{results.viabilityScore}/100</div>
                        <Badge className={getViabilityColor(results.viabilityScore)}>
                          {results.viabilityRating}
                        </Badge>
                      </div>

                      {/* Key Metrics */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">Cap Rate</span>
                          <span className="font-bold">{formatPercentage(results.capRate)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">Cash-on-Cash</span>
                          <span className="font-bold">{formatPercentage(results.cashOnCashReturn)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">IRR</span>
                          <span className="font-bold">{formatPercentage(results.irr)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">DSCR</span>
                          <span className="font-bold">{results.dscr.toFixed(2)}x</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">LTV</span>
                          <span className="font-bold">{formatPercentage(results.ltv)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">Equity Multiple</span>
                          <span className="font-bold">{results.equityMultiple.toFixed(2)}x</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {results && (
                <Card>
                  <CardHeader>
                    <CardTitle>Cash Flow Projections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {results.projections.map((projection: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 border-b">
                          <span className="text-sm font-medium">Year {projection.year}</span>
                          <span className={`text-sm font-bold ${projection.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(projection.cashFlow)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}