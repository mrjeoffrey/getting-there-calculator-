
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { formatDate, formatTime } from '../utils/flightUtils';
import { Flight } from '../types/flightTypes';
import { Badge } from '@/components/ui/badge';

interface WeeklyFlightData {
  [date: string]: {
    dayOfWeek: string;
    flights: Flight[];
    error?: string;
  };
}

interface WeeklyFlightScheduleProps {
  weeklyData: WeeklyFlightData;
  onSelectFlight: (flight: Flight) => void;
}

const WeeklyFlightSchedule: React.FC<WeeklyFlightScheduleProps> = ({ 
  weeklyData, 
  onSelectFlight 
}) => {
  if (!weeklyData || Object.keys(weeklyData).length === 0) {
    return (
      <div className="p-4 border rounded-md bg-white/50 text-center">
        <p>No flight data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/70 rounded-md shadow-sm p-4 animate-fade-in">
      <h3 className="text-lg font-semibold mb-4">7-Day Flight Schedule</h3>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Available Flights</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(weeklyData)
              .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
              .map(([date, dayData]) => (
                <TableRow key={date}>
                  <TableCell className="font-medium">
                    {formatDate(date)}
                  </TableCell>
                  <TableCell>{dayData.dayOfWeek}</TableCell>
                  <TableCell>
                    {dayData.error ? (
                      <span className="text-red-500">{dayData.error}</span>
                    ) : dayData.flights.length === 0 ? (
                      <span className="text-muted-foreground">No flights available</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(dayData.flights.map(f => f.airline))).map(airline => (
                          <Badge key={airline} variant="outline" className="bg-primary/5">
                            {airline}
                          </Badge>
                        ))}
                        <span className="text-sm text-muted-foreground">
                          ({dayData.flights.length} flights)
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {dayData.flights.length > 0 && (
                      <button
                        onClick={() => onSelectFlight(dayData.flights[0])}
                        className="text-sm text-primary hover:text-primary/80"
                      >
                        View Details
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="mt-4 text-sm text-muted-foreground">
        <p>Click "View Details" to see flight options and visualize them on the map.</p>
      </div>
    </div>
  );
};

export default WeeklyFlightSchedule;
