import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getMCPClient, MCPSession, AIAnalysisRequest, AIAnalysisResponse, MarketInsight, DocumentProcessingResult } from '@/lib/mcp-client';
import { PropertyFile } from '@/types/property';

export interface UseMCPOptions {
  autoInitialize?: boolean;
  onError?: (error: string) => void;
  onAnalysisComplete?: (results: AIAnalysisResponse) => void;
}

export function useMCP(options: UseMCPOptions = {}) {
  const { data: session } = useSession();
  const [mcpSession, setMcpSession] = useState<MCPSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AIAnalysisResponse | null>(null);
  const [marketInsights, setMarketInsights] = useState<MarketInsight[]>([]);
  const [documentResults, setDocumentResults] = useState<DocumentProcessingResult[]>([]);

  const mcpClient = getMCPClient();

  // Auto-initialize session when user is available
  useEffect(() => {
    if (options.autoInitialize && session?.user && !mcpSession) {
      initializeSession();
    }
  }, [session, options.autoInitialize, mcpSession]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const initializeSession = useCallback(async (context: any = {}) => {
    if (!session?.user) {
      setError('Authentication required for MCP session');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const newSession = await mcpClient.initializeSession(session.user.id, context);
      setMcpSession(newSession);
      return newSession;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize MCP session';
      setError(errorMessage);
      options.onError?.(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [session, mcpClient, options]);

  const analyzeProperty = useCallback(async (request: AIAnalysisRequest) => {
    if (!mcpSession) {
      throw new Error('MCP session not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      const results = await mcpClient.analyzeProperty(request);
      setAnalysisResults(results);
      options.onAnalysisComplete?.(results);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mcpSession, mcpClient, options]);

  const processDocuments = useCallback(async (documents: PropertyFile[], propertyId: string) => {
    if (!mcpSession) {
      throw new Error('MCP session not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      const results = await mcpClient.processDocuments(documents, propertyId);
      setDocumentResults(results);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Document processing failed';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mcpSession, mcpClient, options]);

  const getMarketInsights = useCallback(async (location: string, propertyType: string) => {
    if (!mcpSession) {
      throw new Error('MCP session not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      const insights = await mcpClient.getMarketInsights(location, propertyType);
      setMarketInsights(insights);
      return insights;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get market insights';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mcpSession, mcpClient, options]);

  const generateRecommendations = useCallback(async (propertyId: string, analysisData: any) => {
    if (!mcpSession) {
      throw new Error('MCP session not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      const recommendations = await mcpClient.generateRecommendations(propertyId, analysisData);
      return recommendations;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate recommendations';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mcpSession, mcpClient, options]);

  const runComprehensiveAnalysis = useCallback(async (
    propertyId: string,
    documents: PropertyFile[],
    analysisData: any
  ) => {
    if (!mcpSession) {
      throw new Error('MCP session not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      // Run multiple analyses in parallel for comprehensive insights
      const [
        propertyAnalysis,
        documentProcessing,
        marketInsights,
        recommendations
      ] = await Promise.all([
        analyzeProperty({
          type: 'property_analysis',
          propertyId,
          documents,
          parameters: analysisData,
          contextData: analysisData
        }),
        processDocuments(documents, propertyId),
        getMarketInsights(analysisData.location, analysisData.propertyType),
        generateRecommendations(propertyId, analysisData)
      ]);

      return {
        propertyAnalysis,
        documentProcessing,
        marketInsights,
        recommendations
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Comprehensive analysis failed';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mcpSession, analyzeProperty, processDocuments, getMarketInsights, generateRecommendations, options]);

  const updateContext = useCallback(async (updates: any) => {
    if (!mcpSession) {
      throw new Error('MCP session not initialized');
    }

    try {
      await mcpClient.updateContext(updates);
      // Update local session context
      setMcpSession(prev => prev ? {
        ...prev,
        context: { ...prev.context, ...updates }
      } : null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update context';
      setError(errorMessage);
      options.onError?.(errorMessage);
    }
  }, [mcpSession, mcpClient, options]);

  const closeSession = useCallback(async () => {
    if (!mcpSession) return;

    try {
      await mcpClient.closeSession();
      setMcpSession(null);
      setAnalysisResults(null);
      setMarketInsights([]);
      setDocumentResults([]);
    } catch (err) {
      console.error('Error closing MCP session:', err);
    }
  }, [mcpSession, mcpClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mcpSession) {
        closeSession();
      }
    };
  }, []);

  return {
    // State
    mcpSession,
    loading,
    error,
    analysisResults,
    marketInsights,
    documentResults,
    isInitialized: !!mcpSession,

    // Actions
    initializeSession,
    analyzeProperty,
    processDocuments,
    getMarketInsights,
    generateRecommendations,
    runComprehensiveAnalysis,
    updateContext,
    closeSession,
    clearError,

    // Utility
    mcpClient
  };
}