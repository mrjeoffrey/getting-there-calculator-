
import React, { useState, useEffect, useRef } from 'react';
import { Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import { Airport, Flight, ConnectionFlight } from '../types/flightTypes';
import { createAirportMarkerIcon } from './map/MarkerIconFactory';
import FlightScheduleTable from './FlightScheduleTable';

interface AirportMarkerProps {
  airport: Airport;
  isPulsing?: boolean;
  isHighlighted?: boolean;
  type?: 'origin' | 'destination' | 'connection';
  isDarkMode?: boolean;
  departureFlights?: Flight[];
  arrivalFlights?: Flight[];
  connectingFlights?: ConnectionFlight[];
}

const AirportMarker: React.FC<AirportMarkerProps> = ({ 
  airport, 
  isPulsing = false,
  isHighlighted = false,
  type = 'origin',
  isDarkMode = false,
  departureFlights = [],
  arrivalFlights = [],
  connectingFlights = []
}) => {
  // Check if we have any flights to display
  const hasFlights = departureFlights.length > 0 || arrivalFlights.length > 0 || (type !== 'origin' && connectingFlights.length > 0);
  const map = useMap();
  const [popupOpen, setPopupOpen] = useState(false);
  const markerRef = useRef(null);
  
  const airportCode = airport.code || 'N/A';
  const airportName = airport.name || `Airport ${airportCode}`;
  
  // Tooltip content based on marker type
  const getTooltipContent = () => {
    switch(type) {
      case 'origin':
        return `Click to view flights from ${airport.city || airportName}`;
      case 'destination':
        return `Click to view flights to ${airport.city || airportName}`;
      case 'connection':
        return `Click to view connections via ${airport.city || airportName}`;
      default:
        return airport.city || airportName;
    }
  };

  // Auto-open popup for origin airport when component mounts
  useEffect(() => {
    // Only open popup for origin airport with flights
    if (type === 'origin' && hasFlights && markerRef.current) {
      // Use setTimeout to ensure the marker is fully rendered
      setTimeout(() => {
        markerRef.current.openPopup();
        setPopupOpen(true);
        console.log(`Opening popup for ${airportCode} (origin)`);
      }, 100);
    }
  }, [type, hasFlights, airportCode, markerRef]);

  return (
    <Marker 
      ref={markerRef}
      position={[airport.lat, airport.lng]} 
      icon={createAirportMarkerIcon(type)}
      zIndexOffset={2000}
      eventHandlers={{
        popupopen: () => {
          setPopupOpen(true);
          console.log(`Popup opened for ${airportCode}`);
        },
        popupclose: () => {
          setPopupOpen(false);
          console.log(`Popup closed for ${airportCode}`);
        }
      }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
        {getTooltipContent()}
      </Tooltip>
      
      <Popup 
        className="flight-popup"
        minWidth={320} 
        maxWidth={500}
        autoPan={true}
        autoPanPaddingTopLeft={[50, 50]}
        autoPanPaddingBottomRight={[50, 50]}
        keepInView={true}
        autoClose={false}
      >
        <div className="p-2">
          <h3 className="text-base font-medium mb-1">
            {type === 'origin' ? `Flights from ${airport.city || airportName}` : 
             type === 'destination' ? `Flights to ${airport.city || airportName}` :
             `Connections via ${airport.city || airportName}`}
          </h3>
          
          {hasFlights ? (
            <div className="mt-2">
              {departureFlights.length > 0 && (
                <div className="mb-3">
                  <FlightScheduleTable 
                    flights={departureFlights} 
                    title={type === 'origin' ? "Departing Flights" : undefined}
                  />
                </div>
              )}
              
              {arrivalFlights.length > 0 && (
                <div>
                  <FlightScheduleTable
                    flights={arrivalFlights} 
                    title={type === 'destination' ? "Arriving Flights" : undefined}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No flight information available for this airport.</p>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

export default AirportMarker;
