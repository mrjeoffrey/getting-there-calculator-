
import React, { useState } from 'react';
import Header from '../components/Header';
import SearchPanel from '../components/SearchPanel';
import FlightMap from '../components/FlightMap';
import FlightScheduleTable from '../components/FlightScheduleTable';
import WeeklyFlightSchedule from '../components/WeeklyFlightSchedule';
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

  const handleSearch = async (params: SearchParams) => {
    setLoading(true);
    setSearched(false);
    
    try {
      const { directFlights, connectingFlights, weeklyData } = await searchWeeklyFlights(
        params.from,
        params.to || 'GND'
      );
      
      setDirectFlights(directFlights);
      setConnectingFlights(connectingFlights);
      setWeeklyData(weeklyData);
      setSearched(true);
      
      if (directFlights.length === 0 && connectingFlights.length === 0) {
        toast.warning("No flights found. Try another departure airport or check back later.");
      } else {
        toast.success(`Found ${directFlights.length + connectingFlights.length} flights to Grenada!`);
      }
    } catch (error) {
      console.error("Error searching flights:", error);
      toast.error("Failed to search flights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFlightSelect = (flight: any) => {
    setSelectedFlightId(flight.id);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="w-full md:w-1/3 p-4 overflow-y-auto">
          <SearchPanel onSearch={handleSearch} loading={loading} />
          
          {searched && !loading && (
            <div className="mt-4 space-y-4">
              <WeeklyFlightSchedule 
                weeklyData={weeklyData} 
                onSelectFlight={(flight) => setSelectedFlightId(flight.id)} 
              />
              
              <FlightScheduleTable 
                directFlights={directFlights}
                connectingFlights={connectingFlights}
                selectedFlightId={selectedFlightId}
                onFlightSelect={handleFlightSelect}
              />
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
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
