
import React, { useEffect, useState, useRef } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Airport } from '../types/flightTypes';
import { calculateArcPoints, getBearing } from '../utils/flightUtils';
import ReactDOMServer from 'react-dom/server';
import { Plane } from 'lucide-react';

declare module 'leaflet' {
  interface Marker {
    flightData?: any;
  }
}

interface FlightPathProps {
  departure: Airport;
  arrival: Airport;
  type?: 'direct' | 'connecting';
  isActive?: boolean;
  isDarkMode?: boolean;
  duration?: string;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  airline?: string;
  price?: number;
  flightInfo?: Array<{
    flightNumber: string;
    airline: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    price: number;
  }>;
  onFlightSelect?: (flight: any) => void;
  autoAnimate?: boolean;
  showPlane?: boolean;
  // Connection sequence props
  legIndex?: number;
  totalLegs?: number;
  legDelay?: number;
  connectionId?: string;
  onLegComplete?: () => void;
}

const FlightPath: React.FC<FlightPathProps> = ({ 
  departure, 
  arrival, 
  type = 'direct',
  isActive = false,
  isDarkMode = false,
  duration = '',
  flightNumber = '',
  departureTime = '',
  arrivalTime = '',
  airline = '',
  price = 0,
  flightInfo = [],
  onFlightSelect,
  autoAnimate = false,
  showPlane = true,
  legIndex = 0,
  totalLegs = 1,
  legDelay = 0,
  connectionId = '',
  onLegComplete
}) => {
  const arcPointsRef = useRef<[number, number][]>([]);
  const [arcPoints, setArcPoints] = useState<[number, number][]>([]);
  const [planeRotation, setPlaneRotation] = useState(0);
  const [displayedPoints, setDisplayedPoints] = useState<[number, number][]>([]);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [lineDrawingComplete, setLineDrawingComplete] = useState(false);
  const [animationStarted, setAnimationStarted] = useState(false);
  const [planeAnimationStarted, setPlaneAnimationStarted] = useState(false);
  const [planeVisible, setPlaneVisible] = useState(false);
  const drawingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const planeMarkerRef = useRef<L.Marker | null>(null);
  const departureMarkerRef = useRef<L.Marker | null>(null);
  const arrivalMarkerRef = useRef<L.Marker | null>(null);
  const currentIndexRef = useRef<number>(1);
  const isInitializedRef = useRef<boolean>(false);
  const map = useMap();
  
  const pathId = useRef<string>(`${type}-${departure?.code || 'unknown'}-${arrival?.code || 'unknown'}-${Math.random().toString(36).substr(2, 5)}`);
  
  const getDurationInMinutes = (): number => {
    if (duration) {
      const hourMatch = duration.match(/(\d+)h/);
      const minuteMatch = duration.match(/(\d+)m/);
      const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
      const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
      return hours * 60 + minutes;
    }
    return 150;
  };
  
  useEffect(() => {
    cleanup();
    
    if (!departure || !arrival || !departure.lat || !departure.lng || !arrival.lat || !arrival.lng) {
      console.error(`[${pathId.current}] Invalid departure or arrival data:`, { departure, arrival });
      return;
    }
    
    isInitializedRef.current = true;
    
    // Reduced initialization delay to almost immediate
    const initTimer = setTimeout(() => {
      initializeFlightPath();
    }, type === 'connecting' ? 100 : 0); // Reduced from legDelay to 100ms max
    
    return () => {
      clearTimeout(initTimer);
      cleanup();
    };
  }, [departure, arrival, type, isActive, legDelay]);
  
  useEffect(() => {
    if (autoAnimate && !animationStarted) {
      setAnimationStarted(true);
      
      // Draw line and start plane immediately
      drawLineThenStartPlane();
    }
  }, [autoAnimate, animationStarted]);
  
  const cleanup = () => {
    if (drawingTimerRef.current) {
      clearTimeout(drawingTimerRef.current);
      drawingTimerRef.current = null;
    }
    
    if (popupRef.current && map) {
      map.closePopup(popupRef.current);
      popupRef.current = null;
    }
    
    if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
      planeMarkerRef.current = null;
    }
    
    if (departureMarkerRef.current) {
      departureMarkerRef.current.remove();
      departureMarkerRef.current = null;
    }
    
    if (arrivalMarkerRef.current) {
      arrivalMarkerRef.current.remove();
      arrivalMarkerRef.current = null;
    }
    
    currentIndexRef.current = 1;
    setLineDrawingComplete(false);
    setAnimationStarted(false);
    setPlaneAnimationStarted(false);
    setPlaneVisible(false);
  };
  
  const initializeFlightPath = () => {
    if (!departure || !arrival || !departure.lat || !departure.lng || !arrival.lat || !arrival.lng) {
      console.error(`[${pathId.current}] Missing required airport data for flight path`);
      return;
    }
    
    const arcHeight = type === 'direct' ? 0.2 : 0.15;
    
    try {
      const points = calculateArcPoints(
        departure.lat, 
        departure.lng, 
        arrival.lat, 
        arrival.lng,
        arcHeight
      );
      
      if (!points || points.length < 2) {
        console.error(`[${pathId.current}] ERROR: calculateArcPoints returned insufficient points!`);
        return;
      }
      
      setArcPoints(points);
      arcPointsRef.current = points;
      
      calculateInitialRotation(points);
      
      // Show entire path immediately instead of just departure point
      setDisplayedPoints(points);
      
    } catch (error) {
      console.error(`[${pathId.current}] Error initializing flight path:`, error);
    }
  };
  
  const calculateInitialRotation = (points: [number, number][]) => {
    if (points.length < 2) return;
    
    const startPoint = points[0];
    const nextPoint = points[1];
    const initialBearing = getBearing(startPoint[0], startPoint[1], nextPoint[0], nextPoint[1]);
    setPlaneRotation(initialBearing);
  };
  
  // Create minimal event markers for takeoff/landing
  const createEventMarker = (position: [number, number], eventType: 'takeoff' | 'landing' | 'connection') => {
    if (!map) return null;
    
    const color = eventType === 'takeoff' ? '#4CAF50' : 
                  eventType === 'landing' ? '#F44336' : '#FFC107';
    
    // Simplified marker with no animation
    const dotHtml = `
      <div class="event-marker ${eventType}">
        <div class="dot" style="
          width: 10px;
          height: 10px;
          background-color: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(0,0,0,0.3);
        "></div>
      </div>
    `;
    
    const icon = L.divIcon({
      html: dotHtml,
      className: `${eventType}-event-marker`,
      iconSize: [10, 10],
      iconAnchor: [5, 5]
    });
    
    const marker = L.marker(position, {
      icon: icon,
      zIndexOffset: 1000
    }).addTo(map);
    
    // Remove marker after shorter duration
    setTimeout(() => {
      marker.remove();
    }, eventType === 'connection' ? 4000 : 3000); // Shorter display times
    
    return marker;
  };
  
  const createPlaneMarker = () => {
    if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
      planeMarkerRef.current = null;
    }
    
    if (!showPlane) return;
    
    const flight = flightInfo && flightInfo.length > 0 
      ? flightInfo[0] 
      : {
          flightNumber: flightNumber || `FL${Math.floor(Math.random() * 1000)}`,
          airline: airline || 'Airline',
          departureTime: departureTime || '09:00',
          arrivalTime: arrivalTime || '11:30',
          duration: duration || '2h 30m',
          price: price || Math.floor(Math.random() * 500) + 200
        };
    
    // Create takeoff point with minimal delay
    const startPoint = arcPointsRef.current[0];
    createEventMarker(startPoint, legIndex === 0 ? 'takeoff' : 'connection');
    
    // Show plane almost immediately
    setTimeout(() => {
      planeMarkerRef.current = createSinglePlaneMarker(startPoint, planeRotation, flight);
      setPlaneVisible(true);
    }, 200); // Reduced from 1000ms to 200ms
  };
  
  const createSinglePlaneMarker = (position: [number, number], rotation: number, flight: any) => {
    if (!map) return null;
    
    // Make plane more visible
    const planeIconHtml = ReactDOMServer.renderToString(
      <div className="plane-marker">
        <Plane 
          size={20} // Increased from 18 to 20
          fill={type === 'direct' ? '#4CAF50' : '#FFC107'}
          stroke={isDarkMode ? 'white' : 'black'} 
          strokeWidth={1.5}
          style={{ 
            transform: `rotate(${rotation}deg)`, 
            filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.6))'
          }}
        />
      </div>
    );
    
    const planeSize = 20; // Increased from 18
    const planeIcon = L.divIcon({
      html: planeIconHtml,
      className: 'plane-icon-marker',
      iconSize: [planeSize, planeSize],
      iconAnchor: [planeSize / 2, planeSize / 2],
    });
    
    const marker = L.marker(position, {
      icon: planeIcon,
      zIndexOffset: 1500 // Increased from 500 to make sure planes are above everything
    }).addTo(map);
    
    marker.options.title = flight.flightNumber;
    marker.flightData = flight;

    marker.on('click', () => {
      if (onFlightSelect) {
        onFlightSelect({
          id: connectionId || pathId.current,
          flightNumber: flight.flightNumber,
          airline: flight.airline,
          departureTime: flight.departureTime,
          arrivalTime: flight.arrivalTime,
          duration: flight.duration
        });
      }
    });
    
    return marker;
  };
  
  const updatePlanePosition = (position: [number, number], nextPosition: [number, number] | null) => {
    if (!planeMarkerRef.current || !planeVisible) return;
    
    planeMarkerRef.current.setLatLng(position);
    
    if (nextPosition) {
      const newBearing = getBearing(position[0], position[1], nextPosition[0], nextPosition[1]);
      const leftTiltAngle = -35;
      
      const planeDiv = planeMarkerRef.current.getElement();
      if (planeDiv) {
        const svgElement = planeDiv.querySelector('svg');
        if (svgElement) {
          svgElement.style.transform = `rotate(${newBearing + leftTiltAngle}deg)`;
          svgElement.style.transformOrigin = 'center';
        }
      }
    }
  };
  
  // Draw line immediately then start plane
  const drawLineThenStartPlane = () => {
    const points = arcPointsRef.current;
    if (points.length < 2) return;
    
    // Skip the line animation and show full path immediately
    setDisplayedPoints(points);
    setLineDrawingComplete(true);
    
    // Start plane animation with minimal delay
    setTimeout(() => {
      createPlaneMarker();
      setPlaneAnimationStarted(true);
      startFlightAnimation();
    }, 100); // Reduced from 500ms to 100ms
  };
  
  const startFlightAnimation = () => {
    const points = arcPointsRef.current;
    if (points.length < 2) return;
    
    currentIndexRef.current = 0;
    const totalPoints = points.length;
    
    const durationInMinutes = getDurationInMinutes();
    
    // Speed up animation significantly (30-50% faster)
    const totalAnimationTime = Math.min(12000, Math.max(5000, durationInMinutes * 20));
    const pointDelay = totalAnimationTime / totalPoints;
    
    const animateNextStep = () => {
      if (currentIndexRef.current < totalPoints - 1) {
        const currentPosition = points[currentIndexRef.current];
        const nextPosition = currentIndexRef.current + 1 < totalPoints 
          ? points[currentIndexRef.current + 1] 
          : null;
          
        updatePlanePosition(currentPosition, nextPosition);
        
        currentIndexRef.current++;
        
        drawingTimerRef.current = setTimeout(animateNextStep, pointDelay);
      } else {
        setAnimationComplete(true);
        
        const finalPosition = points[points.length - 1];
        updatePlanePosition(finalPosition, null);
        
        // Create landing/connection marker
        const eventType = legIndex < totalLegs - 1 ? 'connection' : 'landing';
        createEventMarker(finalPosition, eventType);
        
        // Reduced delay before removing plane and triggering next leg
        setTimeout(() => {
          if (planeMarkerRef.current) {
            planeMarkerRef.current.remove();
            planeMarkerRef.current = null;
          }
          
          if (onLegComplete) {
            onLegComplete();
          }
        }, 800); // Reduced from 2000ms to 800ms
      }
    };
    
    animateNextStep();
  };
  
  const handlePathClick = () => {
    if (onFlightSelect) {
      onFlightSelect({
        id: connectionId || pathId.current,
        flightNumber,
        airline,
        departureTime,
        arrivalTime,
        duration
      });
    }
  };
  
  const color = type === 'direct' ? '#4CAF50' : '#FFC107';
  const weight = isActive ? 3 : 2;
  const opacity = isActive ? 0.8 : 0.6;
  const dashArray = type === 'connecting' ? '5, 8' : '';
  
  return (
    <>
      {displayedPoints.length >= 2 && (
        <Polyline
          positions={displayedPoints}
          interactive={false}
          pathOptions={{
            color,
            weight,
            opacity,
            className: `flight-path ${type} ${animationComplete ? 'animation-complete' : ''}`
          }}
          eventHandlers={{
            click: handlePathClick
          }}
        />
      )}
      <style>{`
        .plane-icon-marker {
          z-index: 1500 !important;
          cursor: pointer;
          pointer-events: auto !important;
          visibility: visible !important;
        }
        
        .plane-marker svg {
          transition: transform 0.2s ease-in-out;
          transform-origin: center;
          visibility: visible !important;
        }
        
        .flight-path {
          cursor: pointer;
          z-index: 400;
          visibility: visible !important;
        }
        
        .leaflet-marker-icon {
          transition: transform 0.2s cubic-bezier(0.45, 0, 0.55, 1);
          visibility: visible !important;
        }
        
        .event-marker .dot {
          z-index: 1000;
        }
        
        .takeoff-event-marker, .landing-event-marker, .connection-event-marker {
          z-index: 1000 !important;
          visibility: visible !important;
          pointer-events: none;
        }
      `}</style>
    </>
  );
};

export default FlightPath;
