
import React, { useState, useEffect, useRef } from 'react';
import { Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import { Airport, Flight, ConnectionFlight } from '../types/flightTypes';
import { createAirportMarkerIcon } from './map/MarkerIconFactory';
import FlightScheduleTable from './FlightScheduleTable';
import L from 'leaflet';

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
  showPopupAfterAnimation?: boolean;
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
  destinationAirport = null,
  showPopupAfterAnimation = false
}) => {
  const hasFlights = departureFlights.length > 0 || arrivalFlights.length > 0 || (type !== 'origin' && connectingFlights.length > 0);
  const map = useMap();
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);

  const markerRef = useRef(null);
  
  const airportCode = airport.code || 'N/A';
  const airportName = airport.name || `Airport ${airportCode}`;
  
  // Updated popup offset calculation
  const getPopupOffset = () => {
    if (!destinationAirport) {
      return [0, -35] as [number, number]; // More compact
    }
    
    const dx = destinationAirport.lng - airport.lng;
    const dy = destinationAirport.lat - airport.lat;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Adjust offset based on airport type
    if (type === 'origin') {
      // For origin, move popup towards the destination
      return [Math.cos(angle * Math.PI / 180) * 20, -35] as [number, number];
    } 
    else if (type === 'destination') {
      // For destination, move popup away from origin
      return [Math.cos((angle + 180) * Math.PI / 180) * 20, -35] as [number, number];
    } 
    else {
      // For connection points
      return [0, -35] as [number, number];
    }
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
    // Delay showing the popup for origin until all animations are complete
    if (type === 'origin' && hasFlights && markerRef.current && !popupOpen && !activePopup && !popupDismissed && !showPopupAfterAnimation) {
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
  }, [type, hasFlights, airportCode, onPopupOpen, popupOpen, activePopup, showPopupAfterAnimation]);

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
            
            // Center the map above the popup to avoid pulling it in the opposite direction
            if (type === 'destination') {
              const popupHeight = 400; // Approximate height of popup
              const offsetY = -popupHeight / 2;
              
              // Create a point offset from the airport location
              const targetPoint = map.project([airport.lat, airport.lng]).subtract([0, offsetY]);
              const targetLatLng = map.unproject(targetPoint);
              
              // Use panTo with the new target point
              map.panTo(targetLatLng, { 
                animate: true, 
                duration: 0.5,
                noMoveStart: true
              });
            }
            
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
        minWidth={450}  // Reduced from 550 for more compact display
        maxWidth={550}  // Reduced from 650 for more compact display
        autoPan={true}
        autoPanPaddingTopLeft={[50, 50]}
        autoPanPaddingBottomRight={[50, 50]}
        keepInView={true}
        closeButton={true}
        offset={getPopupOffset()}
      >
        <div className="p-2 max-h-[350px] overflow-auto"> {/* Reduced from 400px to 350px */}
          <h3 className="text-lg font-semibold mb-1">{airport.city || airport.name} ({airport.code})</h3>
          
          {hasFlights ? (
            <div className="mt-1"> {/* Reduced margin from 2 to 1 */}
              {type === 'origin' && (
                <div className="mb-2"> {/* Reduced margin from 3 to 2 */}
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
