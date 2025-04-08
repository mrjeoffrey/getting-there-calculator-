
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
  destinationAirport?: Airport | null;
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
  activePopup,
  destinationAirport = null
}) => {
  const hasFlights = departureFlights.length > 0 || arrivalFlights.length > 0 || (type !== 'origin' && connectingFlights.length > 0);
  const map = useMap();
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);

  const markerRef = useRef(null);
  
  const airportCode = airport.code || 'N/A';
  const airportName = airport.name || `Airport ${airportCode}`;
  
  // Updated to move popup higher up from marker
  const getPopupOffset = () => {
    if (!destinationAirport) {
      return [0, -45] as [number, number]; // Moved higher from -40 to -45
    }
    
    const dx = destinationAirport.lng - airport.lng;
    const dy = destinationAirport.lat - airport.lat;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    let xOffset = 0;
    let yOffset = -45; // Moved higher from -40 to -45
    
    if (type === 'origin') {
      xOffset = Math.cos(angle * Math.PI / 180) * 20;
    } 
    else if (type === 'destination') {
      xOffset = Math.cos((angle + 180) * Math.PI / 180) * 20;
    } 
    else {
      return [0, -45] as [number, number]; // Moved higher from -40 to -45
    }
    
    return [xOffset, yOffset] as [number, number];
  };
  
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

  const isHandlingEvent = useRef(false);

  useEffect(() => {
    if (markerRef.current) {
      if (activePopup === airportCode && !popupOpen) {
        markerRef.current.openPopup();
        setPopupOpen(true);
        console.log(`Opening popup for ${airportCode} by parent control`);
      } else if (activePopup !== airportCode && popupOpen) {
        markerRef.current.closePopup();
        setPopupOpen(false);
        console.log(`Closing popup for ${airportCode} by parent control`);
      }
    }
  }, [activePopup, airportCode, popupOpen]);

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
      }, 5000);
      
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
        className="flight-popup between-airports"
        minWidth={550}  // Increased from 500
        maxWidth={650}  // Increased from 600
        autoPan={true}
        autoPanPaddingTopLeft={[50, 50]}
        autoPanPaddingBottomRight={[50, 50]}
        keepInView={true}
        closeButton={true}
        offset={getPopupOffset()}
      >
        <div className="p-2 max-h-[400px] overflow-auto"> {/* Increased height from 350px to 400px */}
          <h3 className="text-lg font-semibold mb-2">{airport.city || airport.name} ({airport.code})</h3>
          
          {hasFlights ? (
            <div className="mt-2">
              {type === 'origin' && (
                <div className="mb-3">
                  <FlightScheduleTable 
                    flights={departureFlights} 
                    connectionFlights={connectingFlights}
                    title="All Flights to Destination"
                    type="origin"
                  />
                </div>
              )}
              
              {type === 'destination' && arrivalFlights.length > 0 && (
                <div>
                  <FlightScheduleTable
                    connectionFlights={connectingFlights}
                    flights={arrivalFlights} 
                    title="Arriving Flights"
                    type = 'destination'
                  />
                </div>
              )}
              
              {type === 'connection' && connectingFlights.length > 0 && (
                <div>
                  <FlightScheduleTable
                    flights={departureFlights}
                    title="Connecting Flights"
                    type = 'connection'
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No flight information available for this airport.</p>
          )}
        </div>
      </Popup>

      <style>{`
        .flight-popup.between-airports {
          z-index: 1000;
          transform-origin: center center;
        }
      `}</style>
    </Marker>
  );
};

export default AirportMarker;
