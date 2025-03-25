
import React from 'react';
import { Globe } from 'lucide-react';
import SearchPanel from './SearchPanel';
import { SearchParams } from '../types/flightTypes';

interface HeaderProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

const Header: React.FC<HeaderProps> = ({ onSearch, loading }) => {
  return (
    <header className="w-full glass-panel rounded-2xl p-4 mb-6 animate-slide-down">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <div className="p-2 bg-primary/10 rounded-full mr-3 flex-shrink-0">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground whitespace-nowrap">Getting There Calculator</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Find the best routes to your destination</p>
          </div>
        </div>
        <div className="w-full md:max-w-[350px]">
          <SearchPanel 
            onSearch={onSearch} 
            loading={loading} 
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
