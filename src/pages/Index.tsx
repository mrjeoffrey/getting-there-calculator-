
import React, { useState } from 'react';
import { Flight, ConnectionFlight, SearchParams, SearchResults } from '../types/flightTypes';
import { searchFlights } from '../utils/flightUtils';
import Header from '../components/Header';
import SearchPanel from '../components/SearchPanel';
import FlightMap from '../components/FlightMap';
import ConnectingFlight from '../components/ConnectingFlight';
import { toast } from '@/components/ui/use-toast';
import { PlaneTakeoff, ArrowUpDown } from 'lucide-react';

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
          description: `${results.directFlights.length} direct and ${results.connectingFlights.length} connecting flights`,
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
  
  // Handle flight selection
  const handleFlightSelect = (id: string) => {
    setSelectedFlightId(prevId => prevId === id ? null : id);
  };
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <Header />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <SearchPanel onSearch={handleSearch} loading={searchResults.loading} />
            
            {hasSearched && !searchResults.loading && searchResults.error === null && (
              <div className="mt-6 glass-panel rounded-2xl p-6 animate-slide-up">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <PlaneTakeoff className="mr-2 h-5 w-5 text-primary" />
                  Available Flights
                </h3>
                
                {searchResults.directFlights.length === 0 && searchResults.connectingFlights.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No flights found. Try different airports or dates.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {searchResults.directFlights.length > 0 && (
                      <div>
                        <div className="flex items-center mb-2">
                          <div className="h-px flex-grow bg-muted" />
                          <span className="px-2 text-xs font-medium text-muted-foreground">
                            DIRECT FLIGHTS
                          </span>
                          <div className="h-px flex-grow bg-muted" />
                        </div>
                        
                        <div className="space-y-3">
                          {searchResults.directFlights.map(flight => (
                            <div 
                              key={flight.id}
                              className={`relative rounded-xl overflow-hidden transition-all duration-300 ${
                                selectedFlightId === flight.id ? 'bg-white shadow-lg scale-[1.02]' : 'bg-white/70 hover:bg-white/90'
                              }`}
                              onClick={() => handleFlightSelect(flight.id)}
                            >
                              {selectedFlightId === flight.id && (
                                <div className="absolute inset-0 border-2 border-primary rounded-xl pointer-events-none" />
                              )}
                              
                              <div className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center text-lg font-semibold">
                                    <span className="mr-2 text-primary">
                                      ${Math.floor(Math.random() * 500) + 300}
                                    </span>
                                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                      Direct
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                      <span>{flight.duration}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-col">
                                    <span className="text-lg font-medium">{flight.departureTime.split('T')[1].substring(0, 5)}</span>
                                    <span className="text-sm text-muted-foreground">{flight.departureAirport.code}</span>
                                  </div>
                                  
                                  <div className="flex-1 flex flex-col items-center mx-4">
                                    <div className="w-full flex items-center">
                                      <div className="h-0.5 flex-1 bg-primary/30" />
                                      <div className="mx-2 p-1 rounded-full bg-primary/20">
                                        <PlaneTakeoff size={14} className="text-primary" />
                                      </div>
                                      <div className="h-0.5 flex-1 bg-primary/30" />
                                    </div>
                                    <span className="text-xs text-muted-foreground mt-1">
                                      Non-stop
                                    </span>
                                  </div>
                                  
                                  <div className="flex flex-col items-end">
                                    <span className="text-lg font-medium">{new Date(flight.arrivalTime).toTimeString().substring(0, 5)}</span>
                                    <span className="text-sm text-muted-foreground">{flight.arrivalAirport.code}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {searchResults.connectingFlights.length > 0 && (
                      <div>
                        <div className="flex items-center mb-2">
                          <div className="h-px flex-grow bg-muted" />
                          <span className="px-2 text-xs font-medium text-muted-foreground">
                            CONNECTING FLIGHTS
                          </span>
                          <div className="h-px flex-grow bg-muted" />
                        </div>
                        
                        <div className="space-y-3">
                          {searchResults.connectingFlights.map(flight => (
                            <ConnectingFlight
                              key={flight.id}
                              flight={flight}
                              isSelected={selectedFlightId === flight.id}
                              onSelect={handleFlightSelect}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="h-[500px] lg:h-[calc(100vh-200px)] lg:col-span-2 border border-muted rounded-2xl overflow-hidden shadow-lg">
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
