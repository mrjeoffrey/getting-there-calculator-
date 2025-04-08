import React, { useEffect } from 'react';
import { Flight, ConnectionFlight } from '../types/flightTypes';
import { groupFlightsByDay } from '../utils/dateFormatUtils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';

interface FlightScheduleTableProps {
  flights?: Flight[];
  connectionFlights?: ConnectionFlight[];
  selectedFlightId?: string | null;
  onFlightSelect?: (flight: Flight | ConnectionFlight) => void;
  title?: string;
  type?: 'origin' | 'destination' | 'connection';
}

const FlightScheduleTable: React.FC<FlightScheduleTableProps> = ({
  flights = [],
  connectionFlights = [],
  selectedFlightId = null,
  onFlightSelect,
  title,
  type = 'origin'
}) => {
  const log = (label: string, data: any) => {
    console.log(`[FlightScheduleTable] ${label}:`, data);
  };

  // Log initial props
  useEffect(() => {
    log('Props - flights', flights);
    log('Props - connectionFlights', connectionFlights);
    log('Props - selectedFlightId', selectedFlightId);
    log('Props - type', type);
  }, [flights, connectionFlights, selectedFlightId, type]);

  const groupedDirectFlights = flights && flights.length > 0 ? groupFlightsByDay(flights.filter(f => f.direct)) : [];
  const formatToTimeOnly = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // change to true for AM/PM format
    });
  };

  const calculateDuration = (departureISO: string, arrivalISO: string): string => {
    const departure = new Date(departureISO);
    const arrival = new Date(arrivalISO);
    const diffMs = arrival.getTime() - departure.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMin / 60);
    const minutes = diffMin % 60;
    return `${hours}h ${minutes}m`;
  };
  
  
  const groupedConnectingFlights = connectionFlights && connectionFlights.length > 0 ?
    groupFlightsByDay(connectionFlights.map(cf => {
      const firstFlight = cf.flights[0];
      const lastFlight = cf.flights[cf.flights.length - 1];
      const connectionSummary = {
        id: cf.id,
        departureTime: firstFlight.departureTime,
        arrivalTime: lastFlight.arrivalTime,
        airline: [...new Set(cf.flights.map(f => f.airline))].join(', '),
        duration: cf.totalDuration,
        days: new Date(firstFlight.departureTime).toLocaleDateString(undefined, { weekday: 'short' }),
        direct: false,
        stops: cf.flights.length - 1,
        originalConnection: cf
      };
      log('Mapped connection flight', connectionSummary);
      return connectionSummary;
    })) : [];

  const handleFlightSelect = (flight: Flight | ConnectionFlight) => {
    log('Flight selected', flight);
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
                {type === 'origin' && (
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
                    <TableCell className="py-2 px-3 text-centre w-1/6"> {calculateDuration(flight.departureTime, flight.arrivalTime)}</TableCell>
                    <TableCell className="py-2 px-3 text-centre w-1/6">{flight.days}</TableCell>
                    <TableCell className="py-2 px-3 text-centre w-1/6">{formatToTimeOnly(flight.departureTime)}</TableCell>
                    <TableCell className="py-2 px-3 text-centre w-1/6">{formatToTimeOnly(flight.arrivalTime)}</TableCell>
                    {type === 'origin' && (
                      <TableCell className="py-2 px-3 text-centre w-1/6 text-green-600 font-medium">Direct</TableCell>
                    )}
                  </TableRow>
                );
              })}

              {groupedConnectingFlights.map((flight, index) => {
                const originalConnection = connectionFlights.find(cf => cf.id === flight.id);
                const stopCount = originalConnection?.flights?.length ? originalConnection.flights.length - 1 : null;
                console.log('🚨 Rendering Connecting Flight Row');
                console.log('↪ index:', index);
                console.log('↪ flight object:', flight);
                console.log('↪ flight.id:', flight.id);
                console.log('↪ flight.airline:', flight.airline);
                console.log('↪ flight.departureTime:', flight.departureTime);
                console.log('↪ flight.arrivalTime:', flight.arrivalTime);
                console.log('↪ flight.days:', flight.days);
                console.log('↪ flight.stops:', flight.stops);
                console.log('↪ originalConnection:', originalConnection);
                log('Rendering connection row', {
                  flightId: flight.id,
                  stopCount,
                  originalConnection
                });

                return (
                  <TableRow
                    key={`connecting-flight-${index}`}
                    className={(index + groupedDirectFlights.length) % 2 === 0 ? 'bg-background hover:bg-muted/40' : 'bg-muted/20 hover:bg-muted/40'}
                    onClick={() => originalConnection && handleFlightSelect(originalConnection)}
                  >
                    <TableCell className="py-2 px-3 text-centre w-1/6">{flight.airline}</TableCell>
                    <TableCell className="py-2 px-3 text-centre w-1/6"> {calculateDuration(flight.departureTime, flight.arrivalTime)}</TableCell>
                    <TableCell className="py-2 px-3 text-centre w-1/6">{flight.days}</TableCell>
                    <TableCell className="py-2 px-3 text-centre w-1/6">{formatToTimeOnly(flight.departureTime)}</TableCell>
                    <TableCell className="py-2 px-3 text-centre w-1/6">{formatToTimeOnly(flight.arrivalTime)}</TableCell>
                    {type === 'origin' && (
                      <TableCell className="py-2 px-3 text-centre w-1/6 text-amber-600">
                        {flight.stops}
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
