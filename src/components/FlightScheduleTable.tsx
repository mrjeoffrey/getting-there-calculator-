
import React from 'react';
import { Flight, ConnectionFlight } from '../types/flightTypes';
import { groupFlightsByDay } from '../utils/dateFormatUtils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';

interface FlightScheduleTableProps {
  flights?: Flight[];
  connectionFlights?: ConnectionFlight[];
  selectedFlightId?: string | null;
  onFlightSelect?: (flight: Flight | ConnectionFlight) => void;
  title?: string;
}

const FlightScheduleTable: React.FC<FlightScheduleTableProps> = ({
  flights = [],
  connectionFlights = [],
  selectedFlightId = null,
  onFlightSelect,
  title
}) => {
  const groupedDirectFlights = flights && flights.length > 0 ? groupFlightsByDay(flights) : [];
  
  if ((flights?.length === 0 || !flights) && (connectionFlights?.length === 0 || !connectionFlights)) {
    return null;
  }
  
  const handleFlightSelect = (flight: Flight | ConnectionFlight) => {
    if (onFlightSelect) {
      onFlightSelect(flight);
    }
  };
  
  // Updated styles for better appearance with scrolling
  const scrollableStyle: React.CSSProperties = {
    minHeight: '100px',
    maxHeight: '300px',
    overflow: 'auto',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '6px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  };
  
  let routeHeader = '';
  if (flights && flights.length > 0) {
    const departAirport = flights[0].departureAirport;
    const arriveAirport = flights[0].arrivalAirport;
    routeHeader = `Available direct and connecting flights from ${departAirport.city}, ${departAirport.country} (${departAirport.code}) to ${arriveAirport.city}, ${arriveAirport.country} (${arriveAirport.code})`;
  }
  
  return (
    <div className="flight-schedule-between-markers space-y-0 mt-2">
      {routeHeader && (
        <h3 className="font-medium text-sm text-primary mb-2">{routeHeader}</h3>
      )}
      
      {/* All Flights (Direct and Connecting) */}
      {(groupedDirectFlights.length > 0 || connectionFlights.length > 0) && (
        <div className="mb-2">
          <div className="overflow-x-auto">
            {/* Table header outside scrollable area */}
            <Table className="border-separate border-spacing-y-1 table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="py-1 px-3 text-centre bg-background z-10 w-1/6">Airline</TableHead>
                  <TableHead className="py-1 px-3 text-centre bg-background z-10 w-1/6">Total Duration</TableHead>
                  <TableHead className="py-1 px-3 text-centre bg-background z-10 w-1/6">Days</TableHead>
                  <TableHead className="py-1 px-3 text-centre bg-background z-10 w-1/6">Dep</TableHead>
                  <TableHead className="py-1 px-3 text-centre bg-background z-10 w-1/6">Arr</TableHead>
                  <TableHead className="py-1 px-3 text-centre bg-background z-10 w-1/6">Stops</TableHead>
                </TableRow>
              </TableHeader> 
            </Table>
            
            {/* Scrollable table body */}
            <div className="overflow-auto max-h-[300px]">
              <Table className="border-separate border-spacing-y-1 table-fixed w-full">
                <TableBody>
                  {/* Direct Flights */}
                  {groupedDirectFlights.map((flight, index) => {
                    // Find original flight to get complete data
                    const originalFlight = flights.find(f =>
                      f.airline === flight.airline &&
                      f.departureTime.includes(flight.departureTime) &&
                      f.arrivalTime.includes(flight.arrivalTime)
                    );
                    
                    return (
                      <TableRow
                        key={`direct-flight-${index}`}
                        className={index % 2 === 0 ? 'bg-background hover:bg-muted/40' : 'bg-muted/20 hover:bg-muted/40'}
                        onClick={() => {
                          if (originalFlight) handleFlightSelect(originalFlight);
                        }}
                      >
                        <TableCell className="py-2 px-3 text-centre w-1/6">{flight.airline}</TableCell>
                        <TableCell className="py-2 px-3 text-centre w-1/6">{flight.duration}</TableCell>
                        <TableCell className="py-2 px-3 text-centre w-1/6">{flight.days}</TableCell>
                        <TableCell className="py-2 px-3 text-centre w-1/6">{flight.departureTime}</TableCell>
                        <TableCell className="py-2 px-3 text-centre w-1/6">{flight.arrivalTime}</TableCell>
                        <TableCell className="py-2 px-3 text-centre w-1/6 text-green-600 font-medium">Direct</TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* Connecting Flights - Updated to show full journey details */}
                  {connectionFlights.map((connectionFlight, index) => {
                    // Get first and last flight for complete journey info
                    const firstFlight = connectionFlight.flights[0];
                    const lastFlight = connectionFlight.flights[connectionFlight.flights.length - 1];
                    const stops = connectionFlight.flights.length - 1;
                    
                    // Parse times for readability
                    const departureTime = firstFlight.departureTime.split('T')[1].substring(0, 5);
                    const arrivalTime = lastFlight.arrivalTime.split('T')[1].substring(0, 5);
                    
                    return (
                      <TableRow
                        key={`connecting-flight-${index}`}
                        className={index % 2 === 0 ? 'bg-background hover:bg-muted/40' : 'bg-muted/20 hover:bg-muted/40'}
                        onClick={() => handleFlightSelect(connectionFlight)}
                      >
                        <TableCell className="py-2 px-3 text-centre w-1/6">
                          {connectionFlight.flights.map(f => f.airline).join('+')}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-centre w-1/6">{connectionFlight.totalDuration}</TableCell>
                        <TableCell className="py-2 px-3 text-centre w-1/6">-</TableCell>
                        <TableCell className="py-2 px-3 text-centre w-1/6">{departureTime}</TableCell>
                        <TableCell className="py-2 px-3 text-centre w-1/6">{arrivalTime}</TableCell>
                        <TableCell className="py-2 px-3 text-centre w-1/6 text-amber-600">
                          {stops} {stops === 1 ? 'stop' : 'stops'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS to ensure proper positioning between markers */}
      <style>{`
        .flight-schedule-between-markers {
          position: relative;
          z-index: 1000;
        }
      `}</style>
    </div>
  );
};

export default FlightScheduleTable;
