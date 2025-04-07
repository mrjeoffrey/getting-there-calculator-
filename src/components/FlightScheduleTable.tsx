
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
  
  // Removed fixed max-height style to allow it to be positioned dynamically
  const scrollableStyle: React.CSSProperties = {
    minHeight: '100px',
    maxHeight: '200px',
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
      
      {/* Direct Flights */}
      {groupedDirectFlights.length > 0 && (
        <div className="mb-2">
          <div className="overflow-x-auto">
            {/* Table header outside scrollable area */}
            <Table className="border-separate border-spacing-y-1 table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="py-1 px-4 text-centre w-1/5 bg-background z-10">Airline</TableHead>
                  <TableHead className="py-1 px-4 text-centre w-1/5 bg-background z-10">Time</TableHead>
                  <TableHead className="py-1 px-4 text-centre w-1/5 bg-background z-10">Days</TableHead>
                  <TableHead className="py-1 px-4 text-centre w-1/5 bg-background z-10">Dep</TableHead>
                  <TableHead className="py-1 px-4 text-centre w-1/5 bg-background z-10">Arr</TableHead>
                </TableRow>
              </TableHeader> 
            </Table>
            
            {/* Scrollable table body */}
            <div style={scrollableStyle} className="overflow-x-auto max-h-[200px] overflow-y-auto">
              <Table className="border-separate border-spacing-y-1 table-fixed w-full">
                <TableBody>
                  {groupedDirectFlights.map((flight, index) => (
                    <TableRow
                      key={`direct-flight-${index}`}
                      className={index % 2 === 0 ? 'bg-background hover:bg-muted/40' : 'bg-muted/20 hover:bg-muted/40'}
                      onClick={() => {
                        const originalFlight = flights.find(f =>
                          f.airline === flight.airline &&
                          f.departureTime.includes(flight.departureTime) &&
                          f.arrivalTime.includes(flight.arrivalTime)
                        );
                        if (originalFlight) handleFlightSelect(originalFlight);
                      }}
                    >
                      <TableCell className="py-2 px-4 text-centre w-1/5">{flight.airline}</TableCell>
                      <TableCell className="py-2 px-4 text-centre w-1/5">{flight.duration}</TableCell>
                      <TableCell className="py-2 px-4 text-centre w-1/5">{flight.days}</TableCell>
                      <TableCell className="py-2 px-4 text-centre w-1/5">{flight.departureTime}</TableCell>
                      <TableCell className="py-2 px-4 text-centre w-1/5">{flight.arrivalTime}</TableCell>
                    </TableRow>
                  ))}
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
          max-height: 200px
          z-index: 1000;
        }
      `}</style>
    </div>
  );
};

export default FlightScheduleTable;
