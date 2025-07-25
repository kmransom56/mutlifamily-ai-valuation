import React from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, TrendingUp, Users, DollarSign, Plus, Eye, FileText, Settings, Activity, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Mock data - this would come from your backend/database
const mockDashboardData = {
  metrics: {
    totalProperties: 12,
    averageUnits: 40.6,
    averageCapRate: 7.2,
    potentialDeals: 3,
    totalValue: 24500000,
    monthlyIncome: 186000,
    occupancyRate: 94.8,
    portfolioIRR: 12.4
  },
  recentProperties: [
    {
      id: '1',
      name: 'Sunset Apartments',
      type: 'multifamily',
      units: 48,
      location: 'Seattle, WA',
      status: 'Analyzed',
      dateAnalyzed: '2025-01-20',
      capRate: 7.8,
      viabilityScore: 85
    },
    {
      id: '2',
      name: 'Downtown Lofts',
      type: 'mixed-use',
      units: 24,
      location: 'Portland, OR',
      status: 'Processing',
      dateAnalyzed: null,
      capRate: null,
      viabilityScore: null
    },
    {
      id: '3',
      name: 'Garden View Complex',
      type: 'multifamily',
      units: 72,
      location: 'Vancouver, WA',
      status: 'Under Review',
      dateAnalyzed: '2025-01-18',
      capRate: 6.9,
      viabilityScore: 72
    }
  ],
  recentActivity: [
    { id: '1', action: 'Property analyzed', property: 'Sunset Apartments', timestamp: '2 hours ago' },
    { id: '2', action: 'Pitch deck generated', property: 'Garden View Complex', timestamp: '5 hours ago' },
    { id: '3', action: 'New documents uploaded', property: 'Downtown Lofts', timestamp: '1 day ago' },
    { id: '4', action: 'Investor notification sent', property: 'Sunset Apartments', timestamp: '2 days ago' }
  ]
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'Analyzed': return 'bg-green-100 text-green-800 border-green-200';
    case 'Processing': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Under Review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Pending': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export default function DashboardPage() {
  const { metrics, recentProperties, recentActivity } = mockDashboardData;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back! Here's an overview of your property portfolio.
              </p>
            </div>
            <Link href="/">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Analyze New Property
              </Button>
            </Link>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalProperties}</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Cap Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.averageCapRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Above market average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</div>
                <p className="text-xs text-muted-foreground">
                  +5.2% YTD
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metrics.monthlyIncome)}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.occupancyRate}% occupancy
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Properties */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Properties</CardTitle>
                <Link href="/properties">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentProperties.map((property) => (
                    <div key={property.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{property.name}</h3>
                          <Badge variant="outline" className={getStatusColor(property.status)}>
                            {property.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {property.units} units • {property.location}
                        </p>
                        {property.capRate && (
                          <p className="text-sm font-medium text-green-600">
                            {property.capRate}% Cap Rate
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {property.viabilityScore && (
                          <div className="text-right">
                            <div className="text-sm font-medium">{property.viabilityScore}/100</div>
                            <div className="text-xs text-muted-foreground">Viability</div>
                          </div>
                        )}
                        <Button variant="ghost" size="sm">
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions & Activity */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Analyze New Property
                    </Button>
                  </Link>
                  <Link href="/properties" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Building2 className="h-4 w-4 mr-2" />
                      View All Properties
                    </Button>
                  </Link>
                  <Link href="/calculator" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Property Calculator
                    </Button>
                  </Link>
                  <Link href="/crm-integration" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Investors
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-sm text-muted-foreground">{activity.property}</p>
                          <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
