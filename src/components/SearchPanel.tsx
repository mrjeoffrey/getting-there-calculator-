
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
  const [to] = useState('GND'); // Fixed to Grenada's Maurice Bishop International Airport

  const handleSearch = () => {
    if (!from) {
      toast.error("Please select a departure airport");
      return;
    }
    
    console.log(`Searching for flights from ${from} to ${to}`);
    
    onSearch({
      from,
      to,
      // No date required, will search for the next 7 days automatically
    });
    
    // Toggle map instructions when search is clicked
    if (onToggleInstructions) {
      onToggleInstructions();
    }
  };

  return (
    <div className="animate-scale-in w-full">
      <div className="flex items-stretch gap-2 h-14">
  <div className="flex-1 [&_*]:text-blue-100">
    <AirportSelector 
      value={from} 
      onChange={setFrom} 
      placeholder="Select departure airport" 
      exclude={to ? [to] : []}
      className="text-blue-600 h-full"
    />
  </div>

  <Button 
    className="bg-primary hover:bg-primary/90 text-primary-foreground h-full px-10 py-4"
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
              <span className="sr-only md:not-sr-only ml-1 blue-900">Search</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SearchPanel;
