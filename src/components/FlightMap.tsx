
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
  autoAnimateConnections?: boolean;
}

const FlightMap: React.FC<FlightMapProps> = ({
  directFlights,
  connectingFlights,
  selectedFlightId,
  loading = false,
  onFlightSelect,
  autoAnimateConnections = false
}) => {
  const [mapReady, setMapReady] = useState(false);
  
  // Collect all flights for airport markers
  const allFlights = [...directFlights];
  const allConnectionLegs: Flight[] = [];
  
  // Extract individual legs from connection flights for markers
  connectingFlights.forEach(cf => {
    cf.flights.forEach(flight => {
      allConnectionLegs.push(flight);
    });
  });

  const showContent = !loading && mapReady;

  const airports = new Map();
  const airportDepartureFlights = new Map();
  const airportArrivalFlights = new Map();

  if (showContent) {
    // Process direct flights for airports
    directFlights.forEach(flight => {
      if (flight.departureAirport && !airports.has(flight.departureAirport.code)) {
        airports.set(flight.departureAirport.code, flight.departureAirport);
        airportDepartureFlights.set(flight.departureAirport.code, []);
      }
      if (flight.arrivalAirport && !airports.has(flight.arrivalAirport.code)) {
        airports.set(flight.arrivalAirport.code, flight.arrivalAirport);
        airportArrivalFlights.set(flight.arrivalAirport.code, []);
      }
      
      if (flight.departureAirport) {
        const departures = airportDepartureFlights.get(flight.departureAirport.code) || [];
        departures.push(flight);
        airportDepartureFlights.set(flight.departureAirport.code, departures);
      }
      
      if (flight.arrivalAirport) {
        const arrivals = airportArrivalFlights.get(flight.arrivalAirport.code) || [];
        arrivals.push(flight);
        airportArrivalFlights.set(flight.arrivalAirport.code, arrivals);
      }
    });
    
    // Process connection flights for airports
    allConnectionLegs.forEach(flight => {
      if (flight.departureAirport && !airports.has(flight.departureAirport.code)) {
        airports.set(flight.departureAirport.code, flight.departureAirport);
        airportDepartureFlights.set(flight.departureAirport.code, []);
      }
      if (flight.arrivalAirport && !airports.has(flight.arrivalAirport.code)) {
        airports.set(flight.arrivalAirport.code, flight.arrivalAirport);
        airportArrivalFlights.set(flight.arrivalAirport.code, []);
      }
      
      if (flight.departureAirport) {
        const departures = airportDepartureFlights.get(flight.departureAirport.code) || [];
        departures.push(flight);
        airportDepartureFlights.set(flight.departureAirport.code, departures);
      }
      
      if (flight.arrivalAirport) {
        const arrivals = airportArrivalFlights.get(flight.arrivalAirport.code) || [];
        arrivals.push(flight);
        airportArrivalFlights.set(flight.arrivalAirport.code, arrivals);
      }
    });
  }

  const ResetMapView = () => {
    const map = useMap();

    useEffect(() => {
      setMapReady(true);
      map.setView([20, 0], 2);

      const handleResize = () => map.invalidateSize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [map]);

    return null;
  };

  // Enhanced debugging for connecting flights
  useEffect(() => {
    if (connectingFlights && connectingFlights.length > 0) {
      console.log(`Found ${connectingFlights.length} connecting flights to display`);
      connectingFlights.forEach((connection, index) => {
        console.log(`Connection ${index+1}: ID=${connection.id}, ${connection.flights.length} legs`);
        connection.flights.forEach((flight, legIndex) => {
          console.log(`  Leg ${legIndex+1}: ${flight.departureAirport?.code || 'UNKNOWN'} to ${flight.arrivalAirport?.code || 'UNKNOWN'} (${flight.id})`);
          if (!flight.departureAirport || !flight.arrivalAirport) {
            console.error(`  Missing airport data for leg ${legIndex+1} of connection ${index+1}`);
          }
        });
      });
    } else {
      console.warn("No connecting flights available to display");
    }
  }, [connectingFlights]);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      worldCopyJump={true}
      className="colorful-flight-map google-like-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <ZoomControl position="bottomright" />
      <ResetMapView />

      {showContent && (
        <>
          {/* Debug info for direct flights */}
          {directFlights.length > 0 ? (
            console.log(`Rendering ${directFlights.length} direct flight paths`)
          ) : (
            console.warn("No direct flights to render")
          )}
          
          {directFlights.map((flight, index) => {
            console.log(`Rendering direct flight ${index+1}: ${flight.id} (${flight.departureAirport?.code} to ${flight.arrivalAirport?.code})`);
            return (
              <FlightPath
                key={`direct-${flight.id}-${index}`}
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
                  price: 250
                }]}
                onFlightSelect={onFlightSelect}
              />
            );
          })}

          {/* Debug info for connecting flights */}
          {connectingFlights.length > 0 ? (
            console.log(`Rendering ${connectingFlights.length} connecting flight paths`)
          ) : (
            console.warn("No connecting flights to render paths for")
          )}
          
          {connectingFlights.map((connection, connectionIndex) => {
            console.log(`Processing connection ${connectionIndex+1}: ${connection.id} with ${connection.flights.length} legs`);
            
            // Create an array to hold each leg's rendered component
            const legs: React.ReactNode[] = [];
            
            // Process each leg of the connection
            connection.flights.forEach((flight, flightIndex) => {
              // If this is not the last flight, we need to connect from this flight's arrival to the next flight's departure
              const isLastFlight = flightIndex === connection.flights.length - 1;
              
              // For each leg, we create a path from the current flight's departure to either:
              // 1. The next flight's departure (if not the last flight)
              // 2. The current flight's arrival (if it's the last flight)
              const segmentDeparture = flight.departureAirport;
              const nextFlight = !isLastFlight ? connection.flights[flightIndex + 1] : null;
              const segmentArrival = nextFlight ? nextFlight.departureAirport : flight.arrivalAirport;
              
              // Skip if missing airport data
              if (!segmentDeparture || !segmentArrival) {
                console.error(`Missing airport data for connection segment in ${connection.id}, leg ${flightIndex+1}`);
                return null;
              }
              
              console.log(`  Rendering connection leg ${flightIndex+1}: ${segmentDeparture.code} to ${segmentArrival.code}`);
              
              // Create the flight path for this leg
              legs.push(
                <FlightPath
                  key={`connection-leg-${connection.id}-${flightIndex}`}
                  departure={segmentDeparture}
                  arrival={segmentArrival}
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
                    price: connection.price / connection.flights.length
                  }))}
                  onFlightSelect={() => onFlightSelect && onFlightSelect(connection)}
                  autoAnimate={autoAnimateConnections} // Use the prop to determine animation
                />
              );
            });
            
            // Return all legs for this connection
            return legs;
          })}

          {Array.from(airports.values()).map(airport => (
            <AirportMarker
              key={`airport-${airport.code}`}
              airport={airport}
              departureFlights={airportDepartureFlights.get(airport.code) || []}
              arrivalFlights={airportArrivalFlights.get(airport.code) || []}
              type={airport.code === (directFlights[0]?.departureAirport?.code || connectingFlights[0]?.flights[0]?.departureAirport?.code) 
                ? 'origin' 
                : airport.code === (directFlights[0]?.arrivalAirport?.code || connectingFlights[0]?.flights[connectingFlights[0]?.flights.length - 1]?.arrivalAirport?.code) 
                  ? 'destination' 
                  : 'connection'}
            />
          ))}
        </>
      )}
    </MapContainer>
  );
};

export default FlightMap;
