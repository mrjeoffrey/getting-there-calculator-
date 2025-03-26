
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { Flight, ConnectionFlight } from '../types/flightTypes';
import AirportMarker from './AirportMarker';
import FlightPath from './FlightPath';
import { GeoJSON } from 'react-leaflet';
import countriesGeoJson from "./map/custom.geo.json"
import L from 'leaflet';

interface FlightMapProps {
  directFlights: Flight[];
  connectingFlights: ConnectionFlight[];
  selectedFlightId?: string | null;
  loading?: boolean;
  onFlightSelect?: (flight: any) => void;
  autoAnimateConnections?: boolean;
}

const getRandomColor = () => {
  const colors = [
    '#c62828', // Rich Red
    '#2e7d32', // Deep Green
    '#1565c0', // Strong Blue
    '#6a1b9a', // Royal Purple
    '#37474f', // Slate Blue-Gray
    '#ff6f00', // Burnt Orange
    '#3e2723', // Dark Cocoa
    '#283593', // Indigo Blue
    '#004d40', // Teal Dark
    '#212121'  // Almost Black
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const countryStyle = (feature: any) => ({
  fillColor: getRandomColor(),
  weight: 1,
  opacity: 1,
  color: 'black',
  fillOpacity: 0.2
});

const FlightMap: React.FC<FlightMapProps> = ({
  directFlights,
  connectingFlights,
  selectedFlightId,
  loading = false,
  onFlightSelect,
  autoAnimateConnections = false
}) => {
  const [mapReady, setMapReady] = useState(false);
  const flightPathRefs = useRef<Map<string, React.RefObject<any>>>(new Map());
  
  const allFlights = [...directFlights];
  const allConnectionLegs: Flight[] = [];
  
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

  useEffect(() => {
    // Event listener for showing all planes for an airport
    const handleShowAirportPlanes = (event: any) => {
      const { airportCode } = event.detail;
      console.log(`Handling showAirportPlanes event for airport ${airportCode}`);
      
      // Call method to show all planes for related flight paths
      // This will be implemented in a future update to directly communicate with FlightPath components
    };
    
    document.addEventListener('showAirportPlanes', handleShowAirportPlanes);
    
    return () => {
      document.removeEventListener('showAirportPlanes', handleShowAirportPlanes);
    };
  }, []);

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

  const ResetMapView: React.FC<{ 
    directFlights: Flight[], 
    connectingFlights: ConnectionFlight[], 
    onMapReady: () => void 
  }> = ({ directFlights, connectingFlights, onMapReady }) => {
    const map = useMap();
  
    useEffect(() => {
      const bounds = L.latLngBounds([]);
  
      // Add direct flights' airports
      directFlights.forEach(f => {
        if (f.departureAirport) bounds.extend([f.departureAirport.lat, f.departureAirport.lng]);
        if (f.arrivalAirport) bounds.extend([f.arrivalAirport.lat, f.arrivalAirport.lng]);
      });
  
      // Add connecting flights' legs
      connectingFlights.forEach(c => {
        c.flights.forEach(f => {
          if (f.departureAirport) bounds.extend([f.departureAirport.lat, f.departureAirport.lng]);
          if (f.arrivalAirport) bounds.extend([f.arrivalAirport.lat, f.arrivalAirport.lng]);
        });
      });
  
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60] });
      } else {
        map.setView([20, 0], 2); // fallback
      }
  
      onMapReady();
  
      const handleResize = () => map.invalidateSize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [map, directFlights, connectingFlights, onMapReady]);
  
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
        attribution='&copy; OpenStreetMap contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />

      <GeoJSON data={countriesGeoJson as any} style={countryStyle} />

      <ZoomControl position="bottomright" />
      <ResetMapView 
        directFlights={directFlights} 
        connectingFlights={connectingFlights}
        onMapReady={() => setMapReady(true)}
      />

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
