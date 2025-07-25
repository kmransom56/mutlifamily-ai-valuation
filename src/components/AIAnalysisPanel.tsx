'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Target,
  FileText,
  BarChart3,
  Lightbulb,
  Clock,
  RefreshCw,
  Loader2,
  Star,
  ArrowRight
} from 'lucide-react';
import { useMCP } from '@/hooks/useMCP';
import { Property, PropertyFile } from '@/types/property';
import { AIAnalysisResponse, MarketInsight } from '@/lib/mcp-client';

export interface AIAnalysisPanelProps {
  property: Property;
  documents?: PropertyFile[];
  onAnalysisComplete?: (results: any) => void;
  className?: string;
}

export default function AIAnalysisPanel({
  property,
  documents = [],
  onAnalysisComplete,
  className = ''
}: AIAnalysisPanelProps) {
  const [analysisType, setAnalysisType] = useState<'quick' | 'comprehensive'>('quick');
  const [showResults, setShowResults] = useState(false);

  const {
    mcpSession,
    loading,
    error,
    analysisResults,
    marketInsights,
    documentResults,
    isInitialized,
    initializeSession,
    analyzeProperty,
    processDocuments,
    getMarketInsights,
    runComprehensiveAnalysis,
    clearError
  } = useMCP({
    autoInitialize: true,
    onAnalysisComplete: (results) => {
      setShowResults(true);
      onAnalysisComplete?.(results);
    }
  });

  const runQuickAnalysis = async () => {
    try {
      if (!isInitialized) {
        await initializeSession();
      }

      await analyzeProperty({
        type: 'property_analysis',
        propertyId: property.id,
        documents: documents,
        parameters: {
          location: property.location,
          propertyType: property.type,
          units: property.units,
          capRate: property.capRate,
          noi: property.noi
        },
        contextData: {
          property,
          documents
        }
      });
    } catch (err) {
      console.error('Quick analysis failed:', err);
    }
  };

  const runComprehensiveAnalysisFlow = async () => {
    try {
      if (!isInitialized) {
        await initializeSession();
      }

      const results = await runComprehensiveAnalysis(
        property.id,
        documents,
        {
          location: property.location,
          propertyType: property.type,
          units: property.units,
          capRate: property.capRate,
          noi: property.noi,
          property,
          documents
        }
      );

      onAnalysisComplete?.(results);
    } catch (err) {
      console.error('Comprehensive analysis failed:', err);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp className="h-4 w-4" />;
      case 'opportunity': return <Lightbulb className="h-4 w-4" />;
      case 'comparison': return <BarChart3 className="h-4 w-4" />;
      case 'forecast': return <Target className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'bg-green-100 text-green-800 border-green-200';
      case 'negative': return 'bg-red-100 text-red-800 border-red-200';
      case 'neutral': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* AI Analysis Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI-Powered Property Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-sm text-red-700">{error}</span>
                <Button variant="ghost" size="sm" onClick={clearError} className="ml-auto">
                  ×
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="quick"
                  name="analysisType"
                  value="quick"
                  checked={analysisType === 'quick'}
                  onChange={(e) => setAnalysisType(e.target.value as 'quick')}
                  className="w-4 h-4 text-purple-600"
                />
                <label htmlFor="quick" className="text-sm font-medium">
                  Quick Analysis
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="comprehensive"
                  name="analysisType"
                  value="comprehensive"
                  checked={analysisType === 'comprehensive'}
                  onChange={(e) => setAnalysisType(e.target.value as 'comprehensive')}
                  className="w-4 h-4 text-purple-600"
                />
                <label htmlFor="comprehensive" className="text-sm font-medium">
                  Comprehensive Analysis
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={analysisType === 'quick' ? runQuickAnalysis : runComprehensiveAnalysisFlow}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Run {analysisType === 'quick' ? 'Quick' : 'Comprehensive'} Analysis
                  </>
                )}
              </Button>

              {!isInitialized && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  MCP Session Required
                </Badge>
              )}

              {documents.length > 0 && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  {documents.length} documents available
                </div>
              )}
            </div>

            {analysisType === 'comprehensive' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Comprehensive Analysis Includes:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Advanced property financial analysis</li>
                  <li>• Market insights and comparable properties</li>
                  <li>• Document processing and data extraction</li>
                  <li>• Investment recommendations and risk assessment</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading Progress */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing Analysis...</span>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <Clock className="h-4 w-4 text-gray-500" />
                </div>
              </div>
              <Progress value={65} className="w-full" />
              <p className="text-xs text-gray-600">
                Our AI is analyzing property data, market conditions, and generating insights...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysisResults && showResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Analysis Results
              <Badge variant="outline" className={getConfidenceColor(analysisResults.results.confidence)}>
                {Math.round(analysisResults.results.confidence * 100)}% Confidence
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Score */}
            {analysisResults.results.analysis && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysisResults.results.analysis.overallScore}
                  </div>
                  <div className="text-sm text-purple-700">Overall Score</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {analysisResults.results.analysis.locationScore}
                  </div>
                  <div className="text-sm text-blue-700">Location</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {analysisResults.results.analysis.financialScore}
                  </div>
                  <div className="text-sm text-green-700">Financial</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {analysisResults.results.analysis.marketScore}
                  </div>
                  <div className="text-sm text-orange-700">Market</div>
                </div>
              </div>
            )}

            {/* Key Insights */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Key Insights
              </h4>
              <div className="space-y-2">
                {analysisResults.results.insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Recommendations
              </h4>
              <div className="space-y-2">
                {analysisResults.results.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Factors */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Risk Factors
              </h4>
              <div className="space-y-2">
                {analysisResults.results.riskFactors.map((risk, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{risk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Processing Stats */}
            <div className="pt-4 border-t flex items-center justify-between text-sm text-gray-600">
              <div>Processing time: {analysisResults.processingTime}ms</div>
              <div>Tokens used: {analysisResults.tokensUsed.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Insights */}
      {marketInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Market Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {marketInsights.map((insight, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getInsightIcon(insight.type)}
                      <h4 className="font-medium">{insight.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getImpactColor(insight.impact)}>
                        {insight.impact}
                      </Badge>
                      <span className={`text-sm ${getConfidenceColor(insight.confidence)}`}>
                        {Math.round(insight.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{insight.timeframe}</span>
                    <span>{insight.dataSource}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Processing Results */}
      {documentResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documentResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{result.type.replace('_', ' ').toUpperCase()}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={
                        result.quality === 'high' ? 'text-green-800 border-green-300' :
                        result.quality === 'medium' ? 'text-yellow-800 border-yellow-300' :
                        'text-red-800 border-red-300'
                      }>
                        {result.quality} quality
                      </Badge>
                      <span className={`text-sm ${getConfidenceColor(result.confidence)}`}>
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  
                  {result.insights.length > 0 && (
                    <div className="space-y-1">
                      {result.insights.map((insight, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <ArrowRight className="h-3 w-3 text-gray-400 mt-1 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{insight}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.issues.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {result.issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-orange-700">
                          <AlertTriangle className="h-3 w-3 mt-1 flex-shrink-0" />
                          {issue}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {(analysisResults || marketInsights.length > 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Export Analysis
              </Button>
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Analysis
              </Button>
              <Button>
                <ArrowRight className="h-4 w-4 mr-2" />
                Generate Pitch Deck
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}