
import React, { useState } from 'react';
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { SearchParams } from '../types/flightTypes';
import AirportSelector from './AirportSelector';

interface SearchPanelProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ onSearch, loading }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('GND'); // Default to Grenada
  const [date, setDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleSearch = () => {
    if (!from || !to || !date) return;
    
    onSearch({
      from,
      to,
      date: date.toISOString().split('T')[0] // Format as YYYY-MM-DD
    });
  };

  return (
    <div className="search-panel animate-scale-in">
      <h2 className="text-2xl font-semibold text-foreground mb-4">Find Your Flight to Grenada</h2>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">Flying From</label>
          <AirportSelector 
            value={from} 
            onChange={setFrom} 
            placeholder="Select departure airport" 
            exclude={to ? [to] : []}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">Flying To</label>
          <div className="flex h-14 px-4 py-3 bg-white/50 hover:bg-white/60 border border-white/20 rounded-md items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium">Maurice Bishop International Airport (GND)</span>
            </div>
            <div className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              Grenada
            </div>
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">Departure Date</label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-14 px-4 py-3 bg-white/50 hover:bg-white/60 border-white/20",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => {
                  setDate(date || new Date());
                  setCalendarOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <Button 
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={handleSearch}
          disabled={!from || !date || loading}
        >
          {loading ? (
            <div className="flex items-center">
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Searching...
            </div>
          ) : (
            <div className="flex items-center">
              <Search className="mr-2 h-4 w-4" />
              Search Flights
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SearchPanel;
