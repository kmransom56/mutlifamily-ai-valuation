'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Building2, 
  X, 
  MapPin, 
  Home, 
  Loader2,
  AlertCircle,
  CheckCircle2 
} from 'lucide-react';
import { Property, PropertyType } from '@/types/property';
import { useProperties } from '@/hooks/useProperties';

export interface CreatePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (property: Property) => void;
}

export default function CreatePropertyModal({
  isOpen,
  onClose,
  onSuccess
}: CreatePropertyModalProps) {
  const { data: session } = useSession();
  const { saveProperty, loading, error } = useProperties();
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'multifamily' as PropertyType,
    location: '',
    units: '',
    notes: ''
  });
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccess(false);

    // Validation
    if (!formData.name.trim()) {
      setFormError('Property name is required');
      return;
    }
    if (!formData.location.trim()) {
      setFormError('Location is required');
      return;
    }
    if (!formData.units || parseInt(formData.units) <= 0) {
      setFormError('Valid number of units is required');
      return;
    }

    try {
      const property = await saveProperty({
        name: formData.name.trim(),
        type: formData.type,
        location: formData.location.trim(),
        units: parseInt(formData.units),
        notes: formData.notes.trim() || undefined,
      });

      setSuccess(true);
      onSuccess?.(property);
      
      // Reset form
      setFormData({
        name: '',
        type: 'multifamily',
        location: '',
        units: '',
        notes: ''
      });

      // Close modal after short delay to show success
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);

    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create property');
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formError) setFormError('');
  };

  if (!isOpen) return null;

  if (!session?.user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-4">Please sign in to create properties.</p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Property
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-green-900 mb-2">
                Property Created Successfully!
              </h3>
              <p className="text-green-700">
                Your property has been added to your portfolio.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {(formError || error) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-400 mr-2" />
                    <span className="text-sm text-red-700">
                      {formError || error}
                    </span>
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Basic Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Property Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g., Sunset Apartments"
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Property Type *</Label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={loading}
                      required
                    >
                      <option value="multifamily">Multifamily</option>
                      <option value="commercial">Commercial</option>
                      <option value="mixed-use">Mixed-Use</option>
                      <option value="single-family">Single Family</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="e.g., Seattle, WA"
                        className="pl-10"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="units">Number of Units *</Label>
                    <Input
                      id="units"
                      type="number"
                      min="1"
                      value={formData.units}
                      onChange={(e) => handleInputChange('units', e.target.value)}
                      placeholder="e.g., 24"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Add any additional notes about this property..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Property
                </Button>
              </div>

              {/* Help Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Next Steps</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Upload property documents (rent roll, T12, etc.)</li>
                  <li>• Run financial analysis using the calculator</li>
                  <li>• Generate pitch decks for investors</li>
                  <li>• Connect with CRM for investor management</li>
                </ul>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}