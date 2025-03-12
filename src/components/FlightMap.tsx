import React, { useEffect, useState, useRef } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { Flight, ConnectionFlight, Airport } from '../types/flightTypes';
import AirportMarker from './AirportMarker';
import FlightPath from './FlightPath';
import L from 'leaflet';
import "leaflet/dist/leaflet.css"; 
import { MapContainer } from 'react-leaflet';
import { Sun, Moon, Globe, MapPin } from 'lucide-react';

// New imports for enhanced features
import { Toggle } from '@/components/ui/toggle';

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
  const [mapStyle, setMapStyle] = useState<'colorful' | 'satellite' | 'standard'>('colorful');
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
  
  // Fit map bounds to visible airports
  const FitBounds = () => {
    const map = useMap();
    
    useEffect(() => {
      if (allAirports.length === 0 || isGlobeView) return;
      
      const bounds = L.latLngBounds(allAirports.map(airport => [airport.lat, airport.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }, [allAirports, map, isGlobeView]);
    
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
      const bounds = L.latLngBounds(allAirports.map(airport => [airport.lat, airport.lng]));
      mapRef.fitBounds(bounds, { padding: [50, 50] });
    }
  };
  
  // Cycle through map styles
  const cycleMapStyle = () => {
    if (mapStyle === 'colorful') setMapStyle('satellite');
    // else if (mapStyle === 'satellite') setMapStyle('standard');
    else setMapStyle('colorful');
  };
  
  // Loading component or fallback
  if (loading) {
    return (
      <div className="map-container flex items-center justify-center bg-muted/20">
        <div className="loader"></div>
      </div>
    );
  }

  // Define center coordinates as a tuple to satisfy TypeScript
  const defaultCenter: [number, number] = [20, 0];
  
  // Select the appropriate tile layer based on mode and style
  let tileLayer, labelsLayer;
  
  if (mapStyle === 'colorful') {
    // Colorful map style - more vibrant like Google Maps
    tileLayer = isDarkMode 
      ? "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
      : "https://tile.openstreetmap.org/{z}/{x}/{y}.png"; // More colorful standard map
    
    labelsLayer = isDarkMode
      ? "https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_only_labels/{z}/{x}/{y}.png"
      : null; // OSM already has labels
  } else if (mapStyle === 'satellite') {
    // Satellite imagery
    tileLayer = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    labelsLayer = "https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png";
  } else {
    // Standard/clean map style
    tileLayer = isDarkMode
      ? "https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}.png"
      : "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png";
    
    labelsLayer = isDarkMode
      ? "https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_only_labels/{z}/{x}/{y}.png"
      : "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png";
  }

  return (
    <div className="flight-map-wrapper relative">
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
        className={`map-container relative ${isDarkMode ? 'dark' : ''} ${isGlobeView ? 'perspective-container' : ''}`}
      >
        <MapContainer
          className={`${isDarkMode ? 'dark-map' : ''} ${mapStyle}-map`}
          style={{ height: '100%', width: '100%', borderRadius: isGlobeView ? '50%' : '1rem' }}
          center={defaultCenter}
          zoom={isGlobeView ? 1.5 : 2}
          zoomControl={false}
          scrollWheelZoom={true}
          worldCopyJump={!isGlobeView}
          minZoom={isGlobeView ? 1 : 2}
        >
          {/* Base map layer without labels */}
          <TileLayer
            url={tileLayer}
            attribution={
              mapStyle === 'satellite' 
                ? '&copy; <a href="https://www.arcgis.com/">ArcGIS</a>' 
                : mapStyle === 'colorful' && !isDarkMode 
                  ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  : '&copy; <a href="https://carto.com/">CARTO</a>'
            }
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
          
          {/* Labels layer on top with enhanced contrast - only if we have a separate labels layer */}
          {labelsLayer && (
            <TileLayer
              url={labelsLayer}
              zIndex={10}
              opacity={isDarkMode ? 1.2 : 1}
            />
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
      
      {/* Add CSS for enhanced 3D globe effect and map styles */}
      <style>{`
        /* Setup perspective for 3D effects */
        .perspective-container {
          perspective: 1200px;
          transition: transform 0.5s ease-out;
          transform-style: preserve-3d;
        }
        
        /* Globe container styles */
        .globe-container {
          border-radius: 50% !important;
          overflow: hidden;
          box-shadow: 
            0 0 30px rgba(0, 0, 0, 0.3),
            inset 0 0 80px rgba(0, 0, 0, 0.6);
          transform-style: preserve-3d;
          transform: rotateX(0deg) rotateY(0deg);
          transition: transform 0.2s ease-out;
          position: relative;
        }
        
        /* Create light reflection effect on globe */
        .globe-container::before {
          content: '';
          position: absolute;
          top: -10%;
          left: -10%;
          width: 120%;
          height: 120%;
          background: radial-gradient(
            circle at 30% 30%,
            rgba(255, 255, 255, 0.3) 0%,
            rgba(255, 255, 255, 0) 60%
          );
          z-index: 100;
          pointer-events: none;
          border-radius: 50%;
        }
        
        /* Dark mode globe has blue glow */
        .dark .globe-container {
          box-shadow: 
            0 0 40px rgba(0, 120, 255, 0.4),
            inset 0 0 80px rgba(0, 0, 30, 0.8);
        }
        
        .dark .globe-container::before {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(120, 180, 255, 0.2) 0%,
            rgba(0, 30, 60, 0) 60%
          );
        }
        
        /* Map styles */
        .dark-map {
          filter: brightness(0.9);
        }
        
        /* Enhanced colorful map styles */
        .colorful-map:not(.dark-map) {
          filter: saturate(1.2) brightness(1.05);
        }
        
        /* Satellite map adjustments */
        .satellite-map {
          filter: contrast(1.1) brightness(1.05);
        }
        
        .dark-mode .satellite-map {
          filter: contrast(1.2) brightness(0.9);
        }
        
        /* Enhance label visibility in dark mode */
        .dark-mode .leaflet-tile-loaded {
          font-weight: 500 !important;
        }
        
        /* Water and land enhancer for colorful maps */
        .colorful-map .leaflet-tile-pane {
          filter: saturate(1.3);
        }
        
        /* Improved styling for map text in dark mode */
        .dark-mode .leaflet-control,
        .dark-mode .leaflet-control a,
        .dark-mode .leaflet-container {
          color: white !important;
          text-shadow: 0 0 3px rgba(0, 0, 0, 1), 0 0 5px rgba(0, 0, 0, 0.8);
          font-weight: 500;
        }
        
        /* Make country labels more visible with a text glow */
        .dark-mode .leaflet-tile-pane {
          filter: contrast(1.1) brightness(1.1);
        }
        
        /* Brighten text labels specifically */
        .dark-mode .leaflet-overlay-pane text,
        .dark-mode .leaflet-marker-pane text {
          fill: white !important;
          stroke: rgba(0, 0, 0, 0.5);
          stroke-width: 0.5px;
          paint-order: stroke;
          text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
        }
        
        .dark-mode .leaflet-control-attribution {
          background-color: rgba(0, 0, 0, 0.6) !important;
          color: white !important;
          font-weight: 500;
          padding: 3px 6px;
          border-radius: 4px 0 0 0;
        }
        
        .dark-mode .leaflet-control-attribution a {
          color: #90caf9 !important;
          font-weight: 500;
        }
        
        .dark .leaflet-tile {
          filter: brightness(0.8) contrast(1.2);
        }
        
        /* Add global style for the wrapper to control dimensions */
        .flight-map-wrapper {
          width: 100%;
          height: 100%;
          min-height: 400px;
        }
        
        .map-container {
          width: 100%;
          height: 100%;
          min-height: 400px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        /* Ensure map container is fully rounded in globe mode */
        .globe-view {
          border-radius: 50% !important;
        }
        
        @media (max-width: 768px) {
          .globe-container {
            transform: scale(0.8) rotateX(0deg) rotateY(0deg) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default FlightMap;