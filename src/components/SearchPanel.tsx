
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { SearchParams } from '../types/flightTypes';
import AirportSelector from './AirportSelector';
import { toast } from "sonner";

interface SearchPanelProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
  onToggleInstructions?: () => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ 
  onSearch, 
  loading, 
  onToggleInstructions 
}) => {
  const [from, setFrom] = useState('');
  const [to] = useState('HND'); // Fixed to Tokyo Haneda Airport

  const handleSearch = () => {
    if (!from) {
      toast.error("Please select a departure airport");
      return;
    }
    
    console.log(`Searching for flights from ${from} to ${to}`);
    
    // Toggle map instructions when search is clicked
    if (onToggleInstructions) {
      onToggleInstructions();
    }
    
    onSearch({
      from,
      to,
      // No date required, will search for the next 7 days automatically
    });
  };

  return (
    <div className="animate-scale-in w-full">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <AirportSelector 
            value={from} 
            onChange={setFrom} 
            placeholder="Select departure airport" 
            exclude={to ? [to] : []}
          />
        </div>
        
        <Button 
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={handleSearch}
          disabled={!from || loading}
        >
          {loading ? (
            <div className="flex items-center">
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              <span className="sr-only md:not-sr-only">Searching...</span>
            </div>
          ) : (
            <div className="flex items-center">
              <Search className="h-4 w-4" />
              <span className="sr-only md:not-sr-only ml-1">Search</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SearchPanel;
