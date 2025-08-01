import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Presentation, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface PitchDeckButtonProps {
  propertyId?: string;
  propertyData?: any;
  onSuccess?: (result: any) => void;
}

export default function PitchDeckButton({ 
  propertyId, 
  propertyData, 
  onSuccess 
}: PitchDeckButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePitchDeck = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Integrates with YOUR existing property analysis data
      const response = await fetch('/api/generate-pitch-deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: propertyId,
          // Uses data from YOUR existing analysis system
          property_data: propertyData,
          include_charts: true,
          template_type: 'investor_presentation'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate pitch deck: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        onSuccess?.(data);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate pitch deck');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (result?.download_url) {
      const link = document.createElement('a');
      link.href = result.download_url;
      link.download = result.filename || 'investor_pitch_deck.pptx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Presentation className="h-5 w-5" />
          Generate Investor Pitch Deck
        </CardTitle>
      </CardHeader>
      <CardContent>
        
        {/* Initial State */}
        {!result && !error && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Create a professional PowerPoint presentation using your property analysis data.
              Includes financial highlights, investment metrics, and professional formatting.
            </p>
            
            <Button 
              onClick={handleGeneratePitchDeck}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Presentation...
                </>
              ) : (
                <>
                  <Presentation className="h-4 w-4 mr-2" />
                  Generate Pitch Deck
                </>
              )}
            </Button>
          </div>
        )}

        {/* Success State */}
        {result && !error && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Pitch Deck Generated Successfully!</span>
              </div>
              
              <div className="mt-2 text-sm text-green-700">
                <p>• {result.slides_generated} professional slides created</p>
                <p>• Financial analysis and charts included</p>
                <p>• Ready for investor presentation</p>
                <p>• Generated from your property analysis data</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download PowerPoint
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setResult(null)}
                className="flex-1"
              >
                Generate New
              </Button>
            </div>

            {result.property_summary && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <h5 className="font-medium text-blue-800 mb-1">Presentation Summary</h5>
                <div className="text-blue-700 grid grid-cols-2 gap-1">
                  <span>Property: {result.property_summary.name}</span>
                  <span>Units: {result.property_summary.units}</span>
                  <span>Cap Rate: {result.property_summary.cap_rate}%</span>
                  <span>Price: ${result.property_summary.purchase_price?.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Generation Failed</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => setError(null)}
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        )}
        
      </CardContent>
    </Card>
  );
}