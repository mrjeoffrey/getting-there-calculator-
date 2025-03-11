
import React, { useEffect, useState } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Airport } from '../types/flightTypes';
import { calculateArcPoints, getBearing } from '../utils/flightUtils';
import { Plane } from 'lucide-react';

interface FlightPathProps {
  departure: Airport;
  arrival: Airport;
  animated?: boolean;
  type?: 'direct' | 'connecting';
  isActive?: boolean;
}

const FlightPath: React.FC<FlightPathProps> = ({ 
  departure, 
  arrival, 
  animated = true,
  type = 'direct',
  isActive = false
}) => {
  const [arcPoints, setArcPoints] = useState<[number, number][]>([]);
  const [planePosition, setPlanePosition] = useState<[number, number] | null>(null);
  const [planeRotation, setPlaneRotation] = useState(0);
  const map = useMap();
  
  // Calculate arc points for the flight path
  useEffect(() => {
    const points = calculateArcPoints(
      departure.lat, 
      departure.lng, 
      arrival.lat, 
      arrival.lng,
      type === 'direct' ? 0.3 : 0.2
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
      const animationInterval = setInterval(() => {
        if (step < points.length - 1) {
          setPlanePosition(points[step]);
          
          // Calculate bearing between current and next point for rotation
          if (step < points.length - 2) {
            const currPoint = points[step];
            const nextPoint = points[step + 1];
            const bearing = getBearing(currPoint[0], currPoint[1], nextPoint[0], nextPoint[1]);
            setPlaneRotation(bearing);
          }
          
          step++;
        } else {
          clearInterval(animationInterval);
          setPlanePosition(null); // Hide plane at end
        }
      }, 100);
      
      return () => clearInterval(animationInterval);
    }
  }, [departure, arrival, animated, isActive, type]);
  
  // Create a plane icon component that will be animated along the path
  const PlaneMarker = () => {
    if (!planePosition || !isActive) return null;
    
    // Create a custom plane marker using Lucide-React icon
    const planeIconHtml = document.createElement('div');
    planeIconHtml.className = 'plane-marker';
    
    // Convert icon to HTML string
    const ReactDOMServer = require('react-dom/server');
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
        <Plane size={24} className="text-primary" />
      </div>
    );
    
    planeIconHtml.innerHTML = iconHtml;
    
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
  
  return (
    <>
      <Polyline 
        positions={arcPoints} 
        pathOptions={{ 
          color: type === 'direct' ? 'hsl(var(--primary))' : 'hsl(var(--accent))',
          opacity: isActive ? 0.8 : 0.4,
          weight: isActive ? 3 : 2,
          dashArray: type === 'direct' ? undefined : '5, 5',
        }}
      />
      {planePosition && isActive && (
        <PlaneMarker />
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
