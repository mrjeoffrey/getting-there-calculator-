
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
  const allFlights = [...directFlights, ...connectingFlights.flatMap(cf => cf.flights)];

  const showContent = !loading && mapReady;

  const airports = new Map();
  const airportDepartureFlights = new Map();
  const airportArrivalFlights = new Map();

  if (showContent) {
    allFlights.forEach(flight => {
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
                price: 250
              }]}
              onFlightSelect={onFlightSelect}
            />
          ))}

          {connectingFlights.map(connection => (
            <div key={`connection-${connection.id}`} style={{ display: 'contents' }}>
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
                      price: connection.price / connection.flights.length
                    }))}
                    onFlightSelect={onFlightSelect}
                    autoAnimate={autoAnimateConnections}
                  />
                );
              })}
            </div>
          ))}

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
