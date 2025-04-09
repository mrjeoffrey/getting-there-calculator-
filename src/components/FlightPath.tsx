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
      console.log(`[${pathId.current}] Invalid departure or arrival data:`, { departure, arrival });
      return;
    }
    
    isInitializedRef.current = true;
    
    const initTimer = setTimeout(() => {
      initializeFlightPath();
    }, type === 'connecting' ? Math.min(300, legDelay) : 0);
    
    return () => {
      clearTimeout(initTimer);
      cleanup();
    };
  }, [departure, arrival, type, isActive, legDelay]);
  
  useEffect(() => {
    if (autoAnimate && !animationStarted) {
      setAnimationStarted(true);
      
      setTimeout(() => {
        drawLineThenStartPlane();
      }, 200);
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
    
    currentIndexRef.current = 1;
    setLineDrawingComplete(false);
    setAnimationStarted(false);
    setPlaneAnimationStarted(false);
  };
  
  const initializeFlightPath = () => {
    if (!departure || !arrival || !departure.lat || !departure.lng || !arrival.lat || !arrival.lng) {
      console.log(`[${pathId.current}] Missing required airport data for flight path`);
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
        console.log(`[${pathId.current}] ERROR: calculateArcPoints returned insufficient points!`);
        return;
      }
      
      setArcPoints(points);
      arcPointsRef.current = points;
      
      calculateInitialRotation(points);
      
      setDisplayedPoints([points[0]]);
      
    } catch (error) {
      console.log(`[${pathId.current}] Error initializing flight path:`, error);
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
    
    const planeSize = 18;
    const planeIcon = L.divIcon({
      html: planeIconHtml,
      className: 'plane-icon-marker',
      iconSize: [planeSize, planeSize],
      iconAnchor: [planeSize / 2, planeSize / 2],
    });
    
    const marker = L.marker(position, {
      icon: planeIcon,
      zIndexOffset: 2000
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
    if (!planeMarkerRef.current) return;
    
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
  
  const drawLineThenStartPlane = () => {
    const points = arcPointsRef.current;
    if (points.length < 2) return;
    
    const totalPoints = points.length;
    
    const durationInMinutes = getDurationInMinutes();
    const lineDrawTime = Math.min(4000, Math.max(2000, durationInMinutes * 10));
    const pointDelay = lineDrawTime / totalPoints;
    
    let currentDrawIndex = 1;
    
    const drawNextSegment = () => {
      if (currentDrawIndex < totalPoints) {
        setDisplayedPoints(points.slice(0, currentDrawIndex + 1));
        currentDrawIndex++;
        drawingTimerRef.current = setTimeout(drawNextSegment, pointDelay);
      } else {
        setLineDrawingComplete(true);
        
        setTimeout(() => {
          createPlaneMarker();
          setPlaneAnimationStarted(true);
          startFlightAnimation();
        }, 300);
      }
    };
    
    setDisplayedPoints([points[0]]);
    drawNextSegment();
  };
  
  const startFlightAnimation = () => {
    const points = arcPointsRef.current;
    if (points.length < 2) return;
    
    currentIndexRef.current = 0;
    const totalPoints = points.length;
    
    const durationInMinutes = getDurationInMinutes();
    
    const totalAnimationTime = Math.min(18000, Math.max(8000, durationInMinutes * 35));
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
        
        if (onLegComplete) {
          onLegComplete();
        }
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
          pathOptions={{
            color,
            weight,
            opacity,
            dashArray,
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
            z-index: 2000;
            cursor: pointer;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          .plane-marker svg {
            transition: transform 0.3s ease-in-out;
            transform-origin: center;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          .flight-path {
            cursor: pointer;
            z-index: 400;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          .leaflet-marker-icon {
            transition: transform 0.3s cubic-bezier(0.45, 0, 0.55, 1);
            visibility: visible !important;
            opacity: 1 !important;
          }
        `}
      </style>
    </>
  );
};

export default FlightPath;
