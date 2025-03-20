
import React, { useState, useEffect } from 'react';
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
  const [animationInProgress, setAnimationInProgress] = useState(false);
  
  // Handle search
  const handleSearch = async (params: SearchParams) => {
    setSearchResults(prev => ({ ...prev, loading: true, error: null }));
    setSelectedFlightId(null);
    setAnimationInProgress(true);
    
    try {
      // Show searching toast
      toast({
        title: "Searching for flights",
        description: `Finding routes from ${params.from} to ${params.to}`,
        duration: 2000,
      });
      
      // Perform search
      const results = await searchFlights(params.from, params.to, params.date);
      
      setSearchResults({
        directFlights: results.directFlights,
        connectingFlights: results.connectingFlights,
        loading: false,
        error: null
      });
      
      setHasSearched(true);
      
      // Show toast with animation guidance
      const totalFlights = results.directFlights.length + results.connectingFlights.length;
      
      if (totalFlights > 0) {
        toast({
          title: `Found ${totalFlights} flights`,
          description: `Animation sequence starting: 1) Zoom to origin, 2) Draw flight paths, 3) Planes take off and fly along routes`,
          duration: 10000, // Longer duration to ensure users see it
        });
        
        // Reset animation flag after a longer while to ensure all animations complete
        // Increase this timeout to allow all animations to fully complete
        setTimeout(() => {
          setAnimationInProgress(false);
        }, 40000); // Significantly increased to allow full animation sequences to complete
      } else {
        toast({
          title: "No flights found",
          description: "Try different airports or dates",
          variant: "destructive",
          duration: 3000,
        });
        setAnimationInProgress(false);
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
      
      setAnimationInProgress(false);
    }
  };
  
  // Show animation guidance toast on initial load
  useEffect(() => {
    if (!hasSearched && searchResults.directFlights.length === 0 && searchResults.connectingFlights.length === 0) {
      toast({
        title: "Welcome to Flight Explorer",
        description: "Search for flights to see animated routes and information",
        duration: 4000,
      });
    }
  }, []);
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <Header />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <SearchPanel onSearch={handleSearch} loading={searchResults.loading} />
            
            {/* Flight information legend */}
            {hasSearched && !searchResults.loading && (
              <div className="mt-6 glass-panel rounded-2xl p-6 animate-fade-in">
                <h3 className="text-lg font-semibold mb-2">Flight Visualization</h3>
                <p className="text-muted-foreground">
                  {searchResults.directFlights.length + searchResults.connectingFlights.length > 0 
                    ? "Hover over flight paths for airline info. Click for full details." 
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
                
                {/* Display total flights count */}
                <div className="mt-4 text-sm text-muted-foreground">
                  <div>Direct Flights: <span className="font-medium">{searchResults.directFlights.length}</span></div>
                  <div>Connecting Flights: <span className="font-medium">{searchResults.connectingFlights.length}</span></div>
                </div>
                
                {/* Animation status indicator */}
                {animationInProgress && (
                  <div className="mt-4 p-3 bg-accent/30 rounded-lg text-xs">
                    <h4 className="text-sm font-medium mb-1 flex items-center">
                      <span className="w-3 h-3 rounded-full bg-accent mr-2 animate-pulse"></span>
                      Animation in Progress
                    </h4>
                    <p>Animation Steps:</p>
                    <ol className="list-decimal list-inside space-y-1 mt-1">
                      <li>Zoom to origin airport</li>
                      <li className="border-l-2 border-[#4CAF50] pl-2 ml-2 py-1">Draw flight path lines</li>
                      <li className="border-l-2 border-amber-500 pl-2 ml-2 py-1">Show takeoff effect</li>
                      <li className="border-l-2 border-sky-500 pl-2 ml-2 py-1">Planes fly along routes</li>
                      <li className="border-l-2 border-[#4CAF50] pl-2 ml-2 py-1">Landing effect at destination</li>
                    </ol>
                    <p className="mt-2 text-xs text-muted-foreground italic">The complete animation sequence takes about 20-30 seconds per flight.</p>
                  </div>
                )}
                
                {/* Interaction tips */}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs">
                  <h4 className="text-sm font-medium mb-1">Interaction Tips</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Hover over flight paths to see airline info</li>
                    <li>Click on flight paths or planes for detailed info</li>
                    <li>Popups stay open until you close them</li>
                    <li>Use the map controls for different views</li>
                  </ul>
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
