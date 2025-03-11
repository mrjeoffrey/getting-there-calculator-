
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Airport } from '../types/flightTypes';

interface AirportMarkerProps {
  airport: Airport;
  isPulsing?: boolean;
  type?: 'origin' | 'destination' | 'connection';
  isDarkMode: boolean;
}

const AirportMarker: React.FC<AirportMarkerProps> = ({ 
  airport, 
  isPulsing = false,
  type = 'origin',
}) => {
  // Create custom markers for different types of airports
  const createCustomIcon = (type: string) => {
    let className = 'w-4 h-4 rounded-full border-2 border-white ';
    
    switch (type) {
      case 'origin':
        className += 'bg-primary animate-pulse';
        break;
      case 'destination':
        className += 'bg-primary';
        break;
      case 'connection':
        className += 'bg-accent';
        break;
      default:
        className += 'bg-primary';
    }
    
    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="${className}"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    
    return customIcon;
  };

  return (
    <Marker 
      position={[airport.lat, airport.lng]} 
      icon={createCustomIcon(type)}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-semibold text-primary">{airport.name} ({airport.code})</h3>
          <p className="text-sm text-muted-foreground">{airport.city}, {airport.country}</p>
        </div>
      </Popup>
    </Marker>
  );
};

export default AirportMarker;
