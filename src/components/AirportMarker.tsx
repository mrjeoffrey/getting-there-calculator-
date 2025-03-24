
import React, { useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Airport, Flight } from '../types/flightTypes';
import { createAirportMarkerIcon } from './map/MarkerIconFactory';
import FlightScheduleTable from './FlightScheduleTable';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

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
  const [showFlightDetails, setShowFlightDetails] = useState(false);
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
          
          {hasFlights && (
            <div className="mt-3">
              <Collapsible open={showFlightDetails} onOpenChange={setShowFlightDetails}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mb-3"
                  >
                    {showFlightDetails ? 'Hide Flight Details' : 'View Flight Details'}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {departureFlights.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-sm mb-2">Departing Flights</h4>
                      <FlightScheduleTable 
                        title="Departing Flights" 
                        flights={departureFlights} 
                      />
                    </div>
                  )}
                  
                  {arrivalFlights.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Arriving Flights</h4>
                      <FlightScheduleTable 
                        title="Arriving Flights" 
                        flights={arrivalFlights} 
                      />
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
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
