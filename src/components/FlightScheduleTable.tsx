
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

  const maxHeightStyle: React.CSSProperties = { maxHeight: '100px', overflowY: 'auto' }; // Fits approx 5 rows

  return (
    <div className="space-y-4 mt-4">
      {title && <h4 className="font-medium text-sm text-primary mb-2">{title}</h4>}

      {/* Direct Flights */}
      {groupedDirectFlights.length > 0 && (
        <div className="mb-4">
          {!title && <h4 className="font-medium text-sm text-primary mb-2 border-b pb-1">Direct Flights</h4>}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-1 px-2 text-left">Airline</TableHead>
                  <TableHead className="py-1 px-2 text-left">Duration</TableHead>
                  <TableHead className="py-1 px-2 text-left">Days</TableHead>
                  <TableHead className="py-1 px-2 text-left">Departure</TableHead>
                  <TableHead className="py-1 px-2 text-left">Arrival</TableHead>
                </TableRow>
              </TableHeader>
            </Table>

            {/* Scrollable body */}
            <div style={maxHeightStyle}>
              <Table>
                <TableBody>
                  {groupedDirectFlights.map((flight, index) => (
                    <TableRow 
                      key={`direct-flight-${index}`} 
                      className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                      onClick={() => {
                        const originalFlight = flights.find(f => 
                          f.airline === flight.airline &&
                          f.departureTime.includes(flight.departureTime) &&
                          f.arrivalTime.includes(flight.arrivalTime)
                        );
                        if (originalFlight) handleFlightSelect(originalFlight);
                      }}
                    >
                      <TableCell className="py-1 px-2">{flight.airline}</TableCell>
                      <TableCell className="py-1 px-2">{flight.duration}</TableCell>
                      <TableCell className="py-1 px-2 font-mono text-xs">{flight.days}</TableCell>
                      <TableCell className="py-1 px-2">{flight.departureTime}</TableCell>
                      <TableCell className="py-1 px-2">{flight.arrivalTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Connecting Flights */}
      {connectionFlights && connectionFlights.length > 0 && (
        <div className="mb-4">
          {!title && <h4 className="font-medium text-sm text-primary mb-2 border-b pb-1">Connecting Flights</h4>}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-1 px-2 text-left">From</TableHead>
                  <TableHead className="py-1 px-2 text-left">To</TableHead>
                  <TableHead className="py-1 px-2 text-left">Duration</TableHead>
                  <TableHead className="py-1 px-2 text-left">Stops</TableHead>
                  <TableHead className="py-1 px-2 text-left">Price</TableHead>
                </TableRow>
              </TableHeader>
            </Table>

            {/* Scrollable body */}
            <div style={maxHeightStyle}>
              <Table>
                <TableBody>
                  {connectionFlights.map((connection, index) => (
                    <TableRow 
                      key={`connection-${index}`} 
                      className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                      onClick={() => handleFlightSelect(connection)}
                    >
                      <TableCell className="py-1 px-2">{connection.flights[0].departureAirport.code}</TableCell>
                      <TableCell className="py-1 px-2">{connection.flights[connection.flights.length - 1].arrivalAirport.code}</TableCell>
                      <TableCell className="py-1 px-2">{connection.totalDuration}</TableCell>
                      <TableCell className="py-1 px-2">{connection.flights.length - 1}</TableCell>
                      <TableCell className="py-1 px-2">${connection.price}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightScheduleTable;
