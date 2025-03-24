
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Airport, Flight, ConnectionFlight } from '../types/flightTypes';

interface AirportMarkerProps {
  airport: Airport;
  isPulsing?: boolean;
  isHighlighted?: boolean;
  type?: 'origin' | 'destination' | 'connection';
  isDarkMode?: boolean;
  departureFlights?: Flight[];
  arrivalFlights?: Flight[];
}

const AirportMarker: React.FC<AirportMarkerProps> = ({ 
  airport, 
  isPulsing = false,
  isHighlighted = false,
  type = 'origin',
  isDarkMode = false,
  departureFlights = [],
  arrivalFlights = []
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

  // Format day of week from date string
  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
  };

  const hasFlights = departureFlights.length > 0 || arrivalFlights.length > 0;

  return (
    <Marker 
      position={[airport.lat, airport.lng]} 
      icon={createCustomIcon(type)}
    >
      <Popup className="flight-popup" minWidth={320} maxWidth={500}>
        <div className="p-2">
          <h3 className="font-semibold text-primary text-lg mb-2">{airport.name} ({airport.code})</h3>
          <p className="text-sm text-muted-foreground mb-3">{airport.city}, {airport.country}</p>
          
          {hasFlights && (
            <div className="mt-3">
              {departureFlights.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-sm text-primary mb-2 border-b pb-1">Departing Flights</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="py-1 px-2 text-left">Airline</th>
                          <th className="py-1 px-2 text-left">Duration</th>
                          <th className="py-1 px-2 text-left">Day</th>
                          <th className="py-1 px-2 text-left">Departure</th>
                          <th className="py-1 px-2 text-left">Arrival</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departureFlights.map((flight, index) => (
                          <tr key={`dep-${flight.id}-${index}`} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                            <td className="py-1 px-2">{flight.airline}</td>
                            <td className="py-1 px-2">{flight.duration}</td>
                            <td className="py-1 px-2">{getDayOfWeek(flight.departureTime)}</td>
                            <td className="py-1 px-2">{flight.departureTime.split('T')[1]?.substring(0, 5)}</td>
                            <td className="py-1 px-2">{flight.arrivalTime.split('T')[1]?.substring(0, 5)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {arrivalFlights.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-primary mb-2 border-b pb-1">Arriving Flights</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="py-1 px-2 text-left">Airline</th>
                          <th className="py-1 px-2 text-left">Duration</th>
                          <th className="py-1 px-2 text-left">Day</th>
                          <th className="py-1 px-2 text-left">Departure</th>
                          <th className="py-1 px-2 text-left">Arrival</th>
                        </tr>
                      </thead>
                      <tbody>
                        {arrivalFlights.map((flight, index) => (
                          <tr key={`arr-${flight.id}-${index}`} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                            <td className="py-1 px-2">{flight.airline}</td>
                            <td className="py-1 px-2">{flight.duration}</td>
                            <td className="py-1 px-2">{getDayOfWeek(flight.departureTime)}</td>
                            <td className="py-1 px-2">{flight.departureTime.split('T')[1]?.substring(0, 5)}</td>
                            <td className="py-1 px-2">{flight.arrivalTime.split('T')[1]?.substring(0, 5)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!hasFlights && (
            <p className="text-sm text-muted-foreground italic">No flight information available for this airport.</p>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

export default AirportMarker;
