
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

  useEffect(() => {
    log('Props - flights', flights);
    log('Props - connectionFlights', connectionFlights);
    log('Props - selectedFlightId', selectedFlightId);
    log('Props - type', type);
  }, [flights, connectionFlights, selectedFlightId, type]);

  const formatToTimeOnly = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC' ,
      hour12: false
    });
  };

  const calculateDuration = (departureISO: string, arrivalISO: string): string => {
    const departure = new Date(departureISO);
    const arrival = new Date(arrivalISO);
    const diffMs = arrival.getTime() - departure.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMin / 60);
    const minutes = diffMin % 60;
    return `${hours}h${minutes}m`; // Removed space to make more compact
  };
  
  const destinationAirportCode = 'GND';
  const destinationCity = 'St. George\'s';
  const destinationCountry = 'Grenada';
  // ✅ Only direct flights going to the correct destination
  const groupedDirectFlights =
    flights && flights.length > 0
      ? groupFlightsByDay(
          flights.filter(f => {
            const isDirect = f.direct;
            const isToGrenada = f.arrivalAirport?.code === destinationAirportCode;
            return isDirect && (type !== 'origin' || isToGrenada);
          })
        )
      : [];

  const groupedConnectingFlights =
    connectionFlights && connectionFlights.length > 0
      ? groupFlightsByDay(
          connectionFlights
            .filter(cf => {
              const lastLeg = cf.flights.at(-1);
              const isToGrenada = lastLeg?.arrivalAirport?.code === destinationAirportCode;
              return type !== 'origin' || isToGrenada;
            })
            .map(cf => {
              const firstFlight = cf.flights[0];
              const lastFlight = cf.flights.at(-1)!;
              console.log('First flight:---', firstFlight);
              console.log('Last flight:---', lastFlight);
              console.log('All flights:---', cf.flights.length);
              console.log('All flights name', cf.flights);
              return {
                id: cf.id,
                departureTime: firstFlight.departureTime,
                arrivalTime: lastFlight.arrivalTime,
                airline: [...new Set(cf.flights.map(f => f.airline))].join(', '),
                duration: cf.totalDuration,
                days: new Date(firstFlight.departureTime).toLocaleDateString(undefined, { weekday: 'short' }),
                direct: false,
                stops: cf.flights.length-1,
                originalConnection: cf
              };
            })
        )
      : [];


  const handleFlightSelect = (flight: Flight | ConnectionFlight) => {
    log('Flight selected', flight);
    if (onFlightSelect) onFlightSelect(flight);
  };
  
  let routeHeader = '';

  if (flights.length > 0 || connectionFlights.length > 0) {
    const originAirport = flights[0]?.departureAirport || connectionFlights[0]?.flights[0]?.departureAirport;
  
    if (originAirport) {
      routeHeader =
        type === 'origin'
          ? `Flights from ${originAirport.code} to ${destinationAirportCode}`
          : `Connections from ${originAirport.code}`;
    }
  }

  return (
    <div className="flight-schedule-between-markers space-y-0 mt-1"> {/* Reduced margin from mt-2 to mt-1 */}
      {routeHeader && (
        <h3 className="font-medium text-xs text-primary mb-1">{routeHeader}</h3> /* Reduced text size from text-sm to text-xs and margin */
      )}

      {(groupedDirectFlights.length > 0 || groupedConnectingFlights.length > 0) && (
        <div className="mb-1 overflow-x-auto"> {/* Reduced margin */}
          <Table className="border-separate border-spacing-y-0 table-fixed w-full text-xs"> {/* Added text-xs class and reduced border-spacing */}
            <TableHeader>
              <TableRow className="h-6"> {/* Reduced row height */}
                <TableHead className="py-0 px-1 text-center w-1/6">Airline</TableHead> {/* Reduced padding */}
                <TableHead className="py-0 px-1 text-center w-1/6">Duration</TableHead>
                <TableHead className="py-0 px-1 text-center w-1/6">Days</TableHead>
                <TableHead className="py-0 px-1 text-center w-1/6">Dep</TableHead>
                <TableHead className="py-0 px-1 text-center w-1/6">Arr</TableHead>
                {type === 'origin' && (
                  <TableHead className="py-0 px-1 text-center w-1/6">Stops</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedDirectFlights.map((flight, index) => (
                <TableRow
                  key={`direct-${index}`}
                  className={`h-6 ${index % 2 === 0 ? 'bg-background hover:bg-muted/40' : 'bg-muted/20 hover:bg-muted/40'}`} {/* Reduced row height */}
                  onClick={() => handleFlightSelect(flights.find(f =>
                    f.airline === flight.airline &&
                    f.departureTime.includes(flight.departureTime) &&
                    f.arrivalTime.includes(flight.arrivalTime)
                  )!)}
                >
                  <TableCell className="py-1 px-1 text-center">{flight.airline}</TableCell> {/* Reduced padding */}
                  <TableCell className="py-1 px-1 text-center">{calculateDuration(flight.departureTime, flight.arrivalTime)}</TableCell>
                  <TableCell className="py-1 px-1 text-center">{flight.days}</TableCell>
                  <TableCell className="py-1 px-1 text-center">{formatToTimeOnly(flight.departureTime)}</TableCell>
                  <TableCell className="py-1 px-1 text-center">{formatToTimeOnly(flight.arrivalTime)}</TableCell>
                  {type === 'origin' && (
                    <TableCell className="py-1 px-1 text-green-600 font-medium text-center">Direct</TableCell>
                  )}
                </TableRow>
              ))}

              {groupedConnectingFlights.map((flight, index) => {
                const originalConnection = connectionFlights.find(cf => cf.id === flight.id);
                return (
                  <TableRow
                    key={`connect-${index}`}
                    className={`h-6 ${(index + groupedDirectFlights.length) % 2 === 0 ? 'bg-background hover:bg-muted/40' : 'bg-muted/20 hover:bg-muted/40'}`} {/* Reduced row height */}
                    onClick={() => originalConnection && handleFlightSelect(originalConnection)}
                  >
                    <TableCell className="py-1 px-1 text-center">{flight.airline}</TableCell> {/* Reduced padding */}
                    <TableCell className="py-1 px-1 text-center">{calculateDuration(flight.departureTime, flight.arrivalTime)}</TableCell>
                    <TableCell className="py-1 px-1 text-center">{flight.days}</TableCell>
                    <TableCell className="py-1 px-1 text-center">{formatToTimeOnly(flight.departureTime)}</TableCell>
                    <TableCell className="py-1 px-1 text-center">{formatToTimeOnly(flight.arrivalTime)}</TableCell>
                    {type === 'origin' && (
                      <TableCell className="py-1 px-1 text-amber-600 text-center">
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
