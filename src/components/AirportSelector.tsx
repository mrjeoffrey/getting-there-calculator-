
import React, { useState, useEffect } from 'react';
import { airports } from '../utils/flightUtils';
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

interface AirportSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  exclude?: string[];
}

const AirportSelector: React.FC<AirportSelectorProps> = ({ 
  value, 
  onChange, 
  placeholder,
  exclude = []
}) => {
  const [open, setOpen] = useState(false);
  const [filteredAirports, setFilteredAirports] = useState(airports);
  
  // Filter out excluded airports
  useEffect(() => {
    setFilteredAirports(airports.filter(airport => !exclude.includes(airport.code)));
  }, [exclude]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-14 px-4 py-3 text-left font-normal bg-white/50 hover:bg-white/60 border-white/20"
        >
          {value ? (
            <>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">
                  {airports.find((airport) => airport.code === value)?.city}
                </span>
                <span className="text-xs text-muted-foreground">
                  {airports.find((airport) => airport.code === value)?.name} ({value})
                </span>
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-full min-w-[300px]" align="start" side="bottom">
        <Command>
          <CommandInput placeholder="Search airport..." />
          <CommandEmpty>No airport found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {filteredAirports.map((airport) => (
              <CommandItem
                key={airport.code}
                value={airport.code}
                onSelect={(currentValue) => {
                  onChange(currentValue === value ? "" : currentValue);
                  setOpen(false);
                }}
                className="flex flex-col items-start py-2"
              >
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div className="font-medium">{airport.city}</div>
                    <div className="text-xs text-muted-foreground">
                      {airport.name} ({airport.code})
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === airport.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default AirportSelector;
