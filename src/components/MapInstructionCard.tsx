
import React, { useState, useEffect } from 'react';
import { X, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

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
      <div className="p-4 relative">
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close instructions"
        >
          <X size={18} />
        </button>
        
        <div className="flex items-start mb-2">
          <HelpCircle className="text-blue-500 mr-2 flex-shrink-0 mt-1" size={20} />
          <h3 className="font-semibold text-lg">Map Instructions</h3>
        </div>
        
        <button 
          onClick={toggleCollapse} 
          className="flex items-center text-sm text-blue-500 hover:text-blue-700 mb-2 font-medium"
        >
          {isCollapsed ? (
            <>
              <span>Show details</span>
              <ChevronDown size={16} className="ml-1" />
            </>
          ) : (
            <>
              <span>Hide details</span>
              <ChevronUp size={16} className="ml-1" />
            </>
          )}
        </button>
        
        {!isCollapsed && (
          <div className="text-sm space-y-3 text-gray-700 dark:text-gray-300">
            <p><span className="font-semibold">Click airport markers</span> to view flight details.</p>
            <p><span className="font-semibold">Hover over flight paths</span> to see route information.</p>
            <p><span className="font-semibold">Green lines</span> represent direct flights.</p>
            <p><span className="font-semibold">Yellow dashed lines</span> represent connecting flights.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapInstructionCard;
