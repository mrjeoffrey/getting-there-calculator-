
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { Flight, ConnectionFlight, Airport } from '../types/flightTypes';
import AirportMarker from './AirportMarker';
import FlightPath from './FlightPath';
import L from 'leaflet';

interface FlightMapProps {
  directFlights: Flight[];
  connectingFlights: ConnectionFlight[];
  selectedFlightId: string | null;
  loading?: boolean;
}

const FlightMap: React.FC<FlightMapProps> = ({
  directFlights,
  connectingFlights,
  selectedFlightId,
  loading = false
}) => {
  const [allAirports, setAllAirports] = useState<Airport[]>([]);
  
  // Collect all unique airports from flights
  useEffect(() => {
    const airports = new Map<string, Airport>();
    
    // Add airports from direct flights
    directFlights.forEach(flight => {
      airports.set(flight.departureAirport.code, flight.departureAirport);
      airports.set(flight.arrivalAirport.code, flight.arrivalAirport);
    });
    
    // Add airports from connecting flights
    connectingFlights.forEach(connection => {
      connection.flights.forEach(flight => {
        airports.set(flight.departureAirport.code, flight.departureAirport);
        airports.set(flight.arrivalAirport.code, flight.arrivalAirport);
      });
    });
    
    setAllAirports(Array.from(airports.values()));
  }, [directFlights, connectingFlights]);
  
  // Get selected flight details
  const getSelectedFlight = () => {
    if (!selectedFlightId) return null;
    
    const directFlight = directFlights.find(f => f.id === selectedFlightId);
    if (directFlight) return { type: 'direct', flight: directFlight };
    
    const connectingFlight = connectingFlights.find(f => f.id === selectedFlightId);
    if (connectingFlight) return { type: 'connecting', flight: connectingFlight };
    
    return null;
  };
  
  const selectedFlight = getSelectedFlight();
  
  // Fit map bounds to visible airports
  const FitBounds = () => {
    const map = useMap();
    
    useEffect(() => {
      if (allAirports.length === 0) return;
      
      const bounds = L.latLngBounds(allAirports.map(airport => [airport.lat, airport.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }, [allAirports, map]);
    
    return null;
  };
  
  // Determine airport marker type
  const getAirportType = (airport: Airport) => {
    if (!selectedFlight) return 'origin';
    
    if (selectedFlight.type === 'direct') {
      const flight = selectedFlight.flight as Flight;
      if (airport.code === flight.departureAirport.code) return 'origin';
      if (airport.code === flight.arrivalAirport.code) return 'destination';
    } else {
      const connection = selectedFlight.flight as ConnectionFlight;
      const firstFlight = connection.flights[0];
      const lastFlight = connection.flights[connection.flights.length - 1];
      
      if (airport.code === firstFlight.departureAirport.code) return 'origin';
      if (airport.code === lastFlight.arrivalAirport.code) return 'destination';
      
      // Check if it's a connecting airport
      for (let i = 0; i < connection.flights.length - 1; i++) {
        if (airport.code === connection.flights[i].arrivalAirport.code) {
          return 'connection';
        }
      }
    }
    
    return 'origin';
  };
  
  // Loading component or fallback
  if (loading) {
    return (
      <div className="map-container flex items-center justify-center bg-muted/20">
        <div className="loader"></div>
      </div>
    );
  }
  
  return (
    <div className="map-container">
      <MapContainer
        style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
        center={[20, 0]}
        zoom={2}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Render flight paths */}
        {selectedFlight ? (
          // Render selected flight path
          selectedFlight.type === 'direct' ? (
            // Direct flight
            <FlightPath
              departure={(selectedFlight.flight as Flight).departureAirport}
              arrival={(selectedFlight.flight as Flight).arrivalAirport}
              type="direct"
              isActive={true}
            />
          ) : (
            // Connecting flight
            (selectedFlight.flight as ConnectionFlight).flights.map((flight, index) => (
              <FlightPath
                key={flight.id}
                departure={flight.departureAirport}
                arrival={flight.arrivalAirport}
                type="connecting"
                isActive={true}
              />
            ))
          )
        ) : (
          // Render all flight paths when no flight is selected
          <>
            {directFlights.map(flight => (
              <FlightPath
                key={flight.id}
                departure={flight.departureAirport}
                arrival={flight.arrivalAirport}
                type="direct"
                isActive={false}
              />
            ))}
            {connectingFlights.map(connection => 
              connection.flights.map(flight => (
                <FlightPath
                  key={flight.id}
                  departure={flight.departureAirport}
                  arrival={flight.arrivalAirport}
                  type="connecting"
                  isActive={false}
                />
              ))
            )}
          </>
        )}
        
        {/* Render airport markers */}
        {allAirports.map(airport => (
          <AirportMarker
            key={airport.code}
            airport={airport}
            type={getAirportType(airport)}
          />
        ))}
        
        {/* Fit map to bounds */}
        <FitBounds />
      </MapContainer>
    </div>
  );
};

export default FlightMap;
