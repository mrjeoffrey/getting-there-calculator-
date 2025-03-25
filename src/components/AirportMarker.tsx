
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Airport, Flight } from '../types/flightTypes';
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
  const hasFlights = departureFlights.length > 0 || arrivalFlights.length > 0;

  return (
    <Marker 
      position={[airport.lat, airport.lng]} 
      icon={createAirportMarkerIcon(type)}
      zIndexOffset={1000} // Ensure airport markers are always on top
    >
      <Popup className="flight-popup" minWidth={320} maxWidth={500}>
        <div className="p-2">
          <h3 className="font-semibold text-primary text-lg mb-2">{airport.name} ({airport.code})</h3>
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
