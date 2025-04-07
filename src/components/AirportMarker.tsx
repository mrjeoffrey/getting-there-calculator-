
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
  onPopupOpen?: (airportCode: string | null) => void;
  activePopup?: string | null;
}

const AirportMarker: React.FC<AirportMarkerProps> = ({ 
  airport, 
  isPulsing = false,
  isHighlighted = false,
  type = 'origin',
  isDarkMode = false,
  departureFlights = [],
  arrivalFlights = [],
  connectingFlights = [],
  onPopupOpen,
  activePopup
}) => {
  // Check if we have any flights to display
  const hasFlights = departureFlights.length > 0 || arrivalFlights.length > 0 || (type !== 'origin' && connectingFlights.length > 0);
  const map = useMap();
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);

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

  // Track if we're currently handling an event to prevent circular triggers
  const isHandlingEvent = useRef(false);

  // Only manage popup state based on activePopup value
  useEffect(() => {
    if (markerRef.current) {
      if (activePopup === airportCode && !popupOpen) {
        // Only open if currently closed
        markerRef.current.openPopup();
        setPopupOpen(true);
        console.log(`Opening popup for ${airportCode} by parent control`);
      } else if (activePopup !== airportCode && popupOpen) {
        // Close if we're not the active popup but we're open
        markerRef.current.closePopup();
        setPopupOpen(false);
        console.log(`Closing popup for ${airportCode} by parent control`);
      }
    }
  }, [activePopup, airportCode, popupOpen]);

  // Auto-open popup for origin airport when component mounts
  useEffect(() => {
    if (type === 'origin' && hasFlights && markerRef.current && !popupOpen && !activePopup && !popupDismissed ) {
      const timer = setTimeout(() => {
        if (markerRef.current && !isHandlingEvent.current) {
          isHandlingEvent.current = true;
          markerRef.current.openPopup();
          setPopupOpen(true);
          if (onPopupOpen) {
            onPopupOpen(airportCode);
          }
          console.log(`Opening popup for ${airportCode} (origin) on initial load`);
          isHandlingEvent.current = false;
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [type, hasFlights, airportCode, onPopupOpen, popupOpen, activePopup]);

  return (
    <Marker 
      ref={markerRef}
      position={[airport.lat, airport.lng]} 
      icon={createAirportMarkerIcon(type)}
      zIndexOffset={2000}
      eventHandlers={{
        popupopen: () => {
          if (!isHandlingEvent.current) {
            isHandlingEvent.current = true;
            setPopupOpen(true);
            if (onPopupOpen) {
              onPopupOpen(airportCode);
            }
            console.log(`Popup opened for ${airportCode}`);
            isHandlingEvent.current = false;
          }
        },
        popupclose: () => {
          if (!isHandlingEvent.current) {
            isHandlingEvent.current = true;
            setPopupOpen(false);
            if (type === 'origin') {
              setPopupDismissed(true);
            }
            // Notify parent about popup close only if this is the active popup
            if (onPopupOpen && activePopup === airportCode) {
              onPopupOpen(null);
            }
            console.log(`Popup closed for ${airportCode}`);
            isHandlingEvent.current = false;
          }
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
        closeButton={true}
        offset={[0, 10]}  // Offset to position the popup below the marker
      >
        <div className="p-2">
          <h3 className="text-lg font-semibold mb-2">{airport.city || airport.name} ({airport.code})</h3>
          
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
