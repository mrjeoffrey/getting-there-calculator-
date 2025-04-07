
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

    </div>
  );
};

export default MapInstructionCard;
