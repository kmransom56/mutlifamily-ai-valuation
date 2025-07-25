// Property database service - mock implementation
import { Property, PropertyAnalysis, PropertyFilter, Unit } from '@/types/property';
import { FinancialInputs } from '@/lib/financial-calculations';

export interface SavePropertyRequest {
  name: string;
  type: Property['type'];
  location: string;
  units: number;
  userId: string;
  financialData?: FinancialInputs;
  notes?: string;
}

export interface UpdatePropertyRequest extends Partial<SavePropertyRequest> {
  id: string;
  status?: Property['status'];
}

export interface PropertySearchOptions {
  userId?: string;
  limit?: number;
  offset?: number;
  sortBy?: keyof Property;
  sortOrder?: 'asc' | 'desc';
  filter?: PropertyFilter;
}

// Mock database storage
let mockProperties: Property[] = [
  {
    id: '1',
    name: 'Sunset Apartments',
    type: 'multifamily',
    units: 48,
    location: 'Seattle, WA',
    status: 'Analyzed',
    dateCreated: '2025-01-15T00:00:00Z',
    dateAnalyzed: '2025-01-20T00:00:00Z',
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
    investmentStrategy: 'Value-add through unit renovations',
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
      }
    ]
  },
  {
    id: '2',
    name: 'Downtown Lofts',
    type: 'mixed-use',
    units: 24,
    location: 'Portland, OR',
    status: 'Processing',
    dateCreated: '2025-01-18T00:00:00Z',
    askingPrice: 3200000,
    pricePerUnit: 133333,
    grossIncome: 288000,
    operatingExpenses: 115200,
    notes: 'Urban mixed-use development with retail on ground floor.'
  }
];

let mockAnalyses: PropertyAnalysis[] = [];
let mockUnits: Unit[] = [];

// Property CRUD operations
export class PropertyDatabase {
  static async saveProperty(data: SavePropertyRequest): Promise<Property> {
    const newProperty: Property = {
      id: (mockProperties.length + 1).toString(),
      name: data.name,
      type: data.type,
      location: data.location,
      units: data.units,
      status: 'Pending',
      dateCreated: new Date().toISOString(),
      notes: data.notes,
      // Financial data will be populated when analysis is run
    };

    mockProperties.push(newProperty);
    return newProperty;
  }

  static async updateProperty(data: UpdatePropertyRequest): Promise<Property | null> {
    const index = mockProperties.findIndex(p => p.id === data.id);
    if (index === -1) return null;

    const updatedProperty: Property = {
      ...mockProperties[index],
      ...data,
      dateCreated: mockProperties[index].dateCreated, // Keep original creation date
    };

    mockProperties[index] = updatedProperty;
    return updatedProperty;
  }

  static async getProperty(id: string, userId?: string): Promise<Property | null> {
    const property = mockProperties.find(p => p.id === id);
    
    // In production, you would check if user has access to this property
    if (!property) return null;
    
    return property;
  }

  static async deleteProperty(id: string, userId: string): Promise<boolean> {
    const index = mockProperties.findIndex(p => p.id === id);
    if (index === -1) return false;

    // In production, verify user owns this property or is admin
    mockProperties.splice(index, 1);
    
    // Also delete related data
    mockAnalyses = mockAnalyses.filter(a => a.propertyId !== id);
    mockUnits = mockUnits.filter(u => u.propertyId !== id);
    
    return true;
  }

  static async searchProperties(options: PropertySearchOptions = {}): Promise<{
    properties: Property[];
    total: number;
    hasMore: boolean;
  }> {
    let filtered = [...mockProperties];

    // Apply filters
    if (options.filter) {
      const filter = options.filter;
      
      if (filter.search) {
        const search = filter.search.toLowerCase();
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(search) ||
          p.location.toLowerCase().includes(search)
        );
      }

      if (filter.type) {
        filtered = filtered.filter(p => p.type === filter.type);
      }

      if (filter.status) {
        filtered = filtered.filter(p => p.status === filter.status);
      }

      if (filter.location) {
        filtered = filtered.filter(p => 
          p.location.toLowerCase().includes(filter.location!.toLowerCase())
        );
      }

      if (filter.minUnits !== undefined) {
        filtered = filtered.filter(p => p.units >= filter.minUnits!);
      }

      if (filter.maxUnits !== undefined) {
        filtered = filtered.filter(p => p.units <= filter.maxUnits!);
      }

      if (filter.minCapRate !== undefined) {
        filtered = filtered.filter(p => (p.capRate || 0) >= filter.minCapRate!);
      }

      if (filter.maxCapRate !== undefined) {
        filtered = filtered.filter(p => (p.capRate || 0) <= filter.maxCapRate!);
      }

      if (filter.minPrice !== undefined) {
        filtered = filtered.filter(p => (p.askingPrice || 0) >= filter.minPrice!);
      }

      if (filter.maxPrice !== undefined) {
        filtered = filtered.filter(p => (p.askingPrice || 0) <= filter.maxPrice!);
      }

      if (filter.dateFrom) {
        filtered = filtered.filter(p => p.dateCreated >= filter.dateFrom!);
      }

      if (filter.dateTo) {
        filtered = filtered.filter(p => p.dateCreated <= filter.dateTo!);
      }
    }

    // Apply sorting
    const sortBy = options.sortBy || 'dateCreated';
    const sortOrder = options.sortOrder || 'desc';

    filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    const total = filtered.length;
    const paginatedProperties = filtered.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      properties: paginatedProperties,
      total,
      hasMore,
    };
  }

  // Property Analysis operations
  static async saveAnalysis(analysis: Omit<PropertyAnalysis, 'id' | 'createdAt'>): Promise<PropertyAnalysis> {
    const newAnalysis: PropertyAnalysis = {
      ...analysis,
      id: (mockAnalyses.length + 1).toString(),
      createdAt: new Date().toISOString(),
    };

    mockAnalyses.push(newAnalysis);

    // Update property with analysis results
    const property = mockProperties.find(p => p.id === analysis.propertyId);
    if (property) {
      property.status = 'Analyzed';
      property.dateAnalyzed = new Date().toISOString();
      property.capRate = analysis.capRate;
      property.noi = analysis.noi;
      property.cashOnCashReturn = analysis.cashOnCashReturn;
      property.irr = analysis.irr;
      property.equityMultiple = analysis.equityMultiple;
      property.dscr = analysis.dscr;
      property.ltv = analysis.ltv;
      property.viabilityScore = analysis.viabilityScore;
    }

    return newAnalysis;
  }

  static async getAnalysis(propertyId: string): Promise<PropertyAnalysis | null> {
    return mockAnalyses.find(a => a.propertyId === propertyId) || null;
  }

  static async getAnalysisHistory(propertyId: string): Promise<PropertyAnalysis[]> {
    return mockAnalyses.filter(a => a.propertyId === propertyId);
  }

  // Unit management
  static async saveUnits(propertyId: string, units: Omit<Unit, 'id' | 'propertyId'>[]): Promise<Unit[]> {
    // Remove existing units for this property
    mockUnits = mockUnits.filter(u => u.propertyId !== propertyId);

    // Add new units
    const newUnits: Unit[] = units.map((unit, index) => ({
      ...unit,
      id: `${propertyId}-unit-${index + 1}`,
      propertyId,
    }));

    mockUnits.push(...newUnits);
    return newUnits;
  }

  static async getUnits(propertyId: string): Promise<Unit[]> {
    return mockUnits.filter(u => u.propertyId === propertyId);
  }

  static async updateUnit(unitId: string, updates: Partial<Unit>): Promise<Unit | null> {
    const index = mockUnits.findIndex(u => u.id === unitId);
    if (index === -1) return null;

    mockUnits[index] = { ...mockUnits[index], ...updates };
    return mockUnits[index];
  }

  // Utility functions
  static async getPropertiesByUser(userId: string): Promise<Property[]> {
    // In production, filter by actual user ownership
    return mockProperties;
  }

  static async getUserPropertyCount(userId: string): Promise<number> {
    // In production, count user's properties
    return mockProperties.length;
  }

  static async getPortfolioMetrics(userId: string): Promise<{
    totalProperties: number;
    totalValue: number;
    avgCapRate: number;
    totalUnits: number;
    analyzedCount: number;
  }> {
    const userProperties = await this.getPropertiesByUser(userId);
    const analyzedProperties = userProperties.filter(p => p.status === 'Analyzed');
    
    return {
      totalProperties: userProperties.length,
      totalValue: userProperties.reduce((sum, p) => sum + (p.askingPrice || 0), 0),
      avgCapRate: analyzedProperties.reduce((sum, p) => sum + (p.capRate || 0), 0) / (analyzedProperties.length || 1),
      totalUnits: userProperties.reduce((sum, p) => sum + p.units, 0),
      analyzedCount: analyzedProperties.length,
    };
  }

  // Batch operations
  static async bulkUpdateStatus(propertyIds: string[], status: Property['status']): Promise<number> {
    let updatedCount = 0;
    
    for (const id of propertyIds) {
      const index = mockProperties.findIndex(p => p.id === id);
      if (index !== -1) {
        mockProperties[index].status = status;
        updatedCount++;
      }
    }
    
    return updatedCount;
  }

  static async duplicateProperty(id: string, newName?: string): Promise<Property | null> {
    const original = mockProperties.find(p => p.id === id);
    if (!original) return null;

    const duplicate: Property = {
      ...original,
      id: (mockProperties.length + 1).toString(),
      name: newName || `${original.name} (Copy)`,
      status: 'Pending',
      dateCreated: new Date().toISOString(),
      dateAnalyzed: undefined,
      // Reset analysis data
      capRate: undefined,
      noi: undefined,
      cashOnCashReturn: undefined,
      irr: undefined,
      equityMultiple: undefined,
      dscr: undefined,
      ltv: undefined,
      viabilityScore: undefined,
      files: [], // Don't copy files
    };

    mockProperties.push(duplicate);
    return duplicate;
  }
}

// Export utility functions
export const propertyDatabase = PropertyDatabase;