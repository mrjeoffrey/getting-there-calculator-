
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Airport } from '../types/flightTypes';

interface AirportMarkerProps {
  airport: Airport;
  isPulsing?: boolean;
  isHighlighted?: boolean;
  type?: 'origin' | 'destination' | 'connection';
  isDarkMode?: boolean;
}

const AirportMarker: React.FC<AirportMarkerProps> = ({ 
  airport, 
  isPulsing = false,
  isHighlighted = false,
  type = 'origin',
  isDarkMode = false
}) => {
  // Create custom markers for different types of airports
  const createCustomIcon = (type: string) => {
    let className = 'flex items-center justify-center ';
    let size = type === 'origin' || type === 'destination' ? 32 : 24;
    let color = '';
    
    switch (type) {
      case 'origin':
        color = '#E91E63'; // Pink for origin like in reference
        className += 'origin-marker';
        break;
      case 'destination':
        color = '#4CAF50'; // Green for destination like in reference
        className += 'destination-marker';
        break;
      case 'connection':
        color = '#FFC107'; // Amber for connection
        className += 'connection-marker';
        break;
      default:
        color = '#E91E63';
        className += 'origin-marker';
    }
    
    // Create HTML for the marker with a shadow effect and inner dot
    const html = `
      <div class="${className}" style="width: ${size}px; height: ${size}px;">
        <div class="marker-outer" style="
          background-color: white;
          border-radius: 50%;
          width: ${size}px;
          height: ${size}px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 2px white, 0 0 8px rgba(0,0,0,0.5);
        ">
          <div class="marker-inner" style="
            background-color: ${color};
            border-radius: 50%;
            width: ${size * 0.7}px;
            height: ${size * 0.7}px;
            ${type === 'origin' ? 'animation: pulse 2s infinite;' : ''}
          "></div>
        </div>
      </div>
    `;
    
    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: html,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
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
