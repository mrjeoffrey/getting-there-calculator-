
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
  const groupedDirectFlights = flights && flights.length > 0 ? groupFlightsByDay(flights.filter(f => f.direct)) : [];
  
  // Group connecting flights similarly to direct flights
  const groupedConnectingFlights = connectionFlights && connectionFlights.length > 0 ? 
    groupFlightsByDay(connectionFlights.map(cf => {
      const firstFlight = cf.flights[0];
      const lastFlight = cf.flights[cf.flights.length - 1];
      
      return {
        id: cf.id,
        departureTime: firstFlight.departureTime,
        arrivalTime: lastFlight.arrivalTime,
        airline: cf.flights.map(f => f.airline).join(' + '),
        duration: cf.totalDuration,
        direct: false,
        stops: cf.flights.length - 1,
        originalConnection: cf
      };
    })) : [];

  console.log('[FlightScheduleTable] groupedDirectFlights:', groupedDirectFlights);
  console.log('[FlightScheduleTable] groupedConnectingFlights:', groupedConnectingFlights);
  console.log('[FlightScheduleTable] connectionFlights:', connectionFlights);

  if ((groupedDirectFlights.length === 0 || !flights) && (groupedConnectingFlights.length === 0 && (connectionFlights?.length === 0 || !connectionFlights))) {
    console.log('[FlightScheduleTable] No flights to display.');
    return null;
  }

  const handleFlightSelect = (flight: Flight | ConnectionFlight) => {
    console.log('[FlightScheduleTable] Flight selected:', flight);
    if (onFlightSelect) {
      onFlightSelect(flight);
    }
  };

  let routeHeader = '';
  if (flights && flights.length > 0) {
    const departAirport = flights[0].departureAirport;
    const arriveAirport = flights[0].arrivalAirport;
    routeHeader = `Available direct and connecting flights from ${departAirport.city}, ${departAirport.country} (${departAirport.code}) to ${arriveAirport.city}, ${arriveAirport.country} (${arriveAirport.code})`;
  } else if (connectionFlights && connectionFlights.length > 0) {
    const firstFlight = connectionFlights[0].flights[0];
    const lastFlight = connectionFlights[0].flights[connectionFlights[0].flights.length - 1];
    if (firstFlight && lastFlight) {
      const departAirport = firstFlight.departureAirport;
      const arriveAirport = lastFlight.arrivalAirport;
      routeHeader = `Available direct and connecting flights from ${departAirport.city}, ${departAirport.country} (${departAirport.code}) to ${arriveAirport.city}, ${arriveAirport.country} (${arriveAirport.code})`;
    }
  }

  return (
    <div className="flight-schedule-between-markers space-y-0 mt-2">
      {routeHeader && (
        <h3 className="font-medium text-sm text-primary mb-2">{routeHeader}</h3>
      )}

      {(groupedDirectFlights.length > 0 || groupedConnectingFlights.length > 0) && (
        <div className="mb-2 overflow-x-auto">
          <Table className="border-separate border-spacing-y-1 table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="py-1 px-3 text-centre bg-background z-10 w-1/6">Airline</TableHead>
                <TableHead className="py-1 px-3 text-centre bg-background z-10 w-1/6">Total Duration</TableHead>
                <TableHead className="py-1 px-3 text-centre bg-background z-10 w-1/6">Days</TableHead>
                <TableHead className="py-1 px-3 text-centre bg-background z-10 w-1/6">Dep</TableHead>
                <TableHead className="py-1 px-3 text-centre bg-background z-10 w-1/6">Arr</TableHead>
                {title?.toLowerCase().includes('origin') && (
                  <TableHead className="py-1 px-3 text-centre bg-background z-10 w-1/6">Stops</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedDirectFlights.map((flight, index) => {
                const originalFlight = flights.find(f =>
                  f.airline === flight.airline &&
                  f.departureTime.includes(flight.departureTime) &&
                  f.arrivalTime.includes(flight.arrivalTime)
                );

                const isDestinationMatch = flights.length > 0 ? 
                  flights[0]?.arrivalAirport?.code === originalFlight?.arrivalAirport?.code : true;
                  
                if (!isDestinationMatch) return null;

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
                    {title?.toLowerCase().includes('origin') && (
                      <TableCell className="py-2 px-3 text-centre w-1/6 text-green-600 font-medium">Direct</TableCell>
                    )}
                  </TableRow>
                );
              })}

              {groupedConnectingFlights.map((flight, index) => {
                const originalConnection = connectionFlights.find(cf => {
                  const firstFlight = cf.flights[0];
                  const departureTime = firstFlight.departureTime.split('T')[1].substring(0, 5);
                  return departureTime === flight.departureTime;
                });

                return (
                  <TableRow
                    key={`connecting-flight-${index}`}
                    className={(index + groupedDirectFlights.length) % 2 === 0 ? 'bg-background hover:bg-muted/40' : 'bg-muted/20 hover:bg-muted/40'}
                    onClick={() => originalConnection && handleFlightSelect(originalConnection)}
                  >
                    <TableCell className="py-2 px-3 text-centre w-1/6">{flight.airline}</TableCell>
                    <TableCell className="py-2 px-3 text-centre w-1/6">{flight.duration}</TableCell>
                    <TableCell className="py-2 px-3 text-centre w-1/6">{flight.days}</TableCell>
                    <TableCell className="py-2 px-3 text-centre w-1/6">{flight.departureTime}</TableCell>
                    <TableCell className="py-2 px-3 text-centre w-1/6">{flight.arrivalTime}</TableCell>
                    {title?.toLowerCase().includes('origin') && (
                      <TableCell className="py-2 px-3 text-centre w-1/6 text-amber-600">
                        {(flight as any).stops || 1} {(flight as any).stops === 1 ? 'stop' : 'stops'}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}

              {/* Display ungrouped connecting flights if no grouped ones are available */}
              {groupedConnectingFlights.length === 0 && connectionFlights.map((connectionFlight, index) => {
                const firstFlight = connectionFlight.flights[0];
                const lastFlight = connectionFlight.flights[connectionFlight.flights.length - 1];
                const stops = connectionFlight.flights.length - 1;
                const departureTime = firstFlight.departureTime.split('T')[1].substring(0, 5);
                const arrivalTime = lastFlight.arrivalTime.split('T')[1].substring(0, 5);

                return (
                  <TableRow
                    key={`connecting-flight-${index}`}
                    className={(index + groupedDirectFlights.length) % 2 === 0 ? 'bg-background hover:bg-muted/40' : 'bg-muted/20 hover:bg-muted/40'}
                    onClick={() => handleFlightSelect(connectionFlight)}
                  >
                    <TableCell className="py-2 px-3 text-centre w-1/6">
                      {[...new Set(connectionFlight.flights.map(f => f.airline))].join(' + ')}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-centre w-1/6">{connectionFlight.totalDuration}</TableCell>
                    <TableCell className="py-2 px-3 text-centre w-1/6">{new Date(firstFlight.departureTime).toLocaleDateString(undefined, { weekday: 'short' })}</TableCell>
                    <TableCell className="py-2 px-3 text-centre w-1/6">{departureTime}</TableCell>
                    <TableCell className="py-2 px-3 text-centre w-1/6">{arrivalTime}</TableCell>
                    {title?.toLowerCase().includes('origin') && (
                      <TableCell className="py-2 px-3 text-centre w-1/6 text-amber-600">
                        {stops} {stops === 1 ? 'stop' : 'stops'}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

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
