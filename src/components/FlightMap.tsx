import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap, ZoomControl, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { Flight, ConnectionFlight, ConnectionLegStatus } from '../types/flightTypes';
import AirportMarker from './AirportMarker';
import FlightPath from './FlightPath';
import { GeoJSON } from 'react-leaflet';
import countriesGeoJson from "./map/custom.geo.json";
import L from 'leaflet';
import { Bold } from 'lucide-react';

const createCityIcon = (cityName, type) => {
  const color = type === 'departure' ? '#2e7d32' : 
                type === 'arrival' ? '#c62828' : '#1565c0';
  
  const prefix = type === 'departure' ? 'From: ' : 
                type === 'arrival' ? 'To: ' : '';
                
  return L.divIcon({
      className: `city-label-icon ${type}`,
      html: `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
          font-family: sans-serif;
        ">
          <div style="
            width: 10px;
            height: 10px;
            background-color: black;
            border-radius: 50%;
            margin-bottom: 4px;
          "></div>
          <div style="
            font-weight: bold;
            font-size: 13px;
            color: black;
            margin-top: 8px;
            pointer-events: none;
            user-select: none;
          ">
            ${cityName}
          </div>
        </div>
      `,
      iconSize: [100, 30],
      iconAnchor: [50, 10] // anchors the icon dot, not the text
    });
};

interface FlightMapProps {
  directFlights: Flight[];
  connectingFlights: ConnectionFlight[];
  selectedFlightId?: string | null;
  loading?: boolean;
  onFlightSelect?: (flight: any) => void;
  autoAnimateConnections?: boolean;
  showInstructions?: boolean;  // We'll keep the prop but not use it
  activePopup?: string | null;
  onPopupOpen?: (airportCode: string | null) => void;
}

const FlightMap: React.FC<FlightMapProps> = ({
  directFlights,
  connectingFlights,
  selectedFlightId,
  loading = false,
  onFlightSelect,
  autoAnimateConnections = true,
  showInstructions = false,  // We'll keep the prop but not use it
  activePopup,
  onPopupOpen
}) => {
  const [mapReady, setMapReady] = useState(false);
  const flightPathRefs = useRef<Map<string, React.RefObject<any>>>(new Map());
  const [connectionLegsStatus, setConnectionLegsStatus] = useState<ConnectionLegStatus[]>([]);
  
  const [originAirport, setOriginAirport] = useState<any>(null);
  const [destinationAirport, setDestinationAirport] = useState<any>(null);
  const [connectionAirports, setConnectionAirports] = useState<any[]>([]);
  
  const handlePopupOpen = (airportCode: string | null) => {
    console.log(`Setting active popup to ${airportCode}`);
    if (onPopupOpen) {
      onPopupOpen(airportCode);
    }
  };

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
  
  useEffect(() => {
    if (directFlights.length > 0) {
      setOriginAirport(directFlights[0].departureAirport);
      setDestinationAirport(directFlights[0].arrivalAirport);
    } else if (connectingFlights.length > 0) {
      const connectionPoints: any[] = [];
      
      connectingFlights.forEach(connection => {
        if (connection.flights.length > 0) {
          setOriginAirport(connection.flights[0].departureAirport);
          setDestinationAirport(connection.flights[connection.flights.length - 1].arrivalAirport);

          for (let i = 0; i < connection.flights.length - 1; i++) {
            const flight = connection.flights[i];
            if (flight.arrivalAirport) {
              const exists = connectionPoints.some(
                airport => airport.code === flight.arrivalAirport.code
              );
              
              if (!exists) {
                connectionPoints.push(flight.arrivalAirport);
              }
            }
          }
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
      if (!connection || !connection.flights || !connection.flights[0]) return false;
      
      const flight = connection.flights[0];
      if (!flight.departureAirport || !flight.arrivalAirport) return false;
      
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
      if (!connection || !connection.flights || !connection.flights[legIndex]) return false;
      
      const flight = connection.flights[legIndex];
      if (!flight.departureAirport || !flight.arrivalAirport) return false;
      
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
          departures.push(flight);
          airportDepartureFlights.set(flight.departureAirport.code, departures);
        }
        
        if (flight.arrivalAirport) {
          const arrivals = airportArrivalFlights.get(flight.arrivalAirport.code) || [];
          arrivals.push(flight);
          airportArrivalFlights.set(flight.arrivalAirport.code, arrivals);
        }
        
        if (index < connection.flights.length - 1 && flight.arrivalAirport) {
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
    <>
     <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ backgroundColor: '#abe3ff', height: '100%', width: '100%' }}
      zoomControl={false}
      worldCopyJump={true}
      className="colorful-flight-map google-like-map"
    >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
          noWrap={true}
          bounds={[[-90, -180], [90, 180]]}
      />

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
                  autoAnimate={true}
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

            {/* Connection points labels */}
            {connectionAirports.map(airport => (
              <Marker 
                key={`connection-point-${airport.code}`}
                position={[airport.lat, airport.lng]} 
                icon={createCityIcon(airport.city || airport.name, 'connection')}
                zIndexOffset={800}
              />
            ))}

            {/* Origin & Destination city labels */}
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

            {/* Airport Markers */}
            {Array.from(airports.values()).map(airport => {
  const airportCode = airport.code;

  const type = airportCode === originAirport?.code
    ? 'origin'
    : airportCode === destinationAirport?.code
      ? 'destination'
      : 'connection';

  return (
    <AirportMarker
      key={`airport-${airport.code}`}
      airport={airport}
      departureFlights={airportDepartureFlights.get(airport.code) || []}
      arrivalFlights={airportArrivalFlights.get(airport.code) || []}
      connectingFlights={
        type === 'origin' || type === 'destination'
          ? connectingFlights // ✅ pass all for origin/destination
          : airportConnectionFlights.get(airport.code) || [] // only partial for connections
      }
      type={type}
      onPopupOpen={handlePopupOpen}
      activePopup={activePopup}
      destinationAirport={
        airport.code === originAirport?.code ? destinationAirport
        : airport.code === destinationAirport?.code ? originAirport
        : null
      }
    />
  );
})}

          </>
        )}
        
        <div 
          style={{
            position: 'absolute',
            bottom: 12,
            right: 16,
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '6px 12px',
            borderRadius: '9999px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <span
            style={{
              fontSize: '12.5px',
              color: '#1a1a1a',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            Powered by
          </span>
          
          <a
            href="https://bohamo.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '16px',
              fontSize: '12.5px',
              fontWeight: 'bold',
            }}
          >
           Bohamo.com
          </a>
        </div>
      </MapContainer>
    </>
  );
};

export default FlightMap;
