
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
    
    // Auto-zoom to selected flight
    if (isActive) {
      const bounds = L.latLngBounds([
        [departure.lat, departure.lng],
        [arrival.lat, arrival.lng]
      ]);
      
      // Use a slight padding for better view
      map.fitBounds(bounds, { 
        padding: [50, 50],
        animate: true,
        duration: 1.5 
      });
      
      // Initially set plane at departure
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
  }, [departure, arrival, animated, isActive, type, map]);
  
  // Create a plane icon component that will be animated along the path
  const PlaneMarker = () => {
    if (!planePosition || !isActive) return null;
    
    // Create a custom plane marker using Lucide-React icon
    const planeIconHtml = document.createElement('div');
    planeIconHtml.className = 'plane-marker';
    
    // Use different color class based on flight type and dark mode
    let colorClass = 'text-white';
    let bgColorClass = type === 'connecting' ? 'bg-yellow-500' : 'bg-primary';
    
    if (isDarkMode) {
      bgColorClass = type === 'connecting' ? 'bg-yellow-400' : 'bg-blue-400';
    }
    
    // Add trail effect
    const trailStyle = isDarkMode ? 
      'box-shadow: 0 0 12px rgba(255, 255, 255, 0.8), 0 0 20px rgba(0, 150, 255, 0.7);' : 
      'box-shadow: 0 0 12px rgba(0, 100, 255, 0.7);';
    
    const iconHtml = ReactDOMServer.renderToString(
      <div 
        className={`plane-icon ${bgColorClass} rounded-full p-1`}
        style={{ 
          transform: `rotate(${planeRotation}deg)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plane 
          size={18} 
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
    let color;
    
    if (type === 'direct') {
      color = isDarkMode ? '#4dabff' : '#0284c7'; // Solid blue color
    } else {
      color = isDarkMode ? '#ffc53d' : '#f59e0b'; // Solid yellow/orange color
    }
    
    return {
      color,
      opacity: isActive ? 1 : 0.4,
      weight: isActive ? 4 : 2,
      // Remove dashArray for solid lines
      className: isDarkMode ? 'flight-path-glow' : '',
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
      
      {/* Add CSS for glow effect */}
      {isDarkMode && (
        <style>{`
          .flight-path-glow {
            filter: drop-shadow(0 0 6px rgba(100, 180, 255, 0.8));
          }
        `}</style>
      )}
    </>
  );
};

export default FlightPath;
