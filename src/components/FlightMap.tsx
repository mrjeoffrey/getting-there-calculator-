import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap, ZoomControl, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { Flight, ConnectionFlight, ConnectionLegStatus } from '../types/flightTypes';
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

// Create custom divIcon for city labels
const createCityIcon = (cityName, type) => {
  // Define colors based on type
  const color = type === 'departure' ? '#2e7d32' : 
                type === 'arrival' ? '#c62828' : '#1565c0';
  
  // Create prefix based on type
  const prefix = type === 'departure' ? 'From: ' : 
                type === 'arrival' ? 'To: ' : '';
                
  return L.divIcon({
    className: `city-label-icon ${type}`,
    html: `<div style="
      background: rgba(255, 255, 255, 0.8); 
      padding: 4px 8px; 
      border-radius: 4px; 
      color: ${color}; 
      font-weight: bold;
      border: 2px solid ${color};
      box-shadow: 0 1px 5px rgba(0,0,0,0.2);
      white-space: nowrap;
    ">${prefix}${cityName}</div>`,
    iconSize: [100, 20],
    iconAnchor: [50, 0]
  });
};

const FlightMap: React.FC<FlightMapProps> = ({
  directFlights,
  connectingFlights,
  selectedFlightId,
  loading = false,
  onFlightSelect,
  autoAnimateConnections = true
}) => {
  const [mapReady, setMapReady] = useState(false);
  const flightPathRefs = useRef<Map<string, React.RefObject<any>>>(new Map());
  const [connectionLegsStatus, setConnectionLegsStatus] = useState<ConnectionLegStatus[]>([]);
  
  // Add state for origin and destination
  const [originAirport, setOriginAirport] = useState<any>(null);
  const [destinationAirport, setDestinationAirport] = useState<any>(null);
  const [connectionAirports, setConnectionAirports] = useState<any[]>([]);
  
  useEffect(() => {
    if (connectingFlights.length > 0) {
      const initialLegsStatus: ConnectionLegStatus[] = [];
      
      connectingFlights.forEach(connection => {
        connection.flights.forEach((flight, index) => {
          initialLegsStatus.push({
            connectionId: connection.id,
            legIndex: index,
            isComplete: false,
            nextLegStarted: false
          });
        });
      });
      
      setConnectionLegsStatus(initialLegsStatus);
      console.log(`Initialized ${initialLegsStatus.length} connection leg statuses`);
    }
  }, [connectingFlights]);
  
  // Determine origin, destination, and connection airports
  useEffect(() => {
    if (directFlights.length > 0) {
      setOriginAirport(directFlights[0].departureAirport);
      setDestinationAirport(directFlights[0].arrivalAirport);
    } else if (connectingFlights.length > 0) {
      const connectionPoints: any[] = [];
      
      connectingFlights.forEach(connection => {
        if (connection.flights.length > 0) {
          // Set origin from first flight's departure
          setOriginAirport(connection.flights[0].departureAirport);
          setDestinationAirport(connection.flights[connection.flights.length - 1].arrivalAirport);

          // Add connection points (all arrival airports except the final one)
          connection.flights.slice(0, -1).forEach(flight => {
            if (flight.arrivalAirport) {
              // Check if this airport is already in our list
              const exists = connectionPoints.some(
                airport => airport.code === flight.arrivalAirport.code
              );
              
              if (!exists) {
                connectionPoints.push(flight.arrivalAirport);
              }
            }
          });
        }
      });
      
      setConnectionAirports(connectionPoints);
    }
  }, [directFlights, connectingFlights]);
  
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
  
  const uniqueRoutes = new Map<string, boolean>();
  
  const handleLegComplete = (connectionId: string, legIndex: number) => {
    console.log(`Leg ${legIndex} of connection ${connectionId} completed`);
    
    setConnectionLegsStatus(prevStatus => {
      const newStatus = [...prevStatus];
      
      const completedLegIndex = newStatus.findIndex(
        status => status.connectionId === connectionId && status.legIndex === legIndex
      );
      
      if (completedLegIndex >= 0) {
        newStatus[completedLegIndex] = {
          ...newStatus[completedLegIndex],
          isComplete: true
        };
        
        const nextLegIndex = newStatus.findIndex(
          status => status.connectionId === connectionId && status.legIndex === legIndex + 1
        );
        
        if (nextLegIndex >= 0) {
          newStatus[nextLegIndex] = {
            ...newStatus[nextLegIndex],
            nextLegStarted: true
          };
        }
      }
      
      return newStatus;
    });
  };

  const shouldShowConnectionLegPlane = (connectionId: string, legIndex: number): boolean => {
    if (legIndex === 0) {
      const connection = connectingFlights.find(c => c.id === connectionId);
      if (!connection) return false;
      
      const flight = connection.flights[0];
      const routeKey = `${flight.departureAirport.code}-${flight.arrivalAirport.code}`;
      
      if (uniqueRoutes.has(routeKey)) {
        return false;
      }
      
      uniqueRoutes.set(routeKey, true);
      return true;
    }
    
    const legStatus = connectionLegsStatus.find(
      status => status.connectionId === connectionId && status.legIndex === legIndex
    );
    
    const prevLegStatus = connectionLegsStatus.find(
      status => status.connectionId === connectionId && status.legIndex === legIndex - 1
    );
    
    if (prevLegStatus?.isComplete && legStatus?.nextLegStarted) {
      const connection = connectingFlights.find(c => c.id === connectionId);
      if (!connection) return false;
      
      const flight = connection.flights[legIndex];
      const routeKey = `${flight.departureAirport.code}-${flight.arrivalAirport.code}`;
      
      if (uniqueRoutes.has(routeKey)) {
        return false;
      }
      
      uniqueRoutes.set(routeKey, true);
      return true;
    }
    
    return false;
  };

  if (showContent) {
    uniqueRoutes.clear();
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
    
    connectingFlights.forEach(connection => {
      const originAirport = connection.flights[0].departureAirport;
      
      connection.flights.forEach((flight, index) => {
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
          if (index === 0) {
            departures.push(flight);
            airportDepartureFlights.set(flight.departureAirport.code, departures);
          }
        }
        
        if (flight.arrivalAirport) {
          const arrivals = airportArrivalFlights.get(flight.arrivalAirport.code) || [];
          arrivals.push(flight);
          airportArrivalFlights.set(flight.arrivalAirport.code, arrivals);
        }
        
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
  
      directFlights.forEach(f => {
        if (f.departureAirport) bounds.extend([f.departureAirport.lat, f.departureAirport.lng]);
        if (f.arrivalAirport) bounds.extend([f.arrivalAirport.lat, f.arrivalAirport.lng]);
      });
  
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

  const shouldShowPlane = (departure: string, arrival: string): boolean => {
    const routeKey = `${departure}-${arrival}`;
    
    if (uniqueRoutes.has(routeKey)) {
      return false;
    }
    
    uniqueRoutes.set(routeKey, true);
    return true;
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
  attribution='&copy; Esri &mdash; Sources: Esri, HERE, Garmin, USGS, NGA, EPA, and others'
  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
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
          {/* Flight paths */}
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

          {connectingFlights.map((connection) => (
            connection.flights.map((flight, legIndex) => {
              const showPlane = shouldShowConnectionLegPlane(connection.id, legIndex);
              
              const legDelay = legIndex * 500;
              
              const shouldStartAnimating = legIndex === 0 || 
                connectionLegsStatus.find(
                  status => status.connectionId === connection.id && 
                           status.legIndex === legIndex &&
                           status.nextLegStarted
                ) !== undefined;
              
              return (
                <FlightPath
                  key={`connection-leg-${connection.id}-${legIndex}`}
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
                  autoAnimate={shouldStartAnimating}
                  legIndex={legIndex}
                  totalLegs={connection.flights.length}
                  legDelay={legDelay}
                  connectionId={connection.id}
                  onLegComplete={() => handleLegComplete(connection.id, legIndex)}
                />
              );
            })
          ))}

          {/* City Labels using Markers with custom divIcons */}
          {originAirport && (
            <Marker 
              position={[originAirport.lat, originAirport.lng]} 
              icon={createCityIcon(originAirport.city || originAirport.name, 'departure')}
              zIndexOffset={1000}
            />
          )}
          
          {destinationAirport && (
            <Marker 
              position={[destinationAirport.lat, destinationAirport.lng]} 
              icon={createCityIcon(destinationAirport.city || destinationAirport.name, 'arrival')}
              zIndexOffset={1000}
            />
          )}
          
          {/* Connection city labels */}
          {connectionAirports.map((airport, index) => (
            <Marker 
              key={`connection-label-${airport.code}-${index}`}
              position={[airport.lat, airport.lng]} 
              icon={createCityIcon(airport.city || airport.name, 'connection')}
              zIndexOffset={900}
            />
          ))}

          {/* Airport Markers */}
          {Array.from(airports.values()).map(airport => (
            <AirportMarker
              key={`airport-${airport.code}`}
              airport={airport}
              departureFlights={airportDepartureFlights.get(airport.code) || []}
              arrivalFlights={airportArrivalFlights.get(airport.code) || []}
              connectingFlights={airportConnectionFlights.get(airport.code) || []}
              type={airport.code === (originAirport?.code) 
                ? 'origin' 
                : airport.code === (destinationAirport?.code)
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