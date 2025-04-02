
import React, { useState, useEffect } from 'react';
import { X, HelpCircle } from 'lucide-react';

interface MapInstructionCardProps {
  className?: string;
  visible: boolean;
  onClose: () => void;
}

const MapInstructionCard: React.FC<MapInstructionCardProps> = ({ 
  className,
  visible,
  onClose
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Reset collapsed state when visibility changes
  useEffect(() => {
    if (visible) {
      setIsCollapsed(false);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div 
      className={`fixed bottom-4 left-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}
      style={{ 
        maxWidth: '300px',
        backdropFilter: 'blur(10px)',
        background: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div className="flex items-center justify-between p-3 border-b">
        <button 
          onClick={toggleCollapse}
          className="flex items-center font-medium text-sm text-gray-700 dark:text-gray-200"
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          {isCollapsed ? "Show Map Instructions" : "Map Instructions"}
        </button>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="p-3 text-sm space-y-2 text-gray-700 dark:text-gray-200">
          <p className="font-medium">✈️ How to Use the Map:</p>
          <ul className="space-y-2 pl-1">
            <li className="flex items-start">
              <span className="mr-2 text-lg">🔴</span>
              <span>Click on the red dot (departure city) to start your journey.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-lg">🟡</span>
              <span>Click on any yellow dot (connecting city) to view flight details, routes, and layovers.</span>
            </li>
          </ul>
          <p className="pl-1 text-gray-600 dark:text-gray-300 italic mt-2 text-xs">
            Explore flight paths and plan the smoothest way to your destination!
          </p>
        </div>
      )}
    </div>
  );
};

export default MapInstructionCard;
