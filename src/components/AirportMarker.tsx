
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Airport, Flight, ConnectionFlight } from '../types/flightTypes';
import { createAirportMarkerIcon } from './map/MarkerIconFactory';
import FlightScheduleTable from './FlightScheduleTable';
import { useMap } from 'react-leaflet';

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
  
  const airportCode = airport.code || 'N/A';
  const airportName = airport.name || `Airport ${airportCode}`;

  // This function will show all planes for flights connected to this airport
  const handleMarkerClick = () => {
    console.log(`Airport ${airportCode} clicked, showing all planes for connected flights`);
    // Find all flight path components and call their methods to show all planes
    const flightPaths = document.querySelectorAll('.flight-path');
    
    // Custom event to show all planes for this airport's flights
    const showPlanesEvent = new CustomEvent('showAirportPlanes', { 
      detail: { 
        airportCode,
        departureFlights,
        arrivalFlights,
        connectingFlights
      } 
    });
    document.dispatchEvent(showPlanesEvent);
  };

  return (
    <Marker 
      position={[airport.lat, airport.lng]} 
      icon={createAirportMarkerIcon(type)}
      zIndexOffset={2000}
      eventHandlers={{
        click: handleMarkerClick
      }}
    >
      <Popup 
        className="flight-popup"
        minWidth={320} 
        maxWidth={500}
        autoPan={true}  // Ensure map pans to fit popup
        autoPanPaddingTopLeft={[50, 50]}  // Add padding to avoid edge of screen
        autoPanPaddingBottomRight={[50, 50]}  // Add padding to avoid edge of screen
        keepInView={true} // Important: Keep popup in view at all times
      >
        <div className="p-2">
          <h3 className="font-semibold text-primary text-lg mb-2">{airportName} ({airportCode})</h3>
          <p className="text-sm text-muted-foreground mb-3">{airport.city}, {airport.country}</p>
          
          {hasFlights ? (
            <div className="mt-3">
              {departureFlights.length > 0 && (
                <div className="mb-4">
                  <FlightScheduleTable 
                    title="Departing Flights" 
                    flights={departureFlights} 
                  />
                </div>
              )}
              
              {arrivalFlights.length > 0 && (
                <div>
                  <FlightScheduleTable 
                    title="Arriving Flights" 
                    flights={arrivalFlights} 
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
