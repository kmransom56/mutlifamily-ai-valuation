// INTEGRATION EXAMPLE - Add this to your existing property page component

import PitchDeckButton from '@/components/PitchDeckButton';

// Your existing property page component
export default function PropertyPage() {
  
  // Sample Lake Apartments data for testing
  const samplePropertyData = {
    name: "Lake Apartments",
    address: "30853 14th Avenue S, Federal Way, WA 98003",
    units: 16,
    purchase_price: 2995000,
    cap_rate: 6.2,
    noi: 185554,
    building_sf: 12800,
    year_built: 1985,
    cash_on_cash: 8.5,
    irr: 12.2,
    equity_multiple: 1.8,
    value_add_opportunities: [
      "Income upside: $46,389 (25% increase potential)",
      "Unit renovation and rent optimization", 
      "Operational efficiency improvements",
      "Market positioning enhancement"
    ]
  };

  return (
    <div className="property-page">
      {/* Your existing property content */}
      <h1>Property Analysis Dashboard</h1>
      
      {/* Add the Pitch Deck Button */}
      <div className="mt-8">
        <PitchDeckButton 
          propertyId="lake_apartments_001"
          propertyData={samplePropertyData}
          onSuccess={(result) => {
            console.log('Pitch deck generated successfully:', result);
            // Optional: Show success notification, update UI, etc.
          }}
        />
      </div>
      
      {/* Your existing content continues... */}
    </div>
  );
}