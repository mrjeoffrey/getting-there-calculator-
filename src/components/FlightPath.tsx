import React, { useEffect, useState } from 'react';
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
}

const FlightPath: React.FC<FlightPathProps> = ({ 
  departure, 
  arrival, 
  animated = true,
  type = 'direct',
  isActive = false,
  isDarkMode = false
}) => {
  const [arcPoints, setArcPoints] = useState<[number, number][]>([]);
  const [planePosition, setPlanePosition] = useState<[number, number] | null>(null);
  const [planeRotation, setPlaneRotation] = useState(0);
  const map = useMap();
  
  // Calculate arc points for the flight path
  useEffect(() => {
    // Increase arc height for better visualization in globe view
    const arcHeight = type === 'direct' ? 0.35 : 0.25;
    
    const points = calculateArcPoints(
      departure.lat, 
      departure.lng, 
      arrival.lat, 
      arrival.lng,
      arcHeight
    );
    setArcPoints(points);
    
    // Initially set plane at departure
    if (animated && isActive) {
      setPlanePosition([departure.lat, departure.lng]);
      
      // Calculate initial bearing
      const bearing = getBearing(departure.lat, departure.lng, arrival.lat, arrival.lng);
      setPlaneRotation(bearing);
      
      // Animate plane along path
      let step = 0;
      const totalSteps = points.length - 1;
      const speed = Math.max(30, Math.min(100, 200 / totalSteps)); // Adaptive speed
      
      const animationInterval = setInterval(() => {
        if (step < totalSteps) {
          setPlanePosition(points[step]);
          
          // Calculate bearing between current and next point for rotation
          if (step < totalSteps - 1) {
            const currPoint = points[step];
            const nextPoint = points[step + 1];
            const bearing = getBearing(currPoint[0], currPoint[1], nextPoint[0], nextPoint[1]);
            setPlaneRotation(bearing);
          }
          
          step++;
        } else {
          clearInterval(animationInterval);
          
          // Reset animation after a pause
          setTimeout(() => {
            if (isActive) {
              setPlanePosition([departure.lat, departure.lng]);
              step = 0;
            } else {
              setPlanePosition(null); // Hide plane
            }
          }, 2000);
        }
      }, speed);
      
      return () => clearInterval(animationInterval);
    }
  }, [departure, arrival, animated, isActive, type]);
  
  // Create a plane icon component that will be animated along the path
  const PlaneMarker = () => {
    if (!planePosition || !isActive) return null;
    
    // Create a custom plane marker using Lucide-React icon
    const planeIconHtml = document.createElement('div');
    planeIconHtml.className = 'plane-marker';
    
    // Use different color class based on flight type and dark mode
    let colorClass = 'text-primary';
    
    if (type === 'connecting') {
      colorClass = 'text-yellow-500';
    } else if (isDarkMode) {
      colorClass = 'text-blue-300';
    }
    
    // Add trail effect
    const trailStyle = isDarkMode ? 
      'box-shadow: 0 0 8px rgba(255, 255, 255, 0.7), 0 0 16px rgba(0, 150, 255, 0.5);' : 
      'box-shadow: 0 0 8px rgba(0, 100, 255, 0.5);';
    
    const iconHtml = ReactDOMServer.renderToString(
      <div 
        className="plane-icon" 
        style={{ 
          transform: `rotate(${planeRotation}deg)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plane 
          size={24} 
          className={colorClass} 
          style={{ filter: isDarkMode ? 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.7))' : '' }}
        />
      </div>
    );
    
    planeIconHtml.innerHTML = iconHtml;
    planeIconHtml.style.cssText = trailStyle;
    
    const planeIcon = L.divIcon({
      html: planeIconHtml,
      className: 'custom-plane-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    
    return (
      <Marker position={planePosition} icon={planeIcon} />
    );
  };
  
  // Determine path colors based on mode and type
  const getPathOptions = () => {
    let color;
    let dashArray;
    
    if (type === 'direct') {
      color = isDarkMode ? 'rgba(100, 180, 255, 0.8)' : 'hsl(var(--primary))';
      dashArray = undefined;
    } else {
      color = isDarkMode ? 'rgba(255, 210, 0, 0.8)' : 'hsl(var(--accent))';
      dashArray = '5, 5';
    }
    
    return {
      color,
      opacity: isActive ? 0.8 : 0.4,
      weight: isActive ? 3 : 2,
      dashArray,
      // Add glow effect in dark mode
      className: isDarkMode ? 'flight-path-glow' : '',
    };
  };
  
  return (
    <>
      <Polyline 
        positions={arcPoints}
        pathOptions={getPathOptions()}
      />
      {planePosition && isActive && (
        <PlaneMarker />
      )}
      
      {/* Add CSS for glow effect */}
      {isDarkMode && (
        <style>{`
          .flight-path-glow {
            filter: drop-shadow(0 0 4px rgba(100, 180, 255, 0.7));
          }
        `}</style>
      )}
    </>
  );
};

// This component is needed because we're using the server-side rendering function
// But Leaflet's Marker isn't available on the server
const Marker = ({ position, icon }: any) => {
  const map = useMap();
  
  useEffect(() => {
    if (!position) return;
    
    const marker = L.marker(position, { icon }).addTo(map);
    
    return () => {
      map.removeLayer(marker);
    };
  }, [map, position, icon]);
  
  return null;
};

export default FlightPath;