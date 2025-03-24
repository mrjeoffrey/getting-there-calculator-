
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import SearchPanel from '../components/SearchPanel';
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
      console.log("Connecting flight details:", JSON.stringify(connectingFlights, null, 2));
      
      // Log each connecting flight's structure for debugging
      connectingFlights.forEach((cf, idx) => {
        console.log(`Connection #${idx+1}: ${cf.id} with ${cf.flights.length} legs`);
        cf.flights.forEach((leg, legIdx) => {
          console.log(`  Leg ${legIdx+1}: ${leg.departureAirport?.code} to ${leg.arrivalAirport?.code} (${leg.id})`);
          if (!leg.departureAirport || !leg.arrivalAirport) {
            console.error(`Missing airport data in leg ${legIdx+1} of connection ${idx+1}`);
          }
        });
      });
    } else {
      console.warn("Index: No connecting flights loaded");
    }
  }, [directFlights, connectingFlights]);

  const handleSearch = async (params: SearchParams) => {
    setLoading(true);
    setSearched(false);
    setDirectFlights([]);
    setConnectingFlights([]);
    
    try {
      console.log(`Searching flights from ${params.from} to ${params.to || 'HND'}`);
      
      const { directFlights, connectingFlights, weeklyData } = await searchWeeklyFlights(
        params.from,
        params.to || 'HND' // Default to Tokyo Haneda
      );
      
      console.log(`Search completed. Found ${directFlights.length} direct and ${connectingFlights.length} connecting flights`);
      
      setDirectFlights(directFlights);
      setConnectingFlights(connectingFlights);
      setWeeklyData(weeklyData);
      setSearched(true);
      
      // Debug connection flights
      if (connectingFlights.length > 0) {
        console.log(`Found ${connectingFlights.length} connecting flights:`);
        connectingFlights.forEach((cf, idx) => {
          console.log(`Connection #${idx+1}: ${cf.id} with ${cf.flights.length} legs`);
          cf.flights.forEach((leg, legIdx) => {
            console.log(`  Leg ${legIdx+1}: ${leg.departureAirport?.code} to ${leg.arrivalAirport?.code}`);
            
            // Additional validation of flight data
            if (!leg.departureAirport || !leg.arrivalAirport) {
              console.error(`  Missing airport data in leg ${legIdx+1} of connection ${idx+1}`);
            }
          });
        });
      } else {
        console.warn("No connecting flights found in search results");
        toast.warning("No connecting flights found. This is unusual - please try a different departure airport.");
      }
      
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
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="w-full md:w-1/3 p-4 overflow-y-auto">
          <SearchPanel onSearch={handleSearch} loading={loading} />
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
