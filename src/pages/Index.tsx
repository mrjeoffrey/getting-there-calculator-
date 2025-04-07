import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import FlightMap from '../components/FlightMap';
import { Flight, ConnectionFlight, SearchParams, WeeklyFlightData } from '../types/flightTypes';
// import { searchWeeklyFlights } from '../services/amadeusService';
import { searchWeeklyFlights } from '../services/flightlabsService';
import { toast } from "sonner";

const Index = () => {
  const [loading, setLoading] = useState(false);
  const [directFlights, setDirectFlights] = useState<Flight[]>([]);
  const [connectingFlights, setConnectingFlights] = useState<ConnectionFlight[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyFlightData>({});
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const [preventPopupReopen, setPreventPopupReopen] = useState(false);

  useEffect(() => {
    if (directFlights.length > 0) {
      console.log(`Index: Loaded ${directFlights.length} direct flights`);
    }
    
    if (connectingFlights.length > 0) {
      console.log(`Index: Loaded ${connectingFlights.length} connecting flights`);
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
    setActivePopup(null);
    
    try {
      const destination = params.to || 'GND';
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

  const handlePopupOpen = (airportCode: string | null) => {
    console.log(`Active popup request: ${airportCode}, current: ${activePopup}, prevent: ${preventPopupReopen}`);
    
    if (airportCode === null) {
      setPreventPopupReopen(true);
      setActivePopup(null);
      
      setTimeout(() => {
        setPreventPopupReopen(false);
      }, 300);
    } 
    else if (!preventPopupReopen) {
      setActivePopup(airportCode);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header 
        onSearch={handleSearch} 
        loading={loading}
      />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <FlightMap
            directFlights={directFlights}
            connectingFlights={connectingFlights}
            selectedFlightId={selectedFlightId}
            loading={loading}
            onFlightSelect={handleFlightSelect}
            autoAnimateConnections={true}
            showInstructions={false}
            activePopup={activePopup}
            onPopupOpen={handlePopupOpen}
          />
      </div>
    </div>
  );
};

export default Index;
