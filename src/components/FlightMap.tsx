import React, { useEffect, useState, useRef } from 'react';
import { TileLayer, useMap, MapContainer as LeafletMapContainer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { Flight, ConnectionFlight, Airport } from '../types/flightTypes';
import AirportMarker from './AirportMarker';
import FlightPath from './FlightPath';
import L from 'leaflet';
import { Toggle } from '@/components/ui/toggle';
import { Sun, Moon, Globe, MapPin } from 'lucide-react';

// Create a typed wrapper for MapContainer
const MapContainer = LeafletMapContainer as React.ComponentType<L.MapOptions & {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}>;

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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isGlobeView, setIsGlobeView] = useState(false);
  const [mapStyle, setMapStyle] = useState<'google-like' | 'satellite' | 'standard'>('google-like');
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
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
  
  // Handle 3D globe effect for the container
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    // Apply or remove 3D effect based on globe view setting
    if (isGlobeView) {
      container.classList.add('globe-container');
      
      // Add mouse movement effect for 3D rotation
      const handleMouseMove = (e: MouseEvent) => {
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate distance from center (normalized from -1 to 1)
        const rotateX = ((e.clientY - centerY) / (rect.height / 2)) * 15;
        const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * 15;
        
        container.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
      };
    } else {
      container.classList.remove('globe-container');
      container.style.transform = '';
    }
  }, [isGlobeView]);
  
  // Map Control Component
  const MapControls = () => {
    const map = useMap();
    
    useEffect(() => {
      setMapRef(map);
      
      // Apply globe view if enabled
      if (isGlobeView) {
        // Center the map for globe view
        map.setView([0, 0], 1.5);
        
        // Add class to container for globe styling
        const container = map.getContainer();
        container.classList.add('globe-view');
      } else {
        // Remove globe class if it exists
        const container = map.getContainer();
        container.classList.remove('globe-view');
      }
      
      // Apply dark mode if enabled
      const container = map.getContainer();
      if (isDarkMode) {
        container.classList.add('dark-mode');
      } else {
        container.classList.remove('dark-mode');
      }
    }, [map, isGlobeView, isDarkMode]);
    
    return null;
  };
  
  // Fit map bounds to visible airports with extra padding
  const FitBounds = () => {
    const map = useMap();
    
    useEffect(() => {
      if (allAirports.length === 0 || isGlobeView) return;
      
      // When a flight is selected, focus on that flight
      if (selectedFlight) {
        const flight = selectedFlight.flight;
        let bounds: L.LatLngBounds;
        
        if (selectedFlight.type === 'direct') {
          const directFlight = flight as Flight;
          const departure: [number, number] = [directFlight.departureAirport.lat, directFlight.departureAirport.lng];
          const arrival: [number, number] = [directFlight.arrivalAirport.lat, directFlight.arrivalAirport.lng];
          
          bounds = L.latLngBounds([departure, arrival]);
        } else {
          const connections = flight as ConnectionFlight;
          const latLngs: [number, number][] = connections.flights.flatMap(f => [
            [f.departureAirport.lat, f.departureAirport.lng],
            [f.arrivalAirport.lat, f.arrivalAirport.lng]
          ]);
          
          // Create bounds from array of properly typed coordinates
          bounds = L.latLngBounds(latLngs);
        }
        
        // Add extra padding for better view of selected flight
        map.fitBounds(bounds, { padding: [100, 100] });
      } else {
        // When no flight is selected, show all airports
        const coordinates: [number, number][] = allAirports.map(airport => [airport.lat, airport.lng]);
        const bounds = L.latLngBounds(coordinates);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }, [allAirports, map, selectedFlight, isGlobeView]);
    
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
  
  // Handle view mode changes
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  const toggleGlobeView = () => {
    setIsGlobeView(!isGlobeView);
    
    // When switching to globe view, center the map
    if (!isGlobeView && mapRef) {
      mapRef.setView([0, 0], 1.5);
    } else if (mapRef && allAirports.length > 0) {
      // When switching back to flat view, fit bounds
      const coordinates: [number, number][] = allAirports.map(airport => [airport.lat, airport.lng]);
      const bounds = L.latLngBounds(coordinates);
      mapRef.fitBounds(bounds, { padding: [50, 50] });
    }
  };
  
  // Cycle through map styles
  const cycleMapStyle = () => {
    if (mapStyle === 'google-like') setMapStyle('satellite');
    else setMapStyle('google-like');
  };
  
  // Loading component or fallback
  if (loading) {
    return (
      <div className="map-container flex items-center justify-center bg-muted/20 h-full w-full">
        <div className="loader"></div>
      </div>
    );
  }

  // Define default center coordinates as a tuple to satisfy TypeScript
  const defaultCenter: [number, number] = [20, 0];
  
  // Select the appropriate tile layer based on mode and style
  let tileUrl, attribution;
  
  if (mapStyle === 'google-like') {
    // Google Maps-like style with clear country borders like in the reference image
    tileUrl = isDarkMode 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"; // Google Maps style with clear country borders
    
    attribution = isDarkMode 
      ? '&copy; <a href="https://carto.com/">CARTO</a> | <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      : '&copy; Google Maps';
  } else {
    // Satellite imagery
    tileUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    attribution = '&copy; <a href="https://www.arcgis.com/">ArcGIS</a>';
  }

  return (
    <div className="flight-map-wrapper relative h-full w-full min-h-[500px] lg:min-h-[600px]">
      {/* Fixed position controls outside the map container */}
      <div className="absolute top-4 right-4 z-50 flex gap-2 p-2 bg-white/30 dark:bg-black/40 backdrop-blur-sm rounded-lg shadow-lg">
        <Toggle 
          aria-label="Toggle map style" 
          onPressedChange={cycleMapStyle}
          className={`bg-white text-gray-800 dark:bg-gray-800 dark:text-white hover:bg-opacity-90`}
        >
          <MapPin size={18} />
        </Toggle>
        
        <Toggle 
          aria-label="Toggle dark mode" 
          pressed={isDarkMode} 
          onPressedChange={toggleDarkMode}
          className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} hover:bg-opacity-90`}
        >
          {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
        </Toggle>
        
        <Toggle 
          aria-label="Toggle globe view" 
          pressed={isGlobeView} 
          onPressedChange={toggleGlobeView}
          className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} hover:bg-opacity-90`}
        >
          <Globe size={18} />
        </Toggle>
      </div>
      
      {/* Map container with 3D globe effect */}
      <div 
        ref={containerRef} 
        className={`map-container relative ${isDarkMode ? 'dark' : ''} ${isGlobeView ? 'perspective-container' : ''} h-full w-full`}
        style={{ height: '100%', width: '100%' }}
      >
        <MapContainer
          className={`${isDarkMode ? 'dark-map' : ''} ${mapStyle}-map h-full w-full`}
          style={{ height: '100%', width: '100%', borderRadius: isGlobeView ? '50%' : '1rem' }}
          center={defaultCenter}
          zoom={isGlobeView ? 1.5 : 2}
          zoomControl={false}
          scrollWheelZoom={true}
          worldCopyJump={true}
          minZoom={isGlobeView ? 1 : 2}
        >
          {/* Base map layer */}
          <TileLayer
            url={tileUrl}
            attribution={attribution}
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
                isDarkMode={isDarkMode}
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
                  isDarkMode={isDarkMode}
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
                  isDarkMode={isDarkMode}
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
                    isDarkMode={isDarkMode}
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
              isDarkMode={isDarkMode}
            />
          ))}
          
          {/* Control components */}
          <FitBounds />
          <MapControls />
        </MapContainer>
      </div>
      
      {/* Add CSS for enhanced map styles */}
      <style>{`
        /* Make flight paths and markers more visible */
        .flight-path-solid {
          stroke-linecap: round;
          filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.8));
        }
        
        .google-like-map .leaflet-tile-pane {
          filter: saturate(1.1) contrast(1.1);
        }
        
        /* Make country borders more visible */
        .google-like-map:not(.dark-map) .leaflet-tile-pane {
          filter: saturate(1.1) contrast(1.1) brightness(1.05);
        }
        
        /* Origin and destination markers */
        .origin-marker .marker-inner {
          background-color: #E91E63;
        }
        
        .destination-marker .marker-inner {
          background-color: #4CAF50;
        }
        
        .connection-marker .marker-inner {
          background-color: #FFC107;
        }
        
        /* Custom styling for leaflet controls */
        .leaflet-control-zoom {
          border: none !important;
          background: rgba(255, 255, 255, 0.8) !important;
          backdrop-filter: blur(4px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;
        }
        
        .leaflet-control-zoom a {
          color: #333 !important;
          background: transparent !important;
        }
        
        .dark .leaflet-control-zoom {
          background: rgba(30, 30, 30, 0.8) !important;
        }
        
        .dark .leaflet-control-zoom a {
          color: #fff !important;
        }
                
        /* Make sure ocean doesn't overshadow flight paths */
        .flight-path-solid {
          z-index: 450 !important;
        }
        
        .leaflet-overlay-pane {
          z-index: 450 !important;
        }
      `}</style>
    </div>
  );
};

export default FlightMap;
