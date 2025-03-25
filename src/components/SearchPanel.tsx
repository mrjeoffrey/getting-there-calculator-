
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { SearchParams } from '../types/flightTypes';
import AirportSelector from './AirportSelector';
import { toast } from "sonner";

interface SearchPanelProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ onSearch, loading }) => {
  const [from, setFrom] = useState('');
  const [to] = useState('HND'); // Fixed to Tokyo Haneda Airport

  const handleSearch = () => {
    if (!from) {
      toast.error("Please select a departure airport");
      return;
    }
    
    onSearch({
      from,
      to,
      // No date required, will search for the next 7 days automatically
    });
  };

  return (
    <div className="search-panel animate-scale-in">
      <h2 className="text-2xl font-semibold text-foreground mb-4">Find Your Flight to Tokyo</h2>
      
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
              <span className="text-sm font-medium">Tokyo Haneda International Airport (HND)</span>
            </div>
            <div className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              Japan
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between items-center flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            We'll show you flights for the next 7 days
          </p>
          
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleSearch}
            disabled={!from || loading}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Searching...
              </div>
            ) : (
              <div className="flex items-center">
                <Search className="mr-1 h-4 w-4" />
                Search
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SearchPanel;
