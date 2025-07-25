'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  MoreHorizontal,
  TrendingUp,
  DollarSign,
  Calendar,
  MapPin,
  ArrowUpDown
} from 'lucide-react';
import { Property, PropertyType, PropertyStatus } from '@/types/property';

// Mock data - this would come from your backend/database
const mockProperties: Property[] = [
  {
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
    viabilityScore: 85
  },
  {
    id: '2',
    name: 'Downtown Lofts',
    type: 'mixed-use',
    units: 24,
    location: 'Portland, OR',
    status: 'Processing',
    dateCreated: '2025-01-18',
    askingPrice: 3200000,
    pricePerUnit: 133333,
    grossIncome: 288000,
    operatingExpenses: 115200
  },
  {
    id: '3',
    name: 'Garden View Complex',
    type: 'multifamily',
    units: 72,
    location: 'Vancouver, WA',
    status: 'Under Review',
    dateCreated: '2025-01-12',
    dateAnalyzed: '2025-01-18',
    askingPrice: 6480000,
    pricePerUnit: 90000,
    grossIncome: 777600,
    operatingExpenses: 233280,
    noi: 544320,
    capRate: 6.9,
    cashOnCashReturn: 9.8,
    irr: 11.4,
    dscr: 1.28,
    ltv: 80,
    viabilityScore: 72
  },
  {
    id: '4',
    name: 'Oak Street Residences',
    type: 'multifamily',
    units: 36,
    location: 'Tacoma, WA',
    status: 'Analyzed',
    dateCreated: '2025-01-10',
    dateAnalyzed: '2025-01-16',
    askingPrice: 2880000,
    pricePerUnit: 80000,
    grossIncome: 345600,
    operatingExpenses: 138240,
    noi: 207360,
    capRate: 7.2,
    cashOnCashReturn: 11.2,
    irr: 13.8,
    dscr: 1.42,
    ltv: 70,
    viabilityScore: 78
  },
  {
    id: '5',
    name: 'Riverside Commons',
    type: 'commercial',
    units: 16,
    location: 'Bellevue, WA',
    status: 'Pending',
    dateCreated: '2025-01-22',
    askingPrice: 2400000,
    pricePerUnit: 150000,
    grossIncome: 192000,
    operatingExpenses: 76800
  }
];

export default function PropertiesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<PropertyType | ''>('');
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | ''>('');
  const [sortField, setSortField] = useState<keyof Property>('dateCreated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filtering and sorting logic
  const filteredAndSortedProperties = useMemo(() => {
    let filtered = mockProperties.filter(property => {
      const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           property.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !typeFilter || property.type === typeFilter;
      const matchesStatus = !statusFilter || property.status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    });

    return filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [searchTerm, typeFilter, statusFilter, sortField, sortDirection]);

  const handleSort = (field: keyof Property) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: PropertyStatus) => {
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

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    const analyzedProperties = mockProperties.filter(p => p.status === 'Analyzed');
    const totalValue = mockProperties.reduce((sum, p) => sum + (p.askingPrice || 0), 0);
    const totalUnits = mockProperties.reduce((sum, p) => sum + p.units, 0);
    const avgCapRate = analyzedProperties.reduce((sum, p) => sum + (p.capRate || 0), 0) / (analyzedProperties.length || 1);
    const avgPricePerUnit = totalValue / totalUnits;
    const totalNOI = analyzedProperties.reduce((sum, p) => sum + (p.noi || 0), 0);
    const avgNOIPerUnit = totalNOI / analyzedProperties.reduce((sum, p) => sum + p.units, 0);
    
    return {
      totalProperties: mockProperties.length,
      totalValue,
      avgCapRate,
      avgPricePerUnit,
      avgNOIPerUnit,
      analyzedCount: analyzedProperties.length
    };
  }, []);

  const propertyTypeDistribution = useMemo(() => {
    const distribution = mockProperties.reduce((acc, property) => {
      acc[property.type] = (acc[property.type] || 0) + 1;
      return acc;
    }, {} as Record<PropertyType, number>);
    
    return Object.entries(distribution).map(([type, count]) => ({
      type: type as PropertyType,
      count,
      percentage: (count / mockProperties.length) * 100
    }));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Building2 className="h-8 w-8" />
                Properties
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage and analyze your property portfolio
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Link href="/">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Property
                </Button>
              </Link>
            </div>
          </div>

          {/* Portfolio Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{portfolioMetrics.totalProperties}</div>
                <p className="text-xs text-muted-foreground">
                  {portfolioMetrics.analyzedCount} analyzed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(portfolioMetrics.totalValue)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(portfolioMetrics.avgPricePerUnit)}/unit avg
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Cap Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{portfolioMetrics.avgCapRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Market competitive
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg NOI/Unit</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(portfolioMetrics.avgNOIPerUnit)}</div>
                <p className="text-xs text-muted-foreground">
                  Annual per unit
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[280px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search properties..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="min-w-[150px]">
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as PropertyType | '')}
                  >
                    <option value="">All Types</option>
                    <option value="multifamily">Multifamily</option>
                    <option value="commercial">Commercial</option>
                    <option value="mixed-use">Mixed-Use</option>
                    <option value="single-family">Single Family</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="min-w-[150px]">
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as PropertyStatus | '')}
                  >
                    <option value="">All Statuses</option>
                    <option value="Analyzed">Analyzed</option>
                    <option value="Processing">Processing</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Pending">Pending</option>
                    <option value="Acquired">Acquired</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Properties Table */}
          <Card>
            <CardHeader>
              <CardTitle>Properties ({filteredAndSortedProperties.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">
                        <button 
                          className="flex items-center gap-1 font-medium hover:text-primary"
                          onClick={() => handleSort('name')}
                        >
                          Property
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button 
                          className="flex items-center gap-1 font-medium hover:text-primary"
                          onClick={() => handleSort('type')}
                        >
                          Type
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button 
                          className="flex items-center gap-1 font-medium hover:text-primary"
                          onClick={() => handleSort('units')}
                        >
                          Units
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button 
                          className="flex items-center gap-1 font-medium hover:text-primary"
                          onClick={() => handleSort('capRate')}
                        >
                          Cap Rate
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button 
                          className="flex items-center gap-1 font-medium hover:text-primary"
                          onClick={() => handleSort('askingPrice')}
                        >
                          Price
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">Viability</th>
                      <th className="text-left py-3 px-4">
                        <button 
                          className="flex items-center gap-1 font-medium hover:text-primary"
                          onClick={() => handleSort('status')}
                        >
                          Status
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button 
                          className="flex items-center gap-1 font-medium hover:text-primary"
                          onClick={() => handleSort('dateCreated')}
                        >
                          Date
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedProperties.map((property) => (
                      <tr key={property.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{property.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {property.location}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="capitalize">
                            {property.type.replace('-', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{property.units}</div>
                          {property.pricePerUnit && (
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(property.pricePerUnit)}/unit
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {property.capRate ? (
                            <div className="font-medium text-green-600">
                              {property.capRate.toFixed(1)}%
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">
                            {property.askingPrice ? formatCurrency(property.askingPrice) : '-'}
                          </div>
                          {property.noi && (
                            <div className="text-sm text-muted-foreground">
                              NOI: {formatCurrency(property.noi)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {property.viabilityScore ? (
                            <Badge variant="outline" className={getViabilityColor(property.viabilityScore)}>
                              {property.viabilityScore}/100
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={getStatusColor(property.status)}>
                            {property.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(property.dateCreated).toLocaleDateString()}
                            </div>
                            {property.dateAnalyzed && (
                              <div className="text-muted-foreground text-xs mt-1">
                                Analyzed: {new Date(property.dateAnalyzed).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Link href={`/properties/${property.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredAndSortedProperties.length === 0 && (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">No properties found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Try adjusting your search or filter criteria
                    </p>
                    <Link href="/">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Property
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Property Type Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Property Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {propertyTypeDistribution.map(({ type, count, percentage }) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span className="capitalize font-medium">{type.replace('-', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{count} properties</span>
                        <span className="font-medium">{percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Properties Analyzed</span>
                    <span className="font-bold">{portfolioMetrics.analyzedCount}/{portfolioMetrics.totalProperties}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${(portfolioMetrics.analyzedCount / portfolioMetrics.totalProperties) * 100}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">High Viability Properties</span>
                    <span className="font-bold text-green-600">
                      {mockProperties.filter(p => (p.viabilityScore || 0) >= 80).length}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Units</span>
                    <span className="font-bold">
                      {mockProperties.reduce((sum, p) => sum + p.units, 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
