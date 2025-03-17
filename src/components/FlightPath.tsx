
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
    
    // Auto-zoom to selected flight
    if (isActive) {
      const bounds = L.latLngBounds([
        [departure.lat, departure.lng],
        [arrival.lat, arrival.lng]
      ]);
      
      // Add some padding for better view
      map.fitBounds(bounds, { 
        padding: [50, 50],
        animate: true,
        duration: 1 
      });
      
      // Initially set plane at departure
      setPlanePosition([departure.lat, departure.lng]);
      
      // Calculate initial bearing
      const bearing = getBearing(departure.lat, departure.lng, arrival.lat, arrival.lng);
      setPlaneRotation(bearing);
      
      // Animate plane along path
      let step = 0;
      const totalSteps = points.length - 1;
      const speed = Math.max(30, Math.min(80, 150 / totalSteps)); // Adaptive speed
      
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
  }, [departure, arrival, animated, isActive, type, map]);
  
  // Create a plane icon component that will be animated along the path
  const PlaneMarker = () => {
    if (!planePosition || !isActive) return null;
    
    // Create a custom plane marker with tilt effect
    const planeIconHtml = document.createElement('div');
    planeIconHtml.className = 'plane-marker';
    
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
    
    planeIconHtml.innerHTML = iconHtml;
    
    const planeIcon = L.divIcon({
      html: planeIconHtml,
      className: 'custom-plane-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    
    // Custom marker with the plane icon
    const marker = L.marker(planePosition, { icon: planeIcon });
    
    // Use effect to add/remove marker from map
    useEffect(() => {
      marker.addTo(map);
      
      return () => {
        marker.remove();
      };
    }, [planePosition, planeRotation]);
    
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
      opacity: isActive ? 1 : 0.75,
      weight: isActive ? 4 : 3,
      // No dashArray for solid lines as requested
      className: 'flight-path-solid'
    };
  };
  
  return (
    <>
      <Polyline 
        positions={arcPoints}
        pathOptions={getPathOptions()}
      />
      {isActive && (
        <PlaneMarker />
      )}
      
      {/* Add CSS for better visibility on top of map */}
      <style>{`
        .flight-path-solid {
          filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.7));
        }
        
        .custom-plane-icon {
          z-index: 1000;
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
