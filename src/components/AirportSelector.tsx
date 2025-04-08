import React, { useState, useEffect, useMemo } from 'react';
import { transformAirports } from '../utils/flightUtils';
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { airports } from "../utils/airports.json";;

interface AirportSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  exclude?: string[];
  className?: string;
}

const AirportSelector: React.FC<AirportSelectorProps> = ({
  value,
  onChange,
  placeholder,
  exclude = []
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const transformedAirports = transformAirports(airports);

  const filteredAirports = useMemo(() => {
    // Add more detailed logging

    console.log('Search Query:', searchQuery);
    console.log('Exclude:', exclude);
  
    if (!Array.isArray(transformedAirports)) {
      console.error('transformedAirports is not an array');
      return [];
    }
  
    const filtered = transformedAirports.filter(airport => {
      if (!airport || !airport.code) {
        console.log('Invalid airport:', airport);
        return false;
      }
  
      if (Array.isArray(exclude) && exclude.includes(airport.code)) {
        console.log('Excluded airport:', airport.code);
        return false;
      }
  
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = 
          airport.code.toLowerCase().includes(query) ||
          airport.city.toLowerCase().includes(query) ||
          airport.name.toLowerCase().includes(query);
        
      
        return matches;
      }
  
      return true;
    });
  
    console.log('Filtered airports count:', filtered.length);
    return filtered;
  }, [transformedAirports, exclude, searchQuery]);
  
  // Find selected airport
  const selectedAirport = useMemo(() => {
    if (!value || !Array.isArray(transformedAirports)) return null;
    return transformedAirports.find(airport => airport && airport.code === value) || null;
  }, [value]);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-14 px-4 py-3 text-left font-normal bg-white/50 hover:bg-white/60 border-white/20"
        >
          {selectedAirport ? (
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {selectedAirport.city}
              </span>
              <span className="text-xs text-muted-foreground">
                {selectedAirport.name} ({selectedAirport.code})
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-full min-w-[300px]" align="start" side="bottom">
        <div className="border-none overflow-hidden rounded-md shadow-md">
          <div className="p-2">
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search airport..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredAirports.length === 0 ? (
              <div className="py-6 text-center text-sm">
                No airport found.
              </div>
            ) : (
              filteredAirports.map(airport => (
                <div
                  key={airport.code}
                  className={`flex items-center justify-between w-full px-2 py-2 text-sm cursor-pointer rounded hover:bg-accent ${
                    value === airport.code ? "bg-accent/50" : ""
                  }`}
                  onClick={() => {
                    onChange(value === airport.code ? "" : airport.code);
                    setOpen(false);
                  }}
                >
                  <div>
                    <div className="font-medium">{airport.city}</div>
                    <div className="text-xs text-muted-foreground">
                      {airport.name} ({airport.code})
                    </div>
                  </div>
                  {value === airport.code && (
                    <Check className="h-4 w-4" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AirportSelector;