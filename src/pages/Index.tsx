
import React, { useState } from 'react';
import { Flight, ConnectionFlight, SearchParams, SearchResults } from '../types/flightTypes';
import { searchFlights } from '../utils/flightUtils';
import Header from '../components/Header';
import SearchPanel from '../components/SearchPanel';
import FlightMap from '../components/FlightMap';
import { toast } from '@/components/ui/use-toast';

const Index = () => {
  const [searchResults, setSearchResults] = useState<SearchResults>({
    directFlights: [],
    connectingFlights: [],
    loading: false,
    error: null
  });
  
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Handle search
  const handleSearch = async (params: SearchParams) => {
    setSearchResults(prev => ({ ...prev, loading: true, error: null }));
    setSelectedFlightId(null);
    
    try {
      // Perform search
      const results = await searchFlights(params.from, params.to, params.date);
      
      setSearchResults({
        directFlights: results.directFlights,
        connectingFlights: results.connectingFlights,
        loading: false,
        error: null
      });
      
      setHasSearched(true);
      
      // Show toast with results summary
      const totalFlights = results.directFlights.length + results.connectingFlights.length;
      
      if (totalFlights > 0) {
        toast({
          title: `Found ${totalFlights} flights`,
          description: `Click or hover over flight paths to see details`,
          duration: 3000,
        });
      } else {
        toast({
          title: "No flights found",
          description: "Try different airports or dates",
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      setSearchResults({
        directFlights: [],
        connectingFlights: [],
        loading: false,
        error: 'Failed to search flights. Please try again.'
      });
      
      toast({
        title: "Search failed",
        description: "An error occurred while searching for flights",
        variant: "destructive",
        duration: 3000,
      });
    }
  };
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <Header />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <SearchPanel onSearch={handleSearch} loading={searchResults.loading} />
            
            {/* Info text instead of flight list */}
            {hasSearched && !searchResults.loading && (
              <div className="mt-6 glass-panel rounded-2xl p-6 animate-slide-up">
                <h3 className="text-lg font-semibold mb-2">Flight Visualization</h3>
                <p className="text-muted-foreground">
                  {searchResults.directFlights.length + searchResults.connectingFlights.length > 0 
                    ? "Hover over or click on flight paths and planes to see details." 
                    : "No flights found. Try different airports or dates."}
                </p>
                
                <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                  <h4 className="text-sm font-medium text-primary mb-1">Legend</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-[#4CAF50] mr-2"></div>
                      <span>Direct Flights</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-[#FFC107] mr-2"></div>
                      <span>Connecting Flights</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="h-[500px] lg:h-[calc(100vh-200px)] lg:col-span-3 border border-muted rounded-2xl overflow-hidden shadow-lg">
            <FlightMap
              directFlights={searchResults.directFlights}
              connectingFlights={searchResults.connectingFlights}
              selectedFlightId={selectedFlightId}
              loading={searchResults.loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
