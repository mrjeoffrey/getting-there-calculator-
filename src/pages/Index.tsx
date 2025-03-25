
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import FlightMap from '../components/FlightMap';
import { Flight, ConnectionFlight, SearchParams, WeeklyFlightData } from '../types/flightTypes';
import { searchWeeklyFlights } from '../services/amadeusService';
import { toast } from "sonner";

const Index = () => {
  const [loading, setLoading] = useState(false);
  const [directFlights, setDirectFlights] = useState<Flight[]>([]);
  const [connectingFlights, setConnectingFlights] = useState<ConnectionFlight[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyFlightData>({});
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Add debugging effect for monitoring flight data
  useEffect(() => {
    if (directFlights.length > 0) {
      console.log(`Index: Loaded ${directFlights.length} direct flights`);
    }
    
    if (connectingFlights.length > 0) {
      console.log(`Index: Loaded ${connectingFlights.length} connecting flights`);
      // Additional detailed logging for connecting flights
      connectingFlights.forEach((cf, idx) => {
        console.log(`Connection #${idx+1}: ${cf.id} with ${cf.flights.length} legs`);
        cf.flights.forEach((leg, legIdx) => {
          console.log(`  Leg ${legIdx+1}: ${leg.departureAirport?.code} to ${leg.arrivalAirport?.code} (${leg.id})`);
        });
      });
    }
  }, [directFlights, connectingFlights]);

  const handleSearch = async (params: SearchParams) => {
    setLoading(true);
    setSearched(false);
    setDirectFlights([]);
    setConnectingFlights([]);
    
    try {
      // Ensure destination is set to Tokyo (HND) if not provided
      const destination = params.to || 'HND';
      console.log(`Searching flights from ${params.from} to ${destination} (Tokyo Haneda)`);
      
      const { directFlights, connectingFlights, weeklyData } = await searchWeeklyFlights(
        params.from,
        destination
      );
      
      console.log(`Search completed. Found ${directFlights.length} direct and ${connectingFlights.length} connecting flights`);
      
      setDirectFlights(directFlights);
      setConnectingFlights(connectingFlights);
      setWeeklyData(weeklyData);
      setSearched(true);
      
      if (directFlights.length === 0 && connectingFlights.length === 0) {
        toast.warning("No flights found. Try another departure airport or check back later.");
      } else {
        toast.success(`Found ${directFlights.length} direct and ${connectingFlights.length} connecting flights to Tokyo!`);
      }
    } catch (error) {
      console.error("Error searching flights:", error);
      toast.error("Failed to search flights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFlightSelect = (flight: any) => {
    console.log("Selected flight:", flight);
    setSelectedFlightId(flight.id);
    
    // Show flight details in a toast notification when a flight is selected
    if (flight.flights) {
      // For connecting flights
      const stops = flight.flights.map((f: Flight) => f.arrivalAirport.code).join(' → ');
      toast(`Selected connecting flight via ${stops}`, {
        description: `Total duration: ${flight.totalDuration} with ${flight.flights.length - 1} stop(s)`,
        duration: 5000,
      });
    } else {
      // For direct flights
      toast(`Direct flight: ${flight.departureAirport.code} to ${flight.arrivalAirport.code}`, {
        description: `${flight.airline} ${flight.flightNumber} - Duration: ${flight.duration}`,
        duration: 5000,
      });
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header onSearch={handleSearch} loading={loading} />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="w-full md:w-1/3 p-4 overflow-y-auto">
          {!searched && !loading && (
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <h3 className="text-lg font-medium mb-2">Find Flights to Tokyo</h3>
              <p className="text-sm text-muted-foreground">
                Select your departure airport and search for flights to Tokyo Haneda Airport (HND).
              </p>
            </div>
          )}
          
          {connectingFlights.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="text-lg font-medium text-yellow-800">
                {connectingFlights.length} Connecting Flights Available
              </h3>
              <p className="text-sm text-yellow-600">
                Connecting flights are shown on the map with yellow dashed lines.
              </p>
            </div>
          )}
          
          {directFlights.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-medium text-blue-800">
                {directFlights.length} Direct Flights Available
              </h3>
              <p className="text-sm text-blue-600">
                Direct flights are shown on the map with blue solid lines.
              </p>
            </div>
          )}
        </div>
        
        <div className="w-full md:w-2/3 h-[50vh] md:h-auto overflow-hidden">
          <FlightMap
            directFlights={directFlights}
            connectingFlights={connectingFlights}
            selectedFlightId={selectedFlightId}
            loading={loading}
            onFlightSelect={handleFlightSelect}
            autoAnimateConnections={true}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
