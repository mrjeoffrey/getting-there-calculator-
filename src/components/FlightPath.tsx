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
    console.log("Departure:", departure);
    console.log("Arrival:", arrival);
    
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
      
      console.log("Generated Arc Points:", points);
      setArcPoints(points);
      arcPointsRef.current = points; 
      
      setDisplayedPoints([points[0]]);
      
      const bearing = getBearing(departure.lat, departure.lng, arrival.lat, arrival.lng);
      setPlaneRotation(bearing);
      
      setTimeout(() => {
        console.log(`Starting zoom phase for ${departure.code} to ${arrival.code}`);
        startZoomingPhase();
      }, 500 + Math.random() * 1000);
    } catch (error) {
      console.error("Error initializing flight path:", error);
    }
    
    return cleanup;
  }, [departure, arrival]);
  
  useEffect(() => {
    if (arcPoints.length > 0) {
      console.log(`arcPoints updated: ${departure.code} to ${arrival.code}, length: ${arcPoints.length}`);
    }
  }, [arcPoints, departure, arrival]);
  
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
    
    const zoomMarkerHtml = ReactDOMServer.renderToString(
      <div className="zoom-animation-marker">
        <div className="zoom-circle"></div>
      </div>
    );
    
    const zoomMarkerIcon = L.divIcon({
      html: zoomMarkerHtml,
      className: 'zoom-marker-icon',
      iconSize: [80, 80],
      iconAnchor: [40, 40]
    });
    
    const zoomMarker = L.marker([departure.lat, departure.lng], { 
      icon: zoomMarkerIcon,
      zIndexOffset: 1000
    }).addTo(map);
    
    map.flyTo([departure.lat, departure.lng], 5, {
      duration: 2.5,
      easeLinearity: 0.5
    });
    
    console.log(`Zooming to ${departure.code} at [${departure.lat}, ${departure.lng}]`);
    
    setTimeout(() => {
      zoomMarker.remove();
      console.log(`Zoom complete, starting drawing phase for ${departure.code} to ${arrival.code}`);
      startDrawingPhase();
    }, 2500);
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
    
    const pulseMarkerHtml = ReactDOMServer.renderToString(
      <div className="drawing-animation-marker">
        <div className="pulse-circle" style={{
          backgroundColor: type === 'direct' ? '#4CAF50' : '#FFC107'
        }}></div>
      </div>
    );
    
    const pulseMarkerIcon = L.divIcon({
      html: pulseMarkerHtml,
      className: 'drawing-marker-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    
    let drawingMarker = L.marker(arcPointsRef.current[0], { 
      icon: pulseMarkerIcon,
      zIndexOffset: 5000
    }).addTo(map);
    drawingMarkerRef.current = drawingMarker;
    
    const drawingDuration = 4000;
    const totalPoints = arcPointsRef.current.length;
    const pointsPerFrame = Math.max(1, Math.ceil(totalPoints / (drawingDuration / 16)));
    
    let currentPointIndex = 1;
    
    const drawNextSegment = () => {
      if (currentPointIndex >= totalPoints) {
        console.log(`Drawing complete for ${departure.code} to ${arrival.code}`);
        if (drawingMarkerRef.current) {
          drawingMarkerRef.current.remove();
          drawingMarkerRef.current = null;
        }
        
        const completionMarkerHtml = ReactDOMServer.renderToString(
          <div className="completion-marker" style={{
            backgroundColor: type === 'direct' ? '#4CAF50' : '#FFC107'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        );
        
        const completionIcon = L.divIcon({
          html: completionMarkerHtml,
          className: 'completion-icon',
          iconSize: [60, 60],
          iconAnchor: [30, 30]
        });
        
        const completionMarker = L.marker(arcPointsRef.current[arcPointsRef.current.length - 1], { 
          icon: completionIcon,
          zIndexOffset: 5000
        }).addTo(map);
        
        map.fitBounds(L.latLngBounds([
          [departure.lat, departure.lng],
          [arrival.lat, arrival.lng]
        ]), {
          padding: [50, 50],
          duration: 1
        });
        
        setTimeout(() => {
          completionMarker.remove();
          console.log(`Starting flying phase for ${departure.code} to ${arrival.code}`);
          startFlyingPhase();
        }, 1500);
        
        return;
      }
      
      const newIndex = Math.min(totalPoints, currentPointIndex + pointsPerFrame);
      const newPoints = arcPointsRef.current.slice(0, newIndex);
      setDisplayedPoints(newPoints);
      
      if (drawingMarkerRef.current && newIndex > 0 && newPoints[newIndex - 1]) {
        drawingMarkerRef.current.setLatLng(newPoints[newIndex - 1]);
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
    
    const takeoffMarkerHtml = ReactDOMServer.renderToString(
      <div className="takeoff-animation">
        <div className="takeoff-rays"></div>
      </div>
    );
    
    const takeoffMarkerIcon = L.divIcon({
      html: takeoffMarkerHtml,
      className: 'takeoff-marker-icon',
      iconSize: [80, 80],
      iconAnchor: [40, 40]
    });
    
    const takeoffMarker = L.marker([departure.lat, departure.lng], { 
      icon: takeoffMarkerIcon,
      zIndexOffset: 5000
    }).addTo(map);
    
    setPlanePosition([departure.lat, departure.lng]);
    
    const speed = 80;
    let step = 0;
    const totalSteps = arcPointsRef.current.length - 1;
    
    const animate = () => {
      if (step < totalSteps) {
        const point = arcPointsRef.current[step];
        if (point) {
          setPlanePosition([point[0], point[1]]);
          
          if (step < totalSteps - 1) {
            const currPoint = arcPointsRef.current[step];
            const nextPoint = arcPointsRef.current[step + 1];
            if (currPoint && nextPoint) {
              const bearing = getBearing(currPoint[0], currPoint[1], nextPoint[0], nextPoint[1]);
              setPlaneRotation(bearing);
            }
          }
        }
        
        step++;
        animationRef.current = requestAnimationFrame(() => {
          setTimeout(animate, speed);
        });
      } else {
        if (arrival) {
          const arrivalMarkerHtml = ReactDOMServer.renderToString(
            <div className="arrival-animation">
              <div className="arrival-pulse"></div>
            </div>
          );
          
          const arrivalMarkerIcon = L.divIcon({
            html: arrivalMarkerHtml,
            className: 'arrival-marker-icon',
            iconSize: [80, 80],
            iconAnchor: [40, 40]
          });
          
          const arrivalMarker = L.marker([arrival.lat, arrival.lng], { 
            icon: arrivalMarkerIcon,
            zIndexOffset: 5000
          }).addTo(map);
          
          setTimeout(() => {
            arrivalMarker.remove();
            setAnimationComplete(true);
          }, 3000);
        }
        
        takeoffMarker.remove();
        
        console.log(`Flight animation complete for ${departure.code} to ${arrival.code}`);
        setAnimationComplete(true);
        
        setTimeout(() => {
          if (Math.random() > 0.5) {
            step = 0;
            animationRef.current = requestAnimationFrame(() => {
              animate();
            });
          }
        }, 8000);
      }
    };
    
    setTimeout(() => {
      console.log(`Plane taking off from ${departure.code}`);
      animate();
    }, 1000);
  };
  
  useEffect(() => {
    if (!planePosition) return;
    
    if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
    }
    
    const color = type === 'direct' ? '#4CAF50' : '#FFC107';
    
    const iconHtml = ReactDOMServer.renderToString(
      <div 
        className="plane-icon"
        style={{ 
          transform: `rotate(${planeRotation}deg)`,
          background: 'white',
          borderRadius: '50%',
          padding: '6px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.8)'
        }}
      >
        <Plane 
          size={30}
          fill={color}
          color={color}
          style={{ 
            filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.6))'
          }}
        />
      </div>
    );
    
    const planeIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-plane-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
    
    const marker = L.marker(planePosition, { 
      icon: planeIcon,
      zIndexOffset: 5000
    });
    
    marker.on('click', (e) => {
      if (e.originalEvent && e.latlng) {
        setDetailsPosition([e.latlng.lat, e.latlng.lng]);
        setShowDetails(true);
        setPopupExpanded(true);
      }
    });
    
    marker.addTo(map);
    planeMarkerRef.current = marker;
    
    return () => {
      if (planeMarkerRef.current) {
        planeMarkerRef.current.remove();
      }
    };
  }, [planePosition, planeRotation, map, type]);
  
  const handlePathHover = (e: L.LeafletMouseEvent) => {
    if (e && e.latlng) {
      setDetailsPosition([e.latlng.lat, e.latlng.lng]);
      setShowDetails(true);
      setPopupExpanded(false);
    }
  };
  
  const handlePathClick = (e: L.LeafletMouseEvent) => {
    if (e && e.latlng) {
      setDetailsPosition([e.latlng.lat, e.latlng.lng]);
      setShowDetails(true); 
      setPopupExpanded(true);
    }
  };
  
  const FlightDetailsPopup = () => {
    if (!showDetails || !detailsPosition || !departure || !arrival) return null;
    
    useEffect(() => {
      if (popupRef.current) {
        map.closePopup(popupRef.current);
      }
      
      const basicContent = `
        <div class="p-3 flight-popup">
          <div class="flex items-center justify-between">
            <h4 class="font-semibold text-primary">${airline || 'Airline'} ${flightNumber}</h4>
            <div class="popup-expand-btn bg-primary/10 hover:bg-primary/20 rounded-full p-1 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron ${popupExpanded ? 'rotate-180' : ''}"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
          <div class="text-sm ${type === 'direct' ? 'text-[#4CAF50]' : 'text-[#FFC107]'} font-medium">
            ${type === 'direct' ? 'Direct Flight' : 'Connecting Flight'}
          </div>
          <div class="flex justify-between items-center text-sm mt-1">
            <div>${departure.code} → ${arrival.code}</div>
            <div class="text-muted-foreground">${duration}</div>
          </div>
        </div>
      `;
      
      const expandedContent = `
        <div class="p-4 flight-popup">
          <div class="flex items-center justify-between">
            <h4 class="font-semibold text-primary">${airline || 'Airline'} ${flightNumber}</h4>
            <div class="popup-expand-btn bg-primary/10 hover:bg-primary/20 rounded-full p-1 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron rotate-180"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
          <div class="text-sm ${type === 'direct' ? 'text-[#4CAF50]' : 'text-[#FFC107]'} font-medium">
            ${type === 'direct' ? 'Direct Flight' : 'Connecting Flight'}
          </div>
          
          <div class="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
            <div class="col-span-2 flex justify-between items-center border-b pb-2 mb-1">
              <div class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span class="font-medium">Flight Info</span>
              </div>
              <div class="text-sm text-primary font-semibold">$${price}</div>
            </div>
            
            <div>
              <div class="text-xs text-muted-foreground">Departure</div>
              <div class="font-medium">${departure.code}</div>
              <div class="text-xs">${departure.city}</div>
              <div class="text-xs">${departureTime ? departureTime.split('T')[1]?.substring(0, 5) || departureTime : '-'}</div>
            </div>
            
            <div>
              <div class="text-xs text-muted-foreground">Arrival</div>
              <div class="font-medium">${arrival.code}</div>
              <div class="text-xs">${arrival.city}</div>
              <div class="text-xs">${arrivalTime ? arrivalTime.split('T')[1]?.substring(0, 5) || arrivalTime : '-'}</div>
            </div>
            
            <div class="col-span-2 mt-2">
              <div class="text-xs text-muted-foreground">Duration</div>
              <div class="font-medium">${duration}</div>
            </div>
          </div>
        </div>
      `;
      
      const popup = L.popup({
        className: 'flight-details-popup',
        closeButton: true,
        closeOnClick: false,
        autoClose: false,
        autoPan: true,
        offset: [0, -10]
      })
        .setLatLng(detailsPosition)
        .setContent(popupExpanded ? expandedContent : basicContent)
        .openOn(map);
      
      popupRef.current = popup;
      
      const expandBtn = document.querySelector('.popup-expand-btn');
      if (expandBtn) {
        expandBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          setPopupExpanded(!popupExpanded);
        });
      }
      
      popup.on('remove', () => {
        setShowDetails(false);
      });
      
      const popupElement = document.querySelector('.flight-details-popup');
      if (popupElement) {
        popupElement.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
      
      return () => {
        if (popupRef.current) {
          map.closePopup(popupRef.current);
        }
      };
    }, [detailsPosition, showDetails, popupExpanded]);
    
    return null;
  };
  
  const getPathOptions = () => {
    let color;
    
    if (type === 'direct') {
      color = '#4CAF50';
    } else {
      color = '#FFC107';
    }
    
    return {
      color,
      opacity: 0.9,
      weight: 4,
      className: 'flight-path-solid',
      interactive: true,
    };
  };
  
  return (
    <>
      <Polyline 
        positions={displayedPoints}
        pathOptions={{
          ...getPathOptions(),
          dashArray: animationPhase === 'drawing' ? '5, 10' : null,
          dashOffset: animationPhase === 'drawing' ? '10' : null,
          weight: animationPhase === 'drawing' ? 6 : 4,
        }}
        eventHandlers={{
          click: handlePathClick,
          mouseover: (e) => {
            if (e && e.target) {
              const path = e.target;
              path.setStyle({ weight: 6, opacity: 1 });
              if (e.originalEvent) {
                handlePathHover(e.originalEvent as unknown as L.LeafletMouseEvent);
              }
            }
          },
          mouseout: (e) => {
            if (e && e.target) {
              const path = e.target;
              path.setStyle({ 
                weight: animationPhase === 'drawing' ? 6 : 4, 
                opacity: 0.9 
              });
            }
          }
        }}
      />
      
      <FlightDetailsPopup />
      
      <style>{`
        .flight-path-solid {
          filter: drop-shadow(0 0 10px rgba(255, 255, 255, 1));
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 450 !important;
        }
        
        .custom-plane-icon {
          z-index: 5000 !important;
          cursor: pointer;
          transition: transform 0.3s ease;
          transform-origin: center center;
          animation: pulse-plane 2s infinite;
        }
        
        @keyframes pulse-plane {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        .zoom-animation-marker {
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        .zoom-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: rgba(0, 120, 255, 0.4);
          border: 4px solid rgba(0, 120, 255, 0.9);
          border-radius: 50%;
          box-shadow: 0 0 30px 10px rgba(0, 120, 255, 0.3);
          animation: zoom-pulse 1.5s infinite;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        .drawing-animation-marker {
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 5000 !important;
        }
        
        .pulse-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 30px;
          height: 30px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 30px 10px rgba(255, 255, 255, 0.9);
          animation: pulse-fast 0.8s infinite;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        .completion-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          background: #4CAF50;
          border-radius: 50%;
          color: white;
          box-shadow: 0 0 0 15px rgba(76, 175, 80, 0.4), 0 0 30px rgba(0, 0, 0, 0.5);
          animation: scale-pop 0.5s ease-out;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 5000 !important;
        }
        
        .takeoff-animation {
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 5000 !important;
        }
        
        .takeoff-rays {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          box-shadow: 0 0 0 30px rgba(255, 255, 255, 0.2), 0 0 50px rgba(255, 255, 255, 0.7);
          animation: takeoff-pulse 1s infinite;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        .arrival-animation {
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 5000 !important;
        }
        
        .arrival-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: rgba(76, 175, 80, 0.5);
          border: 5px solid rgba(76, 175, 80, 0.9);
          border-radius: 50%;
          box-shadow: 0 0 0 20px rgba(76, 175, 80, 0.3), 0 0 50px rgba(76, 175, 80, 0.8);
          animation: arrival-pulse 1s infinite;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        @keyframes zoom-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.7; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
        }
        
        @keyframes pulse-fast {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.7; }
        }
        
        @keyframes scale-pop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes takeoff-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.7; }
        }
        
        @keyframes arrival-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.7; }
        }
        
        .leaflet-overlay-pane {
          z-index: 450 !important;
        }
        
        .leaflet-marker-pane {
          z-index: 600 !important;
        }
        
        .leaflet-popup-pane {
          z-index: 700 !important;
        }
      `}</style>
    </>
  );
};

export default FlightPath;
