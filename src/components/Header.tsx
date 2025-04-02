
import React from 'react';
import SearchPanel from './SearchPanel';
import { SearchParams } from '../types/flightTypes';

interface HeaderProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
  onToggleInstructions?: () => void;
}

const Header = ({ onSearch, loading, onToggleInstructions }: HeaderProps) => {
  return (
    <header className="border-b bg-white shadow-sm z-20 relative">
      <div className="container mx-auto flex items-center justify-between p-3">
        <div className="flex items-center space-x-2">
          <div className="rounded-full border-2 border-blue-500 p-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Getting There Calculator</h1>
            <p className="text-xs text-gray-500">Find available flights and routes to your destination</p>
          </div>
        </div>
        
        <div className="w-full max-w-sm">
          <SearchPanel 
            onSearch={onSearch} 
            loading={loading} 
            onToggleInstructions={onToggleInstructions}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
