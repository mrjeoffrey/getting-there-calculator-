
import React from 'react';

interface MapInstructionCardProps {
  className?: string;
  visible: boolean;
  onClose: () => void;
}

// This component is now a no-op since it's not needed
const MapInstructionCard: React.FC<MapInstructionCardProps> = ({ 
  className,
  visible,
  onClose
}) => {
  if (!visible) return null;
  return null; // Return null to not render anything
};

export default MapInstructionCard;
