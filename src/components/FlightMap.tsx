
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { Flight, ConnectionFlight } from '../types/flightTypes';
import AirportMarker from './AirportMarker';
import FlightPath from './FlightPath';

interface FlightMapProps {
  directFlights: Flight[];
  connectingFlights: ConnectionFlight[];
  selectedFlightId?: string | null;
  loading?: boolean;
  onFlightSelect?: (flight: any) => void;
}

const FlightMap: React.FC<FlightMapProps> = ({ 
  directFlights, 
  connectingFlights, 
  selectedFlightId,
  loading = false,
  onFlightSelect
}) => {
  const [mapReady, setMapReady] = useState(false);
  const allFlights = [...directFlights, ...connectingFlights.flatMap(cf => cf.flights)];
  
  // Only show map contents when it's not loading
  const showContent = !loading && mapReady;
  
  // Get all unique airports to show markers
  const airports = new Map();
  
  if (showContent) {
    allFlights.forEach(flight => {
      if (flight.departureAirport && !airports.has(flight.departureAirport.code)) {
        airports.set(flight.departureAirport.code, flight.departureAirport);
      }
      if (flight.arrivalAirport && !airports.has(flight.arrivalAirport.code)) {
        airports.set(flight.arrivalAirport.code, flight.arrivalAirport);
      }
    });
  }
  
  const ResetMapView = () => {
    const map = useMap();
    
    useEffect(() => {
      setMapReady(true);
      
      // Initial map view - set a default world view
      map.setView([20, 0], 2);
      
      // Handle map responsiveness
      const handleResize = () => {
        map.invalidateSize();
      };
      
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }, [map]);
    
    return null;
  };
  
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      worldCopyJump={true} // Allow the map to pan infinitely in the horizontal direction
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />
      <ResetMapView />
      
      {showContent && (
        <>
          {/* Render airport markers */}
          {Array.from(airports.values()).map(airport => (
            <AirportMarker
              key={`airport-${airport.code}`}
              airport={airport}
              isHighlighted={false}
            />
          ))}
          
          {/* Render direct flight paths */}
          {directFlights.map(flight => (
            <FlightPath
              key={`direct-${flight.id}`}
              departure={flight.departureAirport}
              arrival={flight.arrivalAirport}
              type="direct"
              isActive={selectedFlightId === flight.id}
              duration={flight.duration}
              departureTime={flight.departureTime}
              arrivalTime={flight.arrivalTime}
              flightNumber={flight.flightNumber}
              airline={flight.airline}
              flightInfo={[{
                flightNumber: flight.flightNumber,
                airline: flight.airline,
                departureTime: flight.departureTime,
                arrivalTime: flight.arrivalTime,
                duration: flight.duration,
                price: 250 // Placeholder price
              }]}
              onFlightSelect={onFlightSelect}
            />
          ))}
          
          {/* Render connecting flight paths */}
          {connectingFlights.map(connection => (
            <React.Fragment key={`connection-${connection.id}`}>
              {connection.flights.map((flight, index, flights) => {
                const isLast = index === flights.length - 1;
                const nextFlight = !isLast ? flights[index + 1] : null;
                
                return (
                  <FlightPath
                    key={`connection-leg-${flight.id}-${index}`}
                    departure={flight.departureAirport}
                    arrival={nextFlight ? nextFlight.departureAirport : flight.arrivalAirport}
                    type="connecting"
                    isActive={selectedFlightId === connection.id || selectedFlightId === flight.id}
                    duration={flight.duration}
                    departureTime={flight.departureTime}
                    arrivalTime={flight.arrivalTime}
                    flightNumber={flight.flightNumber}
                    airline={flight.airline}
                    flightInfo={connection.flights.map(f => ({
                      flightNumber: f.flightNumber,
                      airline: f.airline,
                      departureTime: f.departureTime,
                      arrivalTime: f.arrivalTime,
                      duration: f.duration,
                      price: connection.price / connection.flights.length // Distribute price across flights
                    }))}
                    onFlightSelect={onFlightSelect}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </>
      )}
    </MapContainer>
  );
};

export default FlightMap;
