
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
      <div className="p-2 border rounded-md bg-white/50 text-center text-xs">
        <p>No flight data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/70 rounded-md shadow-sm p-2 animate-fade-in text-xs">
      <h3 className="text-sm font-semibold mb-2">7-Day Flight Schedule</h3>
      
      <div className="overflow-x-auto">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="h-6">
              <TableHead className="py-1 px-2">Date</TableHead>
              <TableHead className="py-1 px-2">Day</TableHead>
              <TableHead className="py-1 px-2">Available Flights</TableHead>
              <TableHead className="py-1 px-2 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(weeklyData)
              .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
              .map(([date, dayData]) => (
                <TableRow key={date} className="h-6">
                  <TableCell className="font-medium py-1 px-2">
                    {formatDate(date)}
                  </TableCell>
                  <TableCell className="py-1 px-2">{dayData.dayOfWeek}</TableCell>
                  <TableCell className="py-1 px-2">
                    {dayData.error ? (
                      <span className="text-red-500">{dayData.error}</span>
                    ) : dayData.flights.length === 0 ? (
                      <span className="text-muted-foreground">No flights</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(dayData.flights.map(f => f.airline))).map(airline => (
                          <Badge key={airline} variant="outline" className="bg-primary/5 text-[10px] px-1 py-0">
                            {airline}
                          </Badge>
                        ))}
                        <span className="text-[10px] text-muted-foreground">
                          ({dayData.flights.length})
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-1 px-2">
                    {dayData.flights.length > 0 && (
                      <button
                        onClick={() => onSelectFlight(dayData.flights[0])}
                        className="text-[10px] text-primary hover:text-primary/80"
                      >
                        View
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default WeeklyFlightSchedule;
