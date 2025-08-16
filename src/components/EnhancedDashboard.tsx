'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  MapPin, 
  Building2,
  DollarSign,
  Target,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface DashboardData {
  portfolio: {
    total_properties: number;
    total_value: number;
    total_units: number;
    avg_cap_rate: number;
    avg_occupancy: number;
    monthly_noi: number;
  };
  performance: {
    ytd_return: number;
    total_return: number;
    cash_on_cash: number;
    irr: number;
  };
  market_metrics: {
    avg_price_per_unit: number;
    market_cap_rate: number;
    absorption_rate: number;
    days_on_market: number;
  };
  recent_activities: Array<{
    id: string;
    type: 'acquisition' | 'disposition' | 'analysis' | 'valuation';
    property: string;
    date: string;
    value?: number;
    status: 'completed' | 'pending' | 'in_progress';
  }>;
  alerts: Array<{
    id: string;
    type: 'opportunity' | 'risk' | 'maintenance' | 'market';
    message: string;
    severity: 'low' | 'medium' | 'high';
    date: string;
  }>;
}

interface EnhancedDashboardProps {
  data?: DashboardData;
  onRefresh?: () => void;
  onExportReport?: () => void;
}

export default function EnhancedDashboard({ 
  data, 
  onRefresh, 
  onExportReport 
}: EnhancedDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data if none provided
  const dashboardData: DashboardData = data || {
    portfolio: {
      total_properties: 12,
      total_value: 145000000,
      total_units: 1247,
      avg_cap_rate: 0.0625,
      avg_occupancy: 0.943,
      monthly_noi: 756000
    },
    performance: {
      ytd_return: 0.087,
      total_return: 0.142,
      cash_on_cash: 0.095,
      irr: 0.118
    },
    market_metrics: {
      avg_price_per_unit: 148500,
      market_cap_rate: 0.058,
      absorption_rate: 0.73,
      days_on_market: 67
    },
    recent_activities: [
      {
        id: '1',
        type: 'analysis',
        property: 'Sunset Ridge Apartments',
        date: '2025-08-05',
        status: 'completed'
      },
      {
        id: '2', 
        type: 'valuation',
        property: 'Highland Park Residences',
        date: '2025-08-04',
        value: 24000000,
        status: 'completed'
      },
      {
        id: '3',
        type: 'acquisition',
        property: 'Metro Commons',
        date: '2025-08-03',
        value: 18500000,
        status: 'pending'
      }
    ],
    alerts: [
      {
        id: '1',
        type: 'opportunity',
        message: 'Highland Park Residences showing strong buy signal - 18.2% IRR projected',
        severity: 'high',
        date: '2025-08-06'
      },
      {
        id: '2',
        type: 'market',
        message: 'Austin market cap rates compressing - consider accelerated acquisition timeline',
        severity: 'medium', 
        date: '2025-08-05'
      }
    ]
  };

  const formatCurrency = (amount: number, compact = false) => {
    if (compact && amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number, decimals = 1) => {
    return `${(value * 100).toFixed(decimals)}%`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'acquisition': return <Building2 className="h-4 w-4" />;
      case 'disposition': return <TrendingUp className="h-4 w-4" />;
      case 'analysis': return <BarChart3 className="h-4 w-4" />;
      case 'valuation': return <Target className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    if (onRefresh) {
      await onRefresh();
    }
    // Simulate API call
    setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Portfolio Dashboard</h2>
          <p className="text-muted-foreground">Real-time insights and performance analytics</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedTimeframe(period)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedTimeframe === period
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <Zap className="h-4 w-4 mr-2" />
            {isLoading ? 'Updating...' : 'Refresh'}
          </Button>
          <Button onClick={onExportReport}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.portfolio.total_value, true)}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.portfolio.total_properties} properties • {dashboardData.portfolio.total_units.toLocaleString()} units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Return</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{formatPercentage(dashboardData.performance.ytd_return)}
            </div>
            <p className="text-xs text-muted-foreground">
              IRR: {formatPercentage(dashboardData.performance.irr)} • CoC: {formatPercentage(dashboardData.performance.cash_on_cash)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Cap Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(dashboardData.portfolio.avg_cap_rate)}</div>
            <p className="text-xs text-muted-foreground">
              Market avg: {formatPercentage(dashboardData.market_metrics.market_cap_rate)} • Occupancy: {formatPercentage(dashboardData.portfolio.avg_occupancy)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly NOI</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.portfolio.monthly_noi, true)}</div>
            <p className="text-xs text-muted-foreground">
              Annualized: {formatCurrency(dashboardData.portfolio.monthly_noi * 12, true)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts and Market Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Portfolio Performance ({selectedTimeframe})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Interactive Chart</p>
                <p className="text-xs text-gray-500">Performance visualization will render here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Market Heatmap Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Market Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Geospatial Analysis</p>
                <p className="text-xs text-gray-500">Property locations and market data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recent_activities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getActivityIcon(activity.type)}
                    <div>
                      <p className="font-medium">{activity.property}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} • {activity.date}
                        {activity.value && ` • ${formatCurrency(activity.value, true)}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={getActivityColor(activity.status)}>
                    {activity.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Smart Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Smart Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getAlertIcon(alert.severity)}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} • {alert.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Metrics Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Intelligence Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-xl font-semibold">{formatCurrency(dashboardData.market_metrics.avg_price_per_unit, true)}</div>
              <p className="text-sm text-muted-foreground">Avg Price/Unit</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold">{formatPercentage(dashboardData.market_metrics.market_cap_rate)}</div>
              <p className="text-sm text-muted-foreground">Market Cap Rate</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold">{formatPercentage(dashboardData.market_metrics.absorption_rate)}</div>
              <p className="text-sm text-muted-foreground">Absorption Rate</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold">{dashboardData.market_metrics.days_on_market}</div>
              <p className="text-sm text-muted-foreground">Avg Days on Market</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}