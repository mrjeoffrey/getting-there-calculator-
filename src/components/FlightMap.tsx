import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap, ZoomControl } from 'react-leaflet';
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

  useEffect(() => {
    const handleShowAirportPlanes = (event: any) => {
      const { airportCode } = event.detail;
      console.log(`Handling showAirportPlanes event for airport ${airportCode}`);
      
      document.addEventListener('showAirportPlanes', handleShowAirportPlanes);
      
      return () => {
        document.removeEventListener('showAirportPlanes', handleShowAirportPlanes);
      };
    };
  }, []);

  if (showContent) {
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
  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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
