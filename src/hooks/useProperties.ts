import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Property, PropertyFilter } from '@/types/property';
import { FinancialInputs } from '@/lib/financial-calculations';

export interface UsePropertiesOptions {
  initialLimit?: number;
  initialSortBy?: keyof Property;
  initialSortOrder?: 'asc' | 'desc';
  onError?: (error: string) => void;
}

export interface PropertySearchParams {
  limit?: number;
  offset?: number;
  sortBy?: keyof Property;
  sortOrder?: 'asc' | 'desc';
  filter?: PropertyFilter;
}

export function useProperties(options: UsePropertiesOptions = {}) {
  const { data: session } = useSession();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const searchProperties = useCallback(async (params: PropertySearchParams = {}) => {
    if (!session?.user) {
      setError('Authentication required');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      
      if (params.limit) searchParams.set('limit', params.limit.toString());
      if (params.offset) searchParams.set('offset', params.offset.toString());
      if (params.sortBy) searchParams.set('sortBy', params.sortBy as string);
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

      // Add filter parameters
      if (params.filter) {
        Object.entries(params.filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, value.toString());
          }
        });
      }

      const response = await fetch(`/api/properties?${searchParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch properties');
      }

      const data = await response.json();
      
      if (params.offset && params.offset > 0) {
        // Appending to existing properties (pagination)
        setProperties(prev => [...prev, ...data.properties]);
      } else {
        // Replace properties (new search)
        setProperties(data.properties);
      }
      
      setTotal(data.total);
      setHasMore(data.hasMore);
      
      return data.properties;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch properties';
      setError(errorMessage);
      options.onError?.(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [session, options]);

  const saveProperty = useCallback(async (propertyData: {
    name: string;
    type: Property['type'];
    location: string;
    units: number;
    financialData?: FinancialInputs;
    notes?: string;
  }) => {
    if (!session?.user) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(propertyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save property');
      }

      const data = await response.json();
      
      // Add new property to the beginning of the list
      setProperties(prev => [data.property, ...prev]);
      setTotal(prev => prev + 1);
      
      return data.property;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save property';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, options]);

  const updateProperty = useCallback(async (id: string, updates: Partial<Property>) => {
    if (!session?.user) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update property');
      }

      const data = await response.json();
      
      // Update property in the list
      setProperties(prev => 
        prev.map(prop => prop.id === id ? data.property : prop)
      );
      
      return data.property;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update property';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, options]);

  const deleteProperty = useCallback(async (id: string) => {
    if (!session?.user) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/properties/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete property');
      }

      // Remove property from the list
      setProperties(prev => prev.filter(prop => prop.id !== id));
      setTotal(prev => prev - 1);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete property';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, options]);

  const getProperty = useCallback(async (id: string) => {
    if (!session?.user) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/properties/${id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch property');
      }

      const data = await response.json();
      return data.property;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch property';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, options]);

  const analyzeProperty = useCallback(async (id: string, financialInputs: FinancialInputs) => {
    if (!session?.user) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/properties/${id}/analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(financialInputs),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze property');
      }

      const data = await response.json();
      
      // Update property status in the list
      setProperties(prev => 
        prev.map(prop => 
          prop.id === id 
            ? { ...prop, status: 'Analyzed', dateAnalyzed: new Date().toISOString() }
            : prop
        )
      );
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze property';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, options]);

  const bulkUpdateStatus = useCallback(async (propertyIds: string[], status: Property['status']) => {
    if (!session?.user) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/properties', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'bulkUpdateStatus',
          propertyIds,
          status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update properties');
      }

      const data = await response.json();
      
      // Update properties in the list
      setProperties(prev => 
        prev.map(prop => 
          propertyIds.includes(prop.id) 
            ? { ...prop, status }
            : prop
        )
      );
      
      return data.updatedCount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update properties';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, options]);

  return {
    // State
    properties,
    loading,
    error,
    total,
    hasMore,

    // Actions
    searchProperties,
    saveProperty,
    updateProperty,
    deleteProperty,
    getProperty,
    analyzeProperty,
    bulkUpdateStatus,
    clearError,
  };
}