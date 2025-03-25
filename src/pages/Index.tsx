
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
      // Ensure destination is set to Tokyo (HND) if not provided
      const destination = params.to || 'HND';
      console.log(`Searching flights from ${params.from} to ${destination} (Tokyo Haneda)`);
      
      const { directFlights, connectingFlights, weeklyData } = await searchWeeklyFlights(
        params.from,
        destination
      );
      
      console.log(`Search completed. Found ${directFlights.length} direct and ${connectingFlights.length} connecting flights`);
      
      // Apply the max 5 planes per airline, total 10 planes limit
      const limitedDirectFlights = limitFlightsByAirline(directFlights, 5, 10);
      const limitedConnectingFlights = limitConnectionFlightsByAirline(connectingFlights, 5, 10 - limitedDirectFlights.length);
      
      setDirectFlights(limitedDirectFlights);
      setConnectingFlights(limitedConnectingFlights);
      setWeeklyData(weeklyData);
      setSearched(true);
      
      // Debug connection flights
      if (limitedConnectingFlights.length > 0) {
        console.log(`Found ${limitedConnectingFlights.length} connecting flights:`);
        limitedConnectingFlights.forEach((cf, idx) => {
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
      
      if (limitedDirectFlights.length === 0 && limitedConnectingFlights.length === 0) {
        toast.warning("No flights found. Try another departure airport or check back later.");
      } else {
        toast.success(`Found ${limitedDirectFlights.length} direct and ${limitedConnectingFlights.length} connecting flights to Tokyo!`);
      }
    } catch (error) {
      console.error("Error searching flights:", error);
      toast.error("Failed to search flights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to limit flights by airline and total count
  const limitFlightsByAirline = (flights: Flight[], maxPerAirline: number, maxTotal: number): Flight[] => {
    const airlineCount: {[key: string]: number} = {};
    const result: Flight[] = [];
    
    for (const flight of flights) {
      // Skip if we've reached the maximum total
      if (result.length >= maxTotal) break;
      
      const airline = flight.airline;
      
      // Initialize counter for this airline if not exists
      if (!airlineCount[airline]) {
        airlineCount[airline] = 0;
      }
      
      // Add flight if we haven't reached the limit for this airline
      if (airlineCount[airline] < maxPerAirline) {
        result.push(flight);
        airlineCount[airline]++;
      }
    }
    
    return result;
  };
  
  // Helper function to limit connecting flights by airline and total count
  const limitConnectionFlightsByAirline = (
    connections: ConnectionFlight[], 
    maxPerAirline: number, 
    maxTotal: number
  ): ConnectionFlight[] => {
    const airlineCount: {[key: string]: number} = {};
    const result: ConnectionFlight[] = [];
    
    for (const connection of connections) {
      // Skip if we've reached the maximum total
      if (result.length >= maxTotal) break;
      
      // For connecting flights, we'll count by the first leg's airline
      const airline = connection.flights[0].airline;
      
      // Initialize counter for this airline if not exists
      if (!airlineCount[airline]) {
        airlineCount[airline] = 0;
      }
      
      // Add connection if we haven't reached the limit for this airline
      if (airlineCount[airline] < maxPerAirline) {
        result.push(connection);
        airlineCount[airline]++;
      }
    }
    
    return result;
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
