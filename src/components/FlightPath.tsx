
import React, { useEffect, useState, useRef } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Airport } from '../types/flightTypes';
import { calculateArcPoints, getBearing } from '../utils/flightUtils';
import { Plane } from 'lucide-react';
import ReactDOMServer from 'react-dom/server';

interface FlightPathProps {
  departure: Airport;
  arrival: Airport;
  animated?: boolean;
  type?: 'direct' | 'connecting';
  isActive?: boolean;
  isDarkMode?: boolean;
  duration?: string;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  airline?: string;
  price?: number;
}

const FlightPath: React.FC<FlightPathProps> = ({ 
  departure, 
  arrival, 
  animated = true,
  type = 'direct',
  isActive = false,
  isDarkMode = false,
  duration = '',
  flightNumber = '',
  departureTime = '',
  arrivalTime = '',
  airline = '',
  price = 0
}) => {
  const [arcPoints, setArcPoints] = useState<[number, number][]>([]);
  const [planePosition, setPlanePosition] = useState<[number, number] | null>(null);
  const [planeRotation, setPlaneRotation] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsPosition, setDetailsPosition] = useState<[number, number]>([0, 0]);
  const animationRef = useRef<number | null>(null);
  const planeMarkerRef = useRef<L.Marker | null>(null);
  const map = useMap();
  
  // Parse duration to get flight minutes for speed calculation
  const getFlightMinutes = () => {
    if (!duration) return 180; // Default duration
    
    const durationParts = duration.match(/(\d+)h\s*(\d+)?m?/);
    if (durationParts) {
      const hours = parseInt(durationParts[1] || '0');
      const minutes = parseInt(durationParts[2] || '0');
      return hours * 60 + minutes;
    }
    return 180; // Default if parsing fails
  };
  
  // Calculate arc points for the flight path
  useEffect(() => {
    // Use less arc height to match reference image flat arc
    const arcHeight = type === 'direct' ? 0.2 : 0.15;
    
    const points = calculateArcPoints(
      departure.lat, 
      departure.lng, 
      arrival.lat, 
      arrival.lng,
      arcHeight
    );
    setArcPoints(points);
    
    // Initially set plane at departure
    setPlanePosition([departure.lat, departure.lng]);
    
    // Calculate initial bearing
    const bearing = getBearing(departure.lat, departure.lng, arrival.lat, arrival.lng);
    setPlaneRotation(bearing);
    
    // Calculate adaptive speed based on flight duration
    const flightMinutes = getFlightMinutes();
    const baseSpeed = 40; // milliseconds
    const maxDuration = 600; // 10 hours as max duration
    const minDuration = 60; // 1 hour as min duration
    const durationFactor = (flightMinutes - minDuration) / (maxDuration - minDuration);
    const speedFactor = Math.max(0.5, Math.min(2, 1 + durationFactor));
    const speed = Math.max(20, Math.min(80, baseSpeed * speedFactor));
    
    // Set a unique starting point along the path based on the flight ID
    // This creates staggered starts for each flight
    let step = Math.floor(Math.random() * (points.length / 3)); // Random start within first third
    const totalSteps = points.length - 1;
    
    const animate = () => {
      if (step < totalSteps) {
        setPlanePosition(points[step]);
        
        // Calculate bearing for rotation
        if (step < totalSteps - 1) {
          const currPoint = points[step];
          const nextPoint = points[step + 1];
          const bearing = getBearing(currPoint[0], currPoint[1], nextPoint[0], nextPoint[1]);
          setPlaneRotation(bearing);
        }
        
        step++;
        animationRef.current = requestAnimationFrame(() => {
          setTimeout(animate, speed); // Use adaptive speed based on flight duration
        });
      } else {
        // Loop animation continuously
        step = 0;
        animationRef.current = requestAnimationFrame(() => {
          setTimeout(animate, 800); // Brief pause before restart
        });
      }
    };
    
    // Start animation
    animate();
    
    // Clean up on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (planeMarkerRef.current) {
        planeMarkerRef.current.remove();
      }
    };
  }, [departure, arrival, animated, type, duration]);
  
  // Create a plane icon component that will be animated along the path
  useEffect(() => {
    if (!planePosition) return;
    
    // Remove previous marker if exists
    if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
    }
    
    // Determine color based on flight type (matching the lines)
    const color = type === 'direct' ? '#4CAF50' : '#FFC107';
    
    // Create a plane SVG with proper rotation and tilt
    const iconHtml = ReactDOMServer.renderToString(
      <div 
        className="plane-icon"
        style={{ 
          transform: `rotate(${planeRotation}deg)`,
          background: 'white',
          borderRadius: '50%',
          padding: '4px',
          boxShadow: '0 0 10px rgba(0,0,0,0.3)',
        }}
      >
        <Plane 
          size={20} 
          fill={color}
          color={color}
          style={{ 
            filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))'
          }}
        />
      </div>
    );
    
    const planeIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-plane-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    
    // Custom marker with the plane icon
    const marker = L.marker(planePosition, { icon: planeIcon });
    
    // Add click handler to show details
    marker.on('click', (e) => {
      setDetailsPosition([e.latlng.lat, e.latlng.lng]);
      setShowDetails(true);
    });
    
    marker.addTo(map);
    planeMarkerRef.current = marker;
    
    return () => {
      if (planeMarkerRef.current) {
        planeMarkerRef.current.remove();
      }
    };
  }, [planePosition, planeRotation, map, type]);
  
  // Add click handler to the path to show details
  const handlePathClick = (e: L.LeafletMouseEvent) => {
    setDetailsPosition([e.latlng.lat, e.latlng.lng]);
    setShowDetails(true);
  };
  
  // Create a popup component for flight details
  const FlightDetailsPopup = () => {
    if (!showDetails || !detailsPosition) return null;
    
    // Use Leaflet's popup
    useEffect(() => {
      const popup = L.popup({
        className: 'flight-details-popup',
        closeButton: true,
        closeOnClick: true,
        autoPan: true,
      })
        .setLatLng(detailsPosition)
        .setContent(`
          <div class="p-3">
            <h3 class="text-base font-semibold mb-2">${type === 'direct' ? 'Direct' : 'Connecting'} Flight</h3>
            <div class="text-sm space-y-1">
              ${flightNumber ? `<p><span class="font-medium">Flight:</span> ${flightNumber}</p>` : ''}
              ${airline ? `<p><span class="font-medium">Airline:</span> ${airline}</p>` : ''}
              <p><span class="font-medium">From:</span> ${departure.name} (${departure.code})</p>
              <p><span class="font-medium">To:</span> ${arrival.name} (${arrival.code})</p>
              ${departureTime ? `<p><span class="font-medium">Departure:</span> ${departureTime.split('T')[1]?.substring(0, 5) || departureTime}</p>` : ''}
              ${arrivalTime ? `<p><span class="font-medium">Arrival:</span> ${arrivalTime.split('T')[1]?.substring(0, 5) || arrivalTime}</p>` : ''}
              ${duration ? `<p><span class="font-medium">Duration:</span> ${duration}</p>` : ''}
              ${price ? `<p class="font-semibold text-primary">Price: $${price}</p>` : ''}
            </div>
          </div>
        `)
        .openOn(map);
      
      popup.on('close', () => {
        setShowDetails(false);
      });
      
      return () => {
        map.closePopup(popup);
      };
    }, [detailsPosition, showDetails]);
    
    return null;
  };
  
  // Determine path colors based on mode and type
  const getPathOptions = () => {
    // Use more visibility for the flight paths
    let color;
    
    if (type === 'direct') {
      // Bright green like in the reference image
      color = '#4CAF50';
    } else {
      // Amber color for connecting flights
      color = '#FFC107';
    }
    
    return {
      color,
      opacity: 0.85,
      weight: 3,
      className: 'flight-path-solid',
      // Enable interactions
      interactive: true,
    };
  };
  
  return (
    <>
      <Polyline 
        positions={arcPoints}
        pathOptions={getPathOptions()}
        eventHandlers={{
          click: handlePathClick,
          mouseover: (e) => {
            const path = e.target;
            path.setStyle({ weight: 5, opacity: 1 });
          },
          mouseout: (e) => {
            const path = e.target;
            path.setStyle({ weight: 3, opacity: 0.85 });
          }
        }}
      />
      
      <FlightDetailsPopup />
      
      {/* Add CSS for better visibility on top of map */}
      <style>{`
        .flight-path-solid {
          filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.7));
          cursor: pointer;
        }
        
        .custom-plane-icon {
          z-index: 1000;
          cursor: pointer;
        }
        
        .flight-details-popup .leaflet-popup-content-wrapper {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        
        .flight-details-popup .leaflet-popup-content {
          margin: 8px 10px;
          min-width: 200px;
        }
        
        .flight-details-popup .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.95);
        }
        
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default FlightPath;
