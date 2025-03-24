
import React from 'react';

interface FlightScheduleProps {
  title: string;
  flights: Array<{
    airline: string;
    duration: string;
    days: string;
    departureTime: string;
    arrivalTime: string;
  }>;
}

const FlightScheduleTable: React.FC<FlightScheduleProps> = ({ title, flights }) => {
  if (flights.length === 0) return null;
  
  return (
    <div className="mb-4">
      <h4 className="font-medium text-sm text-primary mb-2 border-b pb-1">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              <th className="py-1 px-2 text-left">Airline</th>
              <th className="py-1 px-2 text-left">Duration</th>
              <th className="py-1 px-2 text-left">Days</th>
              <th className="py-1 px-2 text-left">Departure</th>
              <th className="py-1 px-2 text-left">Arrival</th>
            </tr>
          </thead>
          <tbody>
            {flights.map((flight, index) => (
              <tr key={`flight-${index}`} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                <td className="py-1 px-2">{flight.airline}</td>
                <td className="py-1 px-2">{flight.duration}</td>
                <td className="py-1 px-2">{flight.days}</td>
                <td className="py-1 px-2">{flight.departureTime}</td>
                <td className="py-1 px-2">{flight.arrivalTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FlightScheduleTable;
