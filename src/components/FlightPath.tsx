
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
  const drawingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const planeMarkerRef = useRef<L.Marker | null>(null);
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
    
    // console.log(`[${pathId.current}] Initializing flight path from ${departure.code} to ${arrival.code} (type: ${type}, legIndex: ${legIndex}/${totalLegs})`);
    
    isInitializedRef.current = true;
    
    // For connecting flights, apply the delay for subsequent legs
    const initTimer = setTimeout(() => {
      initializeFlightPath();
    }, type === 'connecting' ? legDelay : 0);
    
    return () => {
      clearTimeout(initTimer);
      cleanup();
    };
  }, [departure, arrival, type, isActive, legDelay]);
  
  // Separate effect for animation based on autoAnimate flag
  useEffect(() => {
    // Only start the animation when line drawing is complete, showPlane is true, and autoAnimate is true
    if (showPlane && !animationComplete && lineDrawingComplete && arcPointsRef.current.length > 0 && autoAnimate && !animationStarted) {
      // console.log(`[${pathId.current}] Animating flight from ${departure?.code} to ${arrival?.code} after line drawing complete (leg ${legIndex}/${totalLegs})`);
      setAnimationStarted(true);
      
      setTimeout(() => {
        createPlaneMarker();
        startFlightAnimation();
      }, 500); // Short delay after line completes
    }
  }, [showPlane, autoAnimate, lineDrawingComplete, animationComplete, animationStarted]);
  
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
    
    currentIndexRef.current = 1;
    setLineDrawingComplete(false);
    setAnimationStarted(false);
  };
  
  const initializeFlightPath = () => {
    if (!departure || !arrival || !departure.lat || !departure.lng || !arrival.lat || !arrival.lng) {
      console.error(`[${pathId.current}] Missing required airport data for flight path`);
      return;
    }
    
    const arcHeight = type === 'direct' ? 0.2 : 0.15;
    
    try {
      // console.log(`[${pathId.current}] Calculating arc points for ${departure.code} to ${arrival.code}`);
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
      
      // console.log(`[${pathId.current}] Generated ${points.length} arc points for flight path`);
      setArcPoints(points);
      arcPointsRef.current = points;
      
      calculateInitialRotation(points);
      
      setDisplayedPoints([points[0]]);
      
      setTimeout(() => {
        startPathDrawing();
      }, 300);
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
  
  const createPlaneMarker = () => {
    // Clear existing marker first
    if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
      planeMarkerRef.current = null;
    }
    
    // Only create plane if showPlane is true
    if (!showPlane) return;
    
    // console.log(`[${pathId.current}] Creating plane marker for ${type} flight (leg ${legIndex}/${totalLegs})`);
    
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
    
    const startPoint = arcPointsRef.current[0];
    planeMarkerRef.current = createSinglePlaneMarker(startPoint, planeRotation, flight);
  };
  
  const createSinglePlaneMarker = (position: [number, number], rotation: number, flight: any) => {
    if (!map) return null;
    
    const planeIconHtml = ReactDOMServer.renderToString(
      <div className="plane-marker">
        <Plane 
          size={18}
          fill={type === 'direct' ? '#4CAF50' : '#FFC107'}
          stroke={isDarkMode ? 'white' : 'black'} 
          strokeWidth={1.5}
          style={{ 
            transform: `rotate(${rotation}deg)`, 
            filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.4))'
          }}
        />
      </div>
    );
    
    const planeSize = 12; // Match this with <Plane size={planeSize} />
    const planeIcon = L.divIcon({
      html: planeIconHtml,
      className: 'plane-icon-marker',
      iconSize: [planeSize, planeSize],
      iconAnchor: [planeSize / 2, planeSize / 2], // Ensures center alignment
    });
    
    const marker = L.marker(position, {
      icon: planeIcon,
      zIndexOffset: 500
    }).addTo(map);
    
    marker.options.title = flight.flightNumber;
    marker.flightData = flight;

    // Add click handler for the marker
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
    if (!planeMarkerRef.current) return;
    
    planeMarkerRef.current.setLatLng(position);
    
    // Calculate and update plane rotation to align with flight path
    if (nextPosition) {
      // Get bearing between current and next position
      const newBearing = getBearing(position[0], position[1], nextPosition[0], nextPosition[1]);
      const leftTiltAngle = -40;
      
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
  
  const startPathDrawing = () => {
    const points = arcPointsRef.current;
    if (points.length < 2) return;
    
    // console.log(`[${pathId.current}] Starting path drawing animation for ${type} flight (leg ${legIndex}/${totalLegs})`);
    
    currentIndexRef.current = 1;
    const totalPoints = points.length;
    
    const durationInMinutes = getDurationInMinutes();
    const drawAnimationDuration = Math.min(3000, Math.max(1000, durationInMinutes * 5)); // Quicker line drawing
    const pointDelay = drawAnimationDuration / totalPoints;
    
    const drawNextSegment = () => {
      if (currentIndexRef.current < totalPoints) {
        setDisplayedPoints(points.slice(0, currentIndexRef.current + 1));
        
        currentIndexRef.current++;
        
        drawingTimerRef.current = setTimeout(drawNextSegment, pointDelay);
      } else {
        // console.log(`[${pathId.current}] Path drawing complete for ${type} flight (leg ${legIndex}/${totalLegs})`);
        setLineDrawingComplete(true);
      }
    };
    
    drawNextSegment();
  };
  
  const startFlightAnimation = () => {
    const points = arcPointsRef.current;
    if (points.length < 2) return;
    
    // console.log(`[${pathId.current}] Starting flight animation for ${type} flight (leg ${legIndex}/${totalLegs})`);
    
    currentIndexRef.current = 0;
    const totalPoints = points.length;
    
    const durationInMinutes = getDurationInMinutes();
    // Shorten animation time for better visual flow
    const totalAnimationTime = Math.min(20000, Math.max(10000, durationInMinutes * 40));
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
        // console.log(`[${pathId.current}] Flight animation complete for ${type} flight (leg ${legIndex}/${totalLegs})`);
        setAnimationComplete(true);
        
        const finalPosition = points[points.length - 1];
        updatePlanePosition(finalPosition, null);
        
        // Signal that this leg is complete so the next leg can start
        if (onLegComplete) {
          // console.log(`[${pathId.current}] Notifying leg completion for connection (leg ${legIndex}/${totalLegs})`);
          onLegComplete();
        }
      }
    };
    
    animateNextStep();
  };
  
  // Handle path click to select the flight
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
      <style>
        {`
          .plane-icon-marker {
            z-index: 500;
            cursor: pointer;
          }
          
          .plane-marker svg {
            transition: transform 0.3s ease-in-out;
            transform-origin: center;
          }
          
          .flight-path {
            cursor: pointer;
            z-index: 400;
          }
          
          .leaflet-marker-icon {
            transition: transform 0.3s cubic-bezier(0.45, 0, 0.55, 1);
          }
        `}
      </style>
    </>
  );
};

export default FlightPath;
