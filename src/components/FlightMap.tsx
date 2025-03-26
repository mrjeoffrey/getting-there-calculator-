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
  
  // Track unique routes to avoid duplicate planes
  const uniqueRoutes = new Map<string, boolean>();

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

  // Improved shouldShowPlane function to properly handle connection legs
  const shouldShowPlane = (departure: string, arrival: string, isFirstInGroup: boolean = true, connectionLegIndex: number = 0) => {
    // For direct flights or the first leg of connections
    if (connectionLegIndex === 0) {
      const routeKey = `${departure}-${arrival}`;
      
      if (uniqueRoutes.has(routeKey)) {
        return false;
      }
      
      if (isFirstInGroup) {
        uniqueRoutes.set(routeKey, true);
        return true;
      }
    }
    
    return false;
  };

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
          {directFlights.map((flight, index) => {
            const showPlane = shouldShowPlane(
              flight.departureAirport?.code || 'unknown', 
              flight.arrivalAirport?.code || 'unknown'
            );
            
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
                showPlane={showPlane}
              />
            );
          })}

          {/* Improved rendering of connecting flights with proper leg tracking */}
          {connectingFlights.map((connection, connectionIndex) => {
            // For connecting flights, we create an object to track connections
            const connectionRoutes = new Map<string, boolean>();
            
            return connection.flights.map((flight, flightIndex) => {
              // For connection legs, we only show plane on first leg by default
              const routeKey = `${flight.departureAirport?.code || 'unknown'}-${flight.arrivalAirport?.code || 'unknown'}`;
              let showPlane = false;
              
              // If this is first leg OR previous leg has already completed, show the plane
              if (flightIndex === 0 || connectionRoutes.get(`leg-${flightIndex-1}-complete`)) {
                if (!uniqueRoutes.has(routeKey)) {
                  showPlane = true;
                  uniqueRoutes.set(routeKey, true);
                }
              }
              
              // Delay each leg to start only after previous completes
              const legDelay = flightIndex * 3000; // 3 seconds delay between leg starts
              
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
                  showPlane={showPlane}
                  autoAnimate={true}
                  legIndex={flightIndex}
                  totalLegs={connection.flights.length}
                  legDelay={legDelay}
                  connectionId={connection.id}
                  onLegComplete={() => {
                    // Mark this leg as complete so next leg can start
                    connectionRoutes.set(`leg-${flightIndex}-complete`, true);
                  }}
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
