import React, { useEffect, useState, useRef } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Airport } from '../types/flightTypes';
import { calculateArcPoints, getBearing } from '../utils/flightUtils';
import ReactDOMServer from 'react-dom/server';
import { Plane } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  onFlightSelect
}) => {
  const arcPointsRef = useRef<[number, number][]>([]);
  const [arcPoints, setArcPoints] = useState<[number, number][]>([]);
  const [planeRotation, setPlaneRotation] = useState(0);
  const [displayedPoints, setDisplayedPoints] = useState<[number, number][]>([]);
  const [animationComplete, setAnimationComplete] = useState(false);
  const drawingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const planeMarkersRef = useRef<L.Marker[]>([]);
  const currentIndexRef = useRef<number>(1);
  const isInitializedRef = useRef<boolean>(false);
  const map = useMap();
  
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
      console.error("Invalid departure or arrival data:", { departure, arrival });
      return;
    }
    
    console.log(`Initializing flight path from ${departure.code} to ${arrival.code}`);
    
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      
      const initTimer = setTimeout(() => {
        initializeFlightPath();
      }, 600);
      
      return () => clearTimeout(initTimer);
    }
    
    return cleanup;
  }, [departure, arrival]);
  
  const cleanup = () => {
    if (drawingTimerRef.current) {
      clearTimeout(drawingTimerRef.current);
      drawingTimerRef.current = null;
    }
    
    if (popupRef.current && map) {
      map.closePopup(popupRef.current);
      popupRef.current = null;
    }
    
    planeMarkersRef.current.forEach(marker => {
      marker.remove();
    });
    planeMarkersRef.current = [];
    
    currentIndexRef.current = 1;
  };
  
  const initializeFlightPath = () => {
    if (!departure || !arrival || !departure.lat || !departure.lng || !arrival.lat || !arrival.lng) return;
    
    setInitialMapView();
    
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
        console.error("ERROR: calculateArcPoints returned insufficient points!");
        return;
      }
      
      setArcPoints(points);
      arcPointsRef.current = points;
      
      calculateInitialRotation(points);
      
      setDisplayedPoints([points[0]]);
      
      setTimeout(() => {
        startPathDrawing();
      }, 800);
    } catch (error) {
      console.error("Error initializing flight path:", error);
    }
  };
  
  const setInitialMapView = () => {
    if (!departure || !arrival || !departure.lat || !departure.lng || !arrival.lat || !arrival.lng) return;
    
    const bounds = L.latLngBounds(
      [departure.lat, departure.lng],
      [arrival.lat, arrival.lng]
    );
    
    const paddedBounds = bounds.pad(0.3);
    
    map.fitBounds(paddedBounds, {
      animate: false,
      duration: 0
    });
  };
  
  const calculateInitialRotation = (points: [number, number][]) => {
    if (points.length < 2) return;
    
    const startPoint = points[0];
    const nextPoint = points[1];
    const initialBearing = getBearing(startPoint[0], startPoint[1], nextPoint[0], nextPoint[1]);
    setPlaneRotation(initialBearing);
  };
  
  const createPlaneMarkers = () => {
    if (planeMarkersRef.current.length > 0) return;
    
    const flights = flightInfo && flightInfo.length > 0 
      ? flightInfo 
      : [{
          flightNumber: flightNumber || `FL${Math.floor(Math.random() * 1000)}`,
          airline: airline || 'Airline',
          departureTime: departureTime || '09:00',
          arrivalTime: arrivalTime || '11:30',
          duration: duration || '2h 30m',
          price: price || Math.floor(Math.random() * 500) + 200
        }];
    
    flights.forEach((flight, index) => {
      const startPoint = arcPointsRef.current[0];
      const planeMarker = createSinglePlaneMarker(startPoint, planeRotation, flight, index);
      planeMarkersRef.current.push(planeMarker);
    });
  };
  
  const createSinglePlaneMarker = (position: [number, number], rotation: number, flight: any, index: number) => {
    if (!map) return null;
    
    const planeIconHtml = ReactDOMServer.renderToString(
      <div className="plane-marker">
        <Plane 
          size={24}
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
    
    const planeIcon = L.divIcon({
      html: planeIconHtml,
      className: 'plane-icon-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    
    const positionWithOffset: [number, number] = [
      position[0] + (index * 0.02),
      position[1] + (index * 0.02)
    ];
    
    const marker = L.marker(positionWithOffset, {
      icon: planeIcon,
      zIndexOffset: 1000 + index
    }).addTo(map);
    
    marker.options.title = flight.flightNumber;
    marker.flightData = flight;
    
    return marker;
  };
  
  const updatePlanePositions = (position: [number, number], nextPosition: [number, number] | null) => {
    planeMarkersRef.current.forEach((marker, index) => {
      if (!marker) return;
      
      const positionWithOffset: [number, number] = [
        position[0] + (index * 0.02),
        position[1] + (index * 0.02)
      ];
      
      marker.setLatLng(positionWithOffset);
      
      if (nextPosition) {
        const newBearing = getBearing(position[0], position[1], nextPosition[0], nextPosition[1]);
        
        const planeDiv = marker.getElement();
        if (planeDiv) {
          const svgElement = planeDiv.querySelector('svg');
          if (svgElement) {
            svgElement.style.transform = `rotate(${newBearing}deg)`;
          }
        }
      }
    });
  };
  
  const startPathDrawing = () => {
    const points = arcPointsRef.current;
    if (points.length < 2) return;
    
    currentIndexRef.current = 1;
    const totalPoints = points.length;
    
    const durationInMinutes = getDurationInMinutes();
    const drawAnimationDuration = Math.min(3000, Math.max(2000, durationInMinutes * 10));
    const pointDelay = drawAnimationDuration / totalPoints;
    
    const drawNextSegment = () => {
      if (currentIndexRef.current < totalPoints) {
        setDisplayedPoints(points.slice(0, currentIndexRef.current + 1));
        
        currentIndexRef.current++;
        
        drawingTimerRef.current = setTimeout(drawNextSegment, pointDelay);
      } else {
        setTimeout(() => {
          createPlaneMarkers();
          startFlightAnimation();
        }, 500);
      }
    };
    
    drawNextSegment();
  };
  
  const startFlightAnimation = () => {
    const points = arcPointsRef.current;
    if (points.length < 2) return;
    
    currentIndexRef.current = 0;
    const totalPoints = points.length;
    
    const durationInMinutes = getDurationInMinutes();
    const totalAnimationTime = Math.min(30000, Math.max(10000, durationInMinutes * 50));
    const pointDelay = totalAnimationTime / totalPoints;
    
    const animateNextStep = () => {
      if (currentIndexRef.current < totalPoints - 1) {
        const currentPosition = points[currentIndexRef.current];
        const nextPosition = currentIndexRef.current + 1 < totalPoints 
          ? points[currentIndexRef.current + 1] 
          : null;
          
        updatePlanePositions(currentPosition, nextPosition);
        
        currentIndexRef.current++;
        
        drawingTimerRef.current = setTimeout(animateNextStep, pointDelay);
      } else {
        console.log("Flight animation complete");
        setAnimationComplete(true);
        
        const finalPosition = points[points.length - 1];
        updatePlanePositions(finalPosition, null);
      }
    };
    
    animateNextStep();
  };
  
  const createFlightListPopup = (e: L.LeafletMouseEvent) => {
    if (!map) return;
    
    if (popupRef.current) {
      map.closePopup(popupRef.current);
    }
    
    const flights = flightInfo && flightInfo.length > 0 
      ? flightInfo 
      : [{
          flightNumber: flightNumber || `FL${Math.floor(Math.random() * 1000)}`,
          airline: airline || 'Airline',
          departureTime: departureTime || '09:00',
          arrivalTime: arrivalTime || '11:30',
          duration: duration || '2h 30m',
          price: price || Math.floor(Math.random() * 500) + 200
        }];
    
    const uniqueAirlines = new Map<string, number>();
    flights.forEach(flight => {
      const airlineName = flight.airline;
      uniqueAirlines.set(airlineName, (uniqueAirlines.get(airlineName) || 0) + 1);
    });
    
    const airlinesHtml = Array.from(uniqueAirlines.entries()).map(([airline, count]) => {
      return `
        <div class="airline-item" data-airline="${airline}">
          <div class="airline-name">${airline}</div>
          <div class="flight-count">${count} flight${count > 1 ? 's' : ''}</div>
        </div>
      `;
    }).join('');
    
    const popupContent = `
      <div class="flight-list-popup ${type === 'direct' ? 'direct' : 'connecting'}">
        <div class="flight-list-header">
          <span class="route-label">${departure.code} → ${arrival.code}</span>
          <span class="flight-type-label">${type === 'direct' ? 'Direct' : 'Connecting'}</span>
        </div>
        <div class="airlines-list">${airlinesHtml}</div>
      </div>
    `;
    
    const popup = L.popup({
      closeButton: true,
      autoClose: false,
      className: `flight-list-popup-container ${type === 'direct' ? 'direct' : 'connecting'}`
    })
      .setLatLng(e.latlng)
      .setContent(popupContent)
      .openOn(map);
    
    setTimeout(() => {
      const airlineItems = document.querySelectorAll('.airline-item');
      airlineItems.forEach(item => {
        item.addEventListener('click', () => {
          const airlineName = item.getAttribute('data-airline');
          const airlineFlights = flights.filter(f => f.airline === airlineName);
          
          if (type === 'direct' && airlineFlights.length > 0) {
            const flight = {
              ...airlineFlights[0],
              departureAirport: departure,
              arrivalAirport: arrival,
              direct: true
            };
            onFlightSelect && onFlightSelect(flight);
          } else if (type === 'connecting' && airlineFlights.length > 0) {
            const connectionInfo = {
              flights: airlineFlights.map(f => ({
                ...f,
                departureAirport: departure,
                arrivalAirport: arrival,
                direct: false
              })),
              totalDuration: duration,
              stopoverDuration: '2h 15m',
              price: airlineFlights.reduce((total, f) => total + (f.price || 0), 0)
            };
            onFlightSelect && onFlightSelect(connectionInfo);
          }
          
          map.closePopup(popup);
        });
      });
    }, 100);
    
    popupRef.current = popup;
  };
  
  const handlePathClick = (e: L.LeafletMouseEvent) => {
    createFlightListPopup(e);
  };
  
  const color = type === 'direct' ? '#4CAF50' : '#FFC107';
  const weight = isActive ? 4 : 3;
  const opacity = isActive ? 0.8 : 0.6;
  
  return (
    <>
      {displayedPoints.length >= 2 && (
        <Polyline
          positions={displayedPoints}
          pathOptions={{
            color,
            weight,
            opacity,
            dashArray: type === 'connecting' ? '5, 10' : '',
            className: `flight-path ${type} ${animationComplete ? 'animation-complete' : ''}`
          }}
          eventHandlers={{
            click: handlePathClick
          }}
        />
      )}
      <style>
        {`
          .flight-list-popup-container {
            min-width: 250px;
          }
          
          .flight-list-popup {
            width: 100%;
          }
          
          .flight-list-header {
            padding: 8px 12px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .flight-list-popup-container.direct .flight-list-header {
            background-color: rgba(76, 175, 80, 0.1);
          }
          
          .flight-list-popup-container.connecting .flight-list-header {
            background-color: rgba(255, 193, 7, 0.1);
          }
          
          .route-label {
            font-weight: bold;
            font-size: 14px;
          }
          
          .flight-type-label {
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 12px;
          }
          
          .flight-list-popup-container.direct .flight-type-label {
            background-color: #4CAF50;
            color: white;
          }
          
          .flight-list-popup-container.connecting .flight-type-label {
            background-color: #FFC107;
            color: #333;
          }
          
          .airlines-list {
            padding: 8px 0;
          }
          
          .airline-item {
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #f0f0f0;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          
          .airline-item:last-child {
            border-bottom: none;
          }
          
          .airline-item:hover {
            background-color: #f9f9f9;
          }
          
          .airline-name {
            font-weight: 500;
            font-size: 14px;
          }
          
          .flight-count {
            font-size: 12px;
            color: #666;
          }
          
          .flight-info-popup {
            min-width: 220px;
          }
          
          .flight-popup-header {
            padding: 6px 10px;
            border-radius: 4px 4px 0 0;
            color: white;
            display: flex;
            justify-content: space-between;
          }
          
          .flight-info-popup.direct .flight-popup-header {
            background-color: #4CAF50;
          }
          
          .flight-info-popup.connecting .flight-popup-header {
            background-color: #FFC107;
            color: #333;
          }
          
          .flight-popup-content {
            padding: 10px;
          }
          
          .flight-route {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
          }
          
          .flight-airport {
            text-align: center;
          }
          
          .airport-code {
            font-weight: bold;
            font-size: 14px;
          }
          
          .airport-time {
            font-size: 12px;
            color: #555;
          }
          
          .flight-duration {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            margin: 0 10px;
          }
          
          .duration-line {
            height: 2px;
            width: 100%;
            background-color: #ddd;
            position: relative;
          }
          
          .duration-text {
            font-size: 11px;
            color: #777;
            margin-top: 2px;
          }
          
          .flight-details {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            border-top: 1px solid #eee;
            padding-top: 8px;
          }
          
          .flight-price {
            font-weight: bold;
            color: #d32f2f;
          }
          
          .plane-icon-marker {
            z-index: 1500;
          }
          
          .plane-marker svg {
            transition: all 0.5s ease-in-out;
          }
          
          .flight-path {
            cursor: pointer;
          }
          
          .flight-path:hover {
            stroke-opacity: 1;
          }
          
          .flight-popup.multi-flights {
            max-height: 300px;
            overflow-y: auto;
          }
          
          .flight-popup-item.multi-flight {
            border: 1px solid #eee;
            border-radius: 4px;
            margin-bottom: 8px;
          }
          
          .flight-separator {
            height: 1px;
            background-color: #ddd;
            margin: 8px 0;
          }
          
          .leaflet-marker-icon {
            transition: transform 0.5s cubic-bezier(0.45, 0, 0.55, 1);
          }
        `}
      </style>
    </>
  );
};

export default FlightPath;
