
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
  
  // We'll work with the limited flights already provided by Index.tsx
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
  const airportConnectionFlights = new Map();

  if (showContent) {
    // Process direct flights for airports
    directFlights.forEach(flight => {
      if (flight.departureAirport && !airports.has(flight.departureAirport.code)) {
        airports.set(flight.departureAirport.code, flight.departureAirport);
        airportDepartureFlights.set(flight.departureAirport.code, []);
        airportConnectionFlights.set(flight.departureAirport.code, []);
      }
      if (flight.arrivalAirport && !airports.has(flight.arrivalAirport.code)) {
        airports.set(flight.arrivalAirport.code, flight.arrivalAirport);
        airportArrivalFlights.set(flight.arrivalAirport.code, []);
        airportConnectionFlights.set(flight.arrivalAirport.code, []);
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
    connectingFlights.forEach(connection => {
      // Get the origin airport for this connection
      const originAirport = connection.flights[0].departureAirport;
      
      // Process each leg of the connection for airport markers and flight lists
      connection.flights.forEach((flight, index) => {
        // For departure airport
        if (flight.departureAirport && !airports.has(flight.departureAirport.code)) {
          airports.set(flight.departureAirport.code, flight.departureAirport);
          airportDepartureFlights.set(flight.departureAirport.code, []);
          airportConnectionFlights.set(flight.departureAirport.code, []);
        }
        
        // For arrival airport
        if (flight.arrivalAirport && !airports.has(flight.arrivalAirport.code)) {
          airports.set(flight.arrivalAirport.code, flight.arrivalAirport);
          airportArrivalFlights.set(flight.arrivalAirport.code, []);
          airportConnectionFlights.set(flight.arrivalAirport.code, []);
        }
        
        // Add to departure flights list for this airport
        if (flight.departureAirport) {
          const departures = airportDepartureFlights.get(flight.departureAirport.code) || [];
          // Only add first leg to origin's departure list
          if (index === 0) {
            departures.push(flight);
            airportDepartureFlights.set(flight.departureAirport.code, departures);
          }
        }
        
        // Add to arrival flights list for this airport
        if (flight.arrivalAirport) {
          const arrivals = airportArrivalFlights.get(flight.arrivalAirport.code) || [];
          arrivals.push(flight);
          airportArrivalFlights.set(flight.arrivalAirport.code, arrivals);
        }
        
        // Add connection to connecting airports (not the origin)
        if (index === 0 && flight.arrivalAirport) {
          const connections = airportConnectionFlights.get(flight.arrivalAirport.code) || [];
          connections.push(connection);
          airportConnectionFlights.set(flight.arrivalAirport.code, connections);
        }
      });
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
                onFlightSelect={() => onFlightSelect && onFlightSelect(flight)}
              />
            );
          })}

          {/* Debug info for connecting flights */}
          {connectingFlights.length > 0 ? (
            console.log(`Rendering ${connectingFlights.length} connecting flight paths with multiple segments`)
          ) : (
            console.warn("No connecting flights to render paths for")
          )}
          
          {connectingFlights.map((connection, connectionIndex) => {
            console.log(`Processing connection ${connectionIndex+1}: ${connection.id} with ${connection.flights.length} legs`);
            
            // Render each leg of the connection as a separate path
            return connection.flights.map((flight, flightIndex) => {
              console.log(`  Rendering connection leg ${flightIndex+1}: ${flight.departureAirport.code} to ${flight.arrivalAirport.code}`);
              
              return (
                <FlightPath
                  key={`connection-leg-${connection.id}-${flightIndex}`}
                  departure={flight.departureAirport}
                  arrival={flight.arrivalAirport}
                  type="connecting"
                  isActive={selectedFlightId === connection.id}
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
                  autoAnimate={autoAnimateConnections && flightIndex === 0} // Only animate first leg
                />
              );
            });
          })}

          {Array.from(airports.values()).map(airport => (
            <AirportMarker
              key={`airport-${airport.code}`}
              airport={airport}
              departureFlights={airportDepartureFlights.get(airport.code) || []}
              arrivalFlights={airportArrivalFlights.get(airport.code) || []}
              connectingFlights={airportConnectionFlights.get(airport.code) || []}
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
