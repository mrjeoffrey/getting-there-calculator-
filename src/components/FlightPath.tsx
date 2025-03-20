
import React, { useEffect, useState, useRef } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Airport } from '../types/flightTypes';
import { calculateArcPoints, getBearing } from '../utils/flightUtils';
import { Plane, ChevronDown, Info } from 'lucide-react';
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
  const arcPointsRef = useRef<[number, number][]>([]);
  const [arcPoints, setArcPoints] = useState<[number, number][]>([]);
  const [planePosition, setPlanePosition] = useState<[number, number] | null>(null);
  const [planeRotation, setPlaneRotation] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsPosition, setDetailsPosition] = useState<[number, number]>([0, 0]);
  const [popupExpanded, setPopupExpanded] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'zooming' | 'drawing' | 'flying'>('idle');
  const [displayedPoints, setDisplayedPoints] = useState<[number, number][]>([]);
  const [animationComplete, setAnimationComplete] = useState(false);
  const animationRef = useRef<number | null>(null);
  const drawingRef = useRef<number | null>(null);
  const planeMarkerRef = useRef<L.Marker | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const drawingMarkerRef = useRef<L.Marker | null>(null);
  const map = useMap();
  
  const getFlightMinutes = () => {
    if (!duration) return 180;
    
    const durationParts = duration.match(/(\d+)h\s*(\d+)?m?/);
    if (durationParts) {
      const hours = parseInt(durationParts[1] || '0');
      const minutes = parseInt(durationParts[2] || '0');
      return hours * 60 + minutes;
    }
    return 180;
  };
  
  useEffect(() => {
    cleanup();
    
    if (!departure || !arrival || !departure.lat || !departure.lng || !arrival.lat || !arrival.lng) {
      console.error("Invalid departure or arrival data:", { departure, arrival });
      return;
    }
    
    console.log(`Starting animation for flight from ${departure.code} to ${arrival.code}`);
    
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
      
      setDisplayedPoints([points[0]]);
      
      const bearing = getBearing(departure.lat, departure.lng, arrival.lat, arrival.lng);
      setPlaneRotation(bearing);
      
      setTimeout(() => {
        startZoomingPhase();
      }, 500 + Math.random() * 500);
    } catch (error) {
      console.error("Error initializing flight path:", error);
    }
    
    return cleanup;
  }, [departure, arrival]);
  
  const cleanup = () => {
    console.log("Running cleanup...");
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (drawingRef.current) {
      cancelAnimationFrame(drawingRef.current);
      drawingRef.current = null;
    }
    if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
      planeMarkerRef.current = null;
    }
    if (popupRef.current && map) {
      map.closePopup(popupRef.current);
      popupRef.current = null;
    }
    if (drawingMarkerRef.current) {
      drawingMarkerRef.current.remove();
      drawingMarkerRef.current = null;
    }
  };
  
  const startZoomingPhase = () => {
    setAnimationPhase('zooming');
    console.log(`Zoom phase active: Flying to ${departure.code}`);
    
    // Fly to departure airport with a slightly higher zoom level for better visibility
    map.flyTo([departure.lat, departure.lng], 5, {
      duration: 2,
      easeLinearity: 0.5
    });
    
    console.log(`Zooming to ${departure.code} at [${departure.lat}, ${departure.lng}]`);
    
    setTimeout(() => {
      console.log(`Zoom complete, starting drawing phase for ${departure.code} to ${arrival.code}`);
      startDrawingPhase();
    }, 2000);
  };
  
  const startDrawingPhase = () => {
    if (arcPointsRef.current.length < 2) {
      console.error("Not enough points to draw path:", arcPointsRef.current);
      if (departure && arrival) {
        const newPoints = calculateArcPoints(
          departure.lat, 
          departure.lng, 
          arrival.lat, 
          arrival.lng
        );
        if (newPoints.length >= 2) {
          arcPointsRef.current = newPoints;
          setArcPoints(newPoints);
        } else {
          arcPointsRef.current = [[departure.lat, departure.lng], [arrival.lat, arrival.lng]];
          setArcPoints([[departure.lat, departure.lng], [arrival.lat, arrival.lng]]);
        }
      }
    }
    
    setAnimationPhase('drawing');
    console.log(`Drawing phase active: Creating path from ${departure.code} to ${arrival.code}`);
    
    setDisplayedPoints([arcPointsRef.current[0]]);
    
    const drawingDuration = 3000;
    const totalPoints = arcPointsRef.current.length;
    const pointsPerFrame = Math.max(1, Math.ceil(totalPoints / (drawingDuration / 16)));
    
    let currentPointIndex = 1;
    
    const drawNextSegment = () => {
      if (currentPointIndex >= totalPoints) {
        console.log(`Drawing complete for ${departure.code} to ${arrival.code}`);
        
        // After drawing, pan to follow the whole path
        map.fitBounds(L.latLngBounds([
          [departure.lat, departure.lng],
          [arrival.lat, arrival.lng]
        ]), {
          padding: [50, 50],
          duration: 1.5
        });
        
        setTimeout(() => {
          console.log(`Starting flying phase for ${departure.code} to ${arrival.code}`);
          startFlyingPhase();
        }, 1500);
        
        return;
      }
      
      const newIndex = Math.min(totalPoints, currentPointIndex + pointsPerFrame);
      const newPoints = arcPointsRef.current.slice(0, newIndex);
      setDisplayedPoints(newPoints);
      
      // Move map to follow the drawing path
      if (newIndex > 0 && newPoints[newIndex - 1]) {
        const midPoint = Math.floor(newIndex / 2);
        if (midPoint > 0 && midPoint < newPoints.length) {
          map.panTo(newPoints[midPoint], { duration: 0.5, easeLinearity: 0.5 });
        }
      }
      
      currentPointIndex = newIndex;
      
      drawingRef.current = requestAnimationFrame(() => {
        setTimeout(drawNextSegment, 16);
      });
    };
    
    setTimeout(() => {
      console.log(`Starting to draw path segments for ${departure.code} to ${arrival.code}`);
      drawingRef.current = requestAnimationFrame(drawNextSegment);
    }, 300);
  };
  
  const startFlyingPhase = () => {
    setAnimationPhase('flying');
    console.log(`Flying phase active: Plane taking off from ${departure.code} to ${arrival.code}`);
    
    setPlanePosition([departure.lat, departure.lng]);
    
    // Remove any existing plane marker
    if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
      planeMarkerRef.current = null;
    }
    
    // Create a better plane icon with color and fill
    const planeIconHtml = ReactDOMServer.renderToString(
      <div className="plane-icon" style={{ transform: `rotate(${planeRotation}deg)` }}>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill={type === 'direct' ? '#4CAF50' : '#FFC107'}
          stroke={isDarkMode ? 'white' : 'black'} 
          strokeWidth="1" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          <path d="M16.95 17.95l-4.24-4.24a1 1 0 0 0-1.42 0l-2.12 2.12a1 1 0 0 0 0 1.42l4.24 4.24a1 1 0 0 0 1.42 0l2.12-2.12a1 1 0 0 0 0-1.42z"></path>
          <path d="M14.83 14.83l-1.41-1.41a1 1 0 0 0-1.42 0l-2.12 2.12a1 1 0 0 0 0 1.42l1.41 1.41a1 1 0 0 0 1.42 0l2.12-2.12a1 1 0 0 0 0-1.42z"></path>
          <path d="M21.18 8.04l-5.3-5.3a1 1 0 0 0-1.42 0l-2.12 2.12a1 1 0 0 0 0 1.42l5.3 5.3a1 1 0 0 0 1.42 0l2.12-2.12a1 1 0 0 0 0-1.42z"></path>
        </svg>
      </div>
    );
    
    const planeIcon = L.divIcon({
      html: planeIconHtml,
      className: 'plane-marker',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    
    const planeMarker = L.marker([departure.lat, departure.lng], {
      icon: planeIcon,
      zIndexOffset: 6000
    }).addTo(map);
    
    planeMarkerRef.current = planeMarker;
    
    // Adjust speed based on flight duration for more realistic animation
    const flightMinutes = getFlightMinutes();
    const speed = Math.max(30, Math.min(60, 40 - flightMinutes / 60)); // Faster for shorter flights
    
    let step = 0;
    const totalSteps = arcPointsRef.current.length - 1;
    
    const animate = () => {
      if (step < totalSteps) {
        const point = arcPointsRef.current[step];
        if (point) {
          // Update plane position
          if (planeMarkerRef.current) {
            planeMarkerRef.current.setLatLng(point);
          }
          
          if (step < totalSteps - 1) {
            const currPoint = arcPointsRef.current[step];
            const nextPoint = arcPointsRef.current[step + 1];
            if (currPoint && nextPoint) {
              const newBearing = getBearing(currPoint[0], currPoint[1], nextPoint[0], nextPoint[1]);

              if (Math.abs(newBearing - planeRotation) > 3) {
                setPlaneRotation(newBearing);
                const newPlaneIconHtml = ReactDOMServer.renderToString(
                  <div className="plane-icon" style={{ transform: `rotate(${newBearing}deg)` }}>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="18" 
                      height="18" 
                      viewBox="0 0 24 24" 
                      fill={type === 'direct' ? '#4CAF50' : '#FFC107'}
                      stroke={isDarkMode ? 'white' : 'black'} 
                      strokeWidth="1" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      <path d="M16.95 17.95l-4.24-4.24a1 1 0 0 0-1.42 0l-2.12 2.12a1 1 0 0 0 0 1.42l4.24 4.24a1 1 0 0 0 1.42 0l2.12-2.12a1 1 0 0 0 0-1.42z"></path>
                      <path d="M14.83 14.83l-1.41-1.41a1 1 0 0 0-1.42 0l-2.12 2.12a1 1 0 0 0 0 1.42l1.41 1.41a1 1 0 0 0 1.42 0l2.12-2.12a1 1 0 0 0 0-1.42z"></path>
                      <path d="M21.18 8.04l-5.3-5.3a1 1 0 0 0-1.42 0l-2.12 2.12a1 1 0 0 0 0 1.42l5.3 5.3a1 1 0 0 0 1.42 0l2.12-2.12a1 1 0 0 0 0-1.42z"></path>
                    </svg>
                  </div>
                );
                
                const newPlaneIcon = L.divIcon({
                  html: newPlaneIconHtml,
                  className: 'plane-marker',
                  iconSize: [18, 18],
                  iconAnchor: [9, 9]
                });
                
                planeMarkerRef.current.setIcon(newPlaneIcon);
              }
            }
          }
        }
        
        step++;
        animationRef.current = requestAnimationFrame(() => {
          setTimeout(animate, speed);
        });
      } else {
        console.log(`Flight animation complete for ${departure.code} to ${arrival.code}`);
        setAnimationComplete(true);
        
        setTimeout(() => {
          if (Math.random() > 0.7) {
            createInfoPopup();
          }
        }, 1500);
      }
    };
    
    setTimeout(() => {
      console.log(`Starting plane animation for ${departure.code} to ${arrival.code}`);
      animationRef.current = requestAnimationFrame(animate);
    }, 100);
  };
  
  const createInfoPopup = () => {
    if (!planeMarkerRef.current || !map) return;
    
    const popupContent = ReactDOMServer.renderToString(
      <div className="flight-popup">
        <div className="flight-popup-header">
          <span className={`flight-type ${type === 'direct' ? 'direct' : 'connecting'}`}>
            {type === 'direct' ? 'Direct' : 'Connecting'}
          </span>
          <span className="flight-number">{flightNumber}</span>
        </div>
        <div className="flight-popup-content">
          <div className="flight-route">
            <div className="flight-airport">
              <div className="airport-code">{departure.code}</div>
              <div className="airport-time">{departureTime}</div>
            </div>
            <div className="flight-duration">
              <div className="duration-line"></div>
              <div className="duration-text">{duration}</div>
            </div>
            <div className="flight-airport">
              <div className="airport-code">{arrival.code}</div>
              <div className="airport-time">{arrivalTime}</div>
            </div>
          </div>
          <div className="flight-airline">
            <span>{airline}</span>
            {price > 0 && <span className="flight-price">${price}</span>}
          </div>
        </div>
      </div>
    );
    
    const popup = L.popup({
      closeButton: true,
      autoClose: false,
      className: `flight-info-popup ${type === 'direct' ? 'direct' : 'connecting'}`
    })
      .setLatLng(planeMarkerRef.current.getLatLng())
      .setContent(popupContent)
      .openOn(map);
    
    popupRef.current = popup;
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
            className: `flight-path ${animationComplete ? 'animation-complete' : ''}`
          }}
          eventHandlers={{
            click: () => {
              createInfoPopup();
            },
            mouseover: () => {
              setShowDetails(true);
              
              if (arcPoints.length > 0) {
                const midIndex = Math.floor(arcPoints.length / 2);
                const midPoint = arcPoints[midIndex];
                if (midPoint) {
                  setDetailsPosition(midPoint);
                }
              }
            },
            mouseout: () => {
              setShowDetails(false);
            }
          }}
        />
      )}
    </>
  );
};

export default FlightPath;
