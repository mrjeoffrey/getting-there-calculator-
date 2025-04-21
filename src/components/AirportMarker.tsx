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

  const cachedType = useRef<'origin' | 'destination' | 'connection'>(type);

  useEffect(() => {
    const current = cachedType.current;
    if (current === 'connection' && type !== 'connection') {
      cachedType.current = type;
      console.log(`[AirportMarker Type Upgrade] ${airport.code} upgraded to ${type}`);
    } else {
      console.log(`[AirportMarker Type Retain] ${airport.code} remains as ${current}`);
    }
  }, [type]);
  
const getPopupOffset = (): [number, number] => {
  console.log(`Cached type: ${cachedType.current}`);
  // console.log(`Type: ${type}`);
  const actualType = cachedType.current;

  if (actualType === 'origin') {
    return [0, 200];
  }
  if (actualType === 'destination') {
    return [200, 100];
  }

  return [300, 240]; // fallback for connection or unknown
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
      }, 7500);
      
      return () => clearTimeout(timer);
    }
  }, [type, hasFlights, airportCode, onPopupOpen, popupOpen, activePopup]);

  return (
    <Marker 
      ref={markerRef}
      position={[airport.lat, airport.lng]} 
      icon={createAirportMarkerIcon(type)}
      zIndexOffset={type === 'origin' ? 3000 : type === 'destination' ? 2000 : 1900}

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
  minWidth={450}
  maxWidth={500}
  autoPan={true}
        autoPanPaddingTopLeft={[5, 5]}
        autoPanPaddingBottomRight={[5, 5]}
        keepInView={true}
  closeButton={true}
        offset={getPopupOffset()}
      >
        <div className="p-1 max-h-[200px] overflow-auto">
          <h3 className="text-base font-semibold mb-1">{airport.city || airport.name} ({airport.code})</h3>

          {hasFlights ? (
            <div className="mt-1">
              {type === 'origin' && (
                <div className="mb-2">
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
                    type="destination"
                  />
                </div>
              )}

              {type === 'connection' && connectingFlights.length > 0 && (
                <div>
                  <FlightScheduleTable
                    flights={departureFlights}
                    title="Connecting Flights"
                    type="connection"
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No flight information available for this airport.
            </p>
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
