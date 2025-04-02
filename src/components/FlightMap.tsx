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
import { Bold } from 'lucide-react';
import MapInstructionCard from './MapInstructionCard';

interface FlightMapProps {
  directFlights: Flight[];
  connectingFlights: ConnectionFlight[];
  selectedFlightId?: string | null;
  loading?: boolean;
  onFlightSelect?: (flight: any) => void;
  autoAnimateConnections?: boolean;
}

// const getRandomColor = () => {
//   const colors = [
// '#ef5350', // Lighter Rich Red
// '#66bb6a', // Lighter Deep Green
// '#42a5f5', // Lighter Strong Blue
// '#ab47bc', // Lighter Royal Purple
// '#78909c', // Lighter Slate Blue-Gray
// '#ffa726', // Lighter Burnt Orange
// '#8d6e63', // Lighter Dark Cocoa
// '#5c6bc0', // Lighter Indigo Blue
// '#26a69a', // Lighter Teal Dark
// '#9e9e9e'  // Lighter Almost Black (mid gray)
//   ];
//   return colors[Math.floor(Math.random() * colors.length)];
// };

// const countryStyle = (feature: any) => ({
//   // fillColor: getRandomColor(),
//   weight: 1,
//   opacity: 1,
//   color: 'black',
//   fillOpacity: 0.2
// });

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
    <>
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

      {/* <GeoJSON data={countriesGeoJson as any}  /> */}

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

          {/* City Labels using Markers with custom divIcons */}
          {originAirport && (
            <Marker 
              position={[originAirport.lat, originAirport.lng]} 
              icon={createCityIcon(originAirport.city || originAirport.name, 'departure')}
              zIndexOffset={1000}
            >
            </Marker>
            
          )}
          
          {destinationAirport && (
            <Marker 
              position={[destinationAirport.lat, destinationAirport.lng]} 
              icon={createCityIcon(destinationAirport.city || destinationAirport.name, 'arrival')}
              zIndexOffset={1000}
            />
          )}
          

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
        {/* <svg 
          width="85" 
          height="20" 
          viewBox="0 0 151 29" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17.5196 13.48C19.9729 14.8933 21.1996 17.0267 21.1996 19.88C21.1996 22.2533 20.3596 24.2 18.6796 25.72C16.9996 27.24 14.9329 28 12.4796 28H0.599609V0H11.6396C14.0396 0 16.0529 0.746667 17.6796 2.24C19.3329 3.70667 20.1596 5.58667 20.1596 7.88C20.1596 10.2 19.2796 12.0667 17.5196 13.48ZM11.6396 5.16H6.11961V11.32H11.6396C12.4929 11.32 13.1996 11.0267 13.7596 10.44C14.3463 9.85333 14.6396 9.12 14.6396 8.24C14.6396 7.36 14.3596 6.62667 13.7996 6.04C13.2396 5.45333 12.5196 5.16 11.6396 5.16ZM12.4796 22.84C13.4129 22.84 14.1863 22.5333 14.7996 21.92C15.4129 21.28 15.7196 20.48 15.7196 19.52C15.7196 18.5867 15.4129 17.8133 14.7996 17.2C14.1863 16.56 13.4129 16.24 12.4796 16.24H6.11961V22.84H12.4796Z"
            fill="#363A3F"
          />
          <path
            d="M41.9309 25.52C39.8775 27.5467 37.3709 28.56 34.4109 28.56C31.4509 28.56 28.9442 27.5467 26.8909 25.52C24.8642 23.4667 23.8509 20.96 23.8509 18C23.8509 15.04 24.8642 12.5467 26.8909 10.52C28.9442 8.46667 31.4509 7.44 34.4109 7.44C37.3709 7.44 39.8775 8.46667 41.9309 10.52C43.9842 12.5467 45.0109 15.04 45.0109 18C45.0109 20.96 43.9842 23.4667 41.9309 25.52ZM30.5309 21.96C31.5709 23 32.8642 23.52 34.4109 23.52C35.9575 23.52 37.2509 23 38.2909 21.96C39.3309 20.92 39.8509 19.6 39.8509 18C39.8509 16.4 39.3309 15.08 38.2909 14.04C37.2509 13 35.9575 12.48 34.4109 12.48C32.8642 12.48 31.5709 13 30.5309 14.04C29.5175 15.08 29.0109 16.4 29.0109 18C29.0109 19.6 29.5175 20.92 30.5309 21.96Z"
            fill="#363A3F"
          />
          <path
            d="M59.7609 7.44C61.9475 7.44 63.7475 8.17334 65.1609 9.64C66.6009 11.1067 67.3209 13.1333 67.3209 15.72V28H62.1609V16.36C62.1609 15.0267 61.8009 14.0133 61.0809 13.32C60.3609 12.6 59.4009 12.24 58.2009 12.24C56.8675 12.24 55.8009 12.6533 55.0009 13.48C54.2009 14.3067 53.8009 15.5467 53.8009 17.2V28H48.6409V0H53.8009V10.24C55.0542 8.37333 57.0409 7.44 59.7609 7.44Z"
            fill="#363A3F"
          />
          <path
            d="M86.9268 8H92.0868V28H86.9268V25.64C85.3801 27.5867 83.2068 28.56 80.4068 28.56C77.7401 28.56 75.4468 27.5467 73.5268 25.52C71.6335 23.4667 70.6868 20.96 70.6868 18C70.6868 15.04 71.6335 12.5467 73.5268 10.52C75.4468 8.46667 77.7401 7.44 80.4068 7.44C83.2068 7.44 85.3801 8.41334 86.9268 10.36V8ZM77.4068 22.08C78.4468 23.12 79.7668 23.64 81.3668 23.64C82.9668 23.64 84.2868 23.12 85.3268 22.08C86.3935 21.0133 86.9268 19.6533 86.9268 18C86.9268 16.3467 86.3935 15 85.3268 13.96C84.2868 12.8933 82.9668 12.36 81.3668 12.36C79.7668 12.36 78.4468 12.8933 77.4068 13.96C76.3668 15 75.8468 16.3467 75.8468 18C75.8468 19.6533 76.3668 21.0133 77.4068 22.08Z"
            fill="#363A3F"
          />
          <path
            d="M118.886 7.44C121.179 7.44 123.006 8.18667 124.366 9.68C125.753 11.1733 126.446 13.1733 126.446 15.68V28H121.286V16.04C121.286 14.84 120.993 13.9067 120.406 13.24C119.819 12.5733 118.993 12.24 117.926 12.24C116.753 12.24 115.833 12.6267 115.166 13.4C114.526 14.1733 114.206 15.2933 114.206 16.76V28H109.046V16.04C109.046 14.84 108.753 13.9067 108.166 13.24C107.579 12.5733 106.753 12.24 105.686 12.24C104.539 12.24 103.619 12.6267 102.926 13.4C102.259 14.1733 101.926 15.2933 101.926 16.76V28H96.7659V8H101.926V10.12C103.126 8.33333 104.979 7.44 107.486 7.44C109.939 7.44 111.753 8.4 112.926 10.32C114.259 8.4 116.246 7.44 118.886 7.44Z"
            fill="#363A3F"
          />
          <path
            d="M147.868 25.52C145.815 27.5467 143.308
