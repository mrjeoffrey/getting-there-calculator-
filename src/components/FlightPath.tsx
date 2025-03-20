
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
  const [arcPoints, setArcPoints] = useState<[number, number][]>([]);
  const [planePosition, setPlanePosition] = useState<[number, number] | null>(null);
  const [planeRotation, setPlaneRotation] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsPosition, setDetailsPosition] = useState<[number, number]>([0, 0]);
  const [popupExpanded, setPopupExpanded] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'zooming' | 'drawing' | 'flying'>('idle');
  const [displayedPoints, setDisplayedPoints] = useState<[number, number][]>([]);
  const animationRef = useRef<number | null>(null);
  const drawingRef = useRef<number | null>(null);
  const planeMarkerRef = useRef<L.Marker | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const map = useMap();
  
  // Parse duration to get flight minutes for speed calculation
  const getFlightMinutes = () => {
    if (!duration) return 180; // Default duration
    
    const durationParts = duration.match(/(\d+)h\s*(\d+)?m?/);
    if (durationParts) {
      const hours = parseInt(durationParts[1] || '0');
      const minutes = parseInt(durationParts[2] || '0');
      return hours * 60 + minutes;
    }
    return 180; // Default if parsing fails
  };
  
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
    
    // Start with no visible points - we'll animate them in
    setDisplayedPoints([]);
    
    // Calculate initial bearing
    if (departure && arrival) {
      const bearing = getBearing(departure.lat, departure.lng, arrival.lat, arrival.lng);
      setPlaneRotation(bearing);
    }
    
    // Start animation sequence with zooming to origin
    setTimeout(() => {
      startZoomingPhase();
    }, 500 + Math.random() * 1000); // Staggered start
    
    // Clean up on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (drawingRef.current) {
        cancelAnimationFrame(drawingRef.current);
      }
      if (planeMarkerRef.current) {
        planeMarkerRef.current.remove();
      }
      if (popupRef.current) {
        map.closePopup(popupRef.current);
      }
    };
  }, [departure, arrival, type]);
  
  // Start by zooming into the origin airport
  const startZoomingPhase = () => {
    setAnimationPhase('zooming');
    
    if (departure) {
      // Zoom in to departure airport with animation
      map.flyTo([departure.lat, departure.lng], 6, {
        duration: 1.5,
        easeLinearity: 0.5
      });
      
      // After zoom completes, start drawing the path
      setTimeout(() => {
        startDrawingPhase();
      }, 1500);
    } else {
      // If no departure (shouldn't happen), skip to drawing
      startDrawingPhase();
    }
  };
  
  // Start the line drawing animation
  const startDrawingPhase = () => {
    if (!arcPoints.length) return;
    
    setAnimationPhase('drawing');
    
    // Initialize with just the starting point
    setDisplayedPoints([arcPoints[0]]);
    
    // Determine drawing speed based on path length
    const flightMinutes = getFlightMinutes();
    const drawingDuration = Math.min(2000, Math.max(1000, flightMinutes * 5)); // Between 1-2 seconds
    const totalPoints = arcPoints.length;
    const pointsPerFrame = Math.max(1, Math.ceil(totalPoints / (drawingDuration / 16))); // 16ms per frame approx
    
    let currentPointIndex = 1; // Start from 1 since we already have the first point
    
    const drawNextSegment = () => {
      if (currentPointIndex >= totalPoints) {
        // Drawing complete, start flying
        setTimeout(() => {
          // Fit view to see the entire flight path before plane starts
          if (departure && arrival) {
            map.fitBounds(L.latLngBounds([
              [departure.lat, departure.lng],
              [arrival.lat, arrival.lng]
            ]), { 
              padding: [50, 50],
              duration: 1
            });
          }
          
          setTimeout(() => {
            startFlyingPhase();
          }, 800); // Short delay before plane starts moving
        }, 500);
        return;
      }
      
      // Add next batch of points
      const newIndex = Math.min(totalPoints, currentPointIndex + pointsPerFrame);
      setDisplayedPoints(arcPoints.slice(0, newIndex));
      currentPointIndex = newIndex;
      
      // Continue drawing with visible animation
      drawingRef.current = requestAnimationFrame(drawNextSegment);
    };
    
    // Start drawing animation
    drawingRef.current = requestAnimationFrame(drawNextSegment);
  };
  
  // Start the plane flying animation after line is drawn
  const startFlyingPhase = () => {
    setAnimationPhase('flying');
    
    // Initialize with plane at departure
    if (departure) {
      setPlanePosition([departure.lat, departure.lng]);
    }
    
    // Calculate adaptive speed based on flight duration
    const flightMinutes = getFlightMinutes();
    const baseSpeed = 20; // milliseconds - faster to make animation more visible
    const maxDuration = 600; // 10 hours as max duration
    const minDuration = 60; // 1 hour as min duration
    const durationFactor = (flightMinutes - minDuration) / (maxDuration - minDuration);
    const speedFactor = Math.max(0.5, Math.min(2, 1 + durationFactor));
    const speed = Math.max(10, Math.min(40, baseSpeed * speedFactor)); // Faster animation
    
    // Use a hash of flightNumber or fallback to random
    let hashValue = 0;
    if (flightNumber) {
      hashValue = Math.abs(hashCode(flightNumber));
    } else {
      hashValue = Math.floor(Math.random() * 100000);
    }
    
    let step = 0; // Start from beginning
    const totalSteps = arcPoints.length - 1;
    
    const animate = () => {
      if (step < totalSteps) {
        const point = arcPoints[step];
        if (point) {
          setPlanePosition([point[0], point[1]]);
          
          // Calculate bearing for rotation
          if (step < totalSteps - 1) {
            const currPoint = arcPoints[step];
            const nextPoint = arcPoints[step + 1];
            if (currPoint && nextPoint) {
              const bearing = getBearing(currPoint[0], currPoint[1], nextPoint[0], nextPoint[1]);
              setPlaneRotation(bearing);
            }
          }
        }
        
        step++;
        animationRef.current = requestAnimationFrame(() => {
          setTimeout(animate, speed); // Use adaptive speed based on flight duration
        });
      } else {
        // Loop animation with pause at destination
        setTimeout(() => {
          step = 0;
          animationRef.current = requestAnimationFrame(() => {
            animate(); // Restart animation
          });
        }, 2000); // Longer pause before restart
      }
    };
    
    // Start animation
    animate();
  };
  
  // Helper function to hash string for consistent randomness
  const hashCode = (s: string) => {
    return s.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
  };
  
  // Create a plane icon component that will be animated along the path
  useEffect(() => {
    if (!planePosition) return;
    
    // Remove previous marker if exists
    if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
    }
    
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
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        <Plane 
          size={24} // Slightly larger plane
          fill={color}
          color={color}
          style={{ 
            filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))'
          }}
        />
      </div>
    );
    
    const planeIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-plane-icon',
      iconSize: [36, 36], // Larger size for better visibility
      iconAnchor: [18, 18]
    });
    
    // Custom marker with the plane icon
    const marker = L.marker(planePosition, { icon: planeIcon });
    
    // Add click handler to show details
    marker.on('click', (e) => {
      if (e.originalEvent && e.latlng) {
        setDetailsPosition([e.latlng.lat, e.latlng.lng]);
        setShowDetails(true);
        setPopupExpanded(true); // Start with expanded view on direct click
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
  
  // Handle hover/click on flight path
  const handlePathHover = (e: L.LeafletMouseEvent) => {
    if (e && e.latlng) {
      // Show basic popup with airline info on hover
      setDetailsPosition([e.latlng.lat, e.latlng.lng]);
      setShowDetails(true);
      setPopupExpanded(false); // Collapsed state on hover
    }
  };
  
  const handlePathClick = (e: L.LeafletMouseEvent) => {
    if (e && e.latlng) {
      // Show expanded details on click
      setDetailsPosition([e.latlng.lat, e.latlng.lng]);
      setShowDetails(true); 
      setPopupExpanded(true); // Expanded state on click
    }
  };
  
  // Create a popup component for flight details
  const FlightDetailsPopup = () => {
    if (!showDetails || !detailsPosition || !departure || !arrival) return null;
    
    // Use Leaflet's popup with expandable content
    useEffect(() => {
      // Close any existing popup
      if (popupRef.current) {
        map.closePopup(popupRef.current);
      }
      
      // Create popup content based on expanded state
      const basicContent = `
        <div class="p-2 flight-popup">
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
        <div class="p-3 flight-popup">
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
      
      // Create popup with appropriate content and make sure it closes with close button only
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
      
      // Add event listeners for expand/collapse button
      const expandBtn = document.querySelector('.popup-expand-btn');
      if (expandBtn) {
        expandBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          setPopupExpanded(!popupExpanded);
        });
      }
      
      // Only close popup when user clicks the close button
      popup.on('remove', () => {
        setShowDetails(false);
      });
      
      // Prevent map click from closing the popup
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
      opacity: 0.85,
      weight: 3,
      className: 'flight-path-solid',
      // Enable interactions
      interactive: true,
    };
  };
  
  // Render animation indicator based on phase
  const renderAnimationIndicator = () => {
    if (animationPhase === 'idle') return null;
    
    return (
      <div className="animation-phase-indicator">
        {animationPhase === 'zooming' && <div className="zoom-indicator"></div>}
        {animationPhase === 'drawing' && <div className="drawing-indicator"></div>}
        {animationPhase === 'flying' && <div className="flying-indicator"></div>}
      </div>
    );
  };
  
  return (
    <>
      {/* Draw only the currently displayed points from the animation */}
      <Polyline 
        positions={animationPhase === 'idle' ? [] : displayedPoints}
        pathOptions={{
          ...getPathOptions(),
          dashArray: animationPhase === 'drawing' ? '5, 10' : null, // Dashed line during drawing
          dashOffset: animationPhase === 'drawing' ? '10' : null,
        }}
        eventHandlers={{
          click: handlePathClick,
          mouseover: (e) => {
            if (e && e.target) {
              const path = e.target;
              path.setStyle({ weight: 5, opacity: 1 });
              if (e.originalEvent) {
                handlePathHover(e.originalEvent as unknown as L.LeafletMouseEvent);
              }
            }
          },
          mouseout: (e) => {
            if (e && e.target) {
              const path = e.target;
              path.setStyle({ weight: 3, opacity: 0.85 });
              // Don't hide popup on mouseout, let it stay until closed
            }
          }
        }}
      />
      
      <FlightDetailsPopup />
      {renderAnimationIndicator()}
      
      {/* Add CSS for better visibility on top of map */}
      <style>{`
        .flight-path-solid {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.9));
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .custom-plane-icon {
          z-index: 1000;
          cursor: pointer;
          transition: transform 0.3s ease;
          transform-origin: center center;
          animation: pulse-plane 2s infinite;
        }
        
        @keyframes pulse-plane {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        .flight-details-popup .leaflet-popup-content-wrapper {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        
        .flight-details-popup .leaflet-popup-content {
          margin: 8px 0;
          min-width: 220px;
        }
        
        .flight-details-popup .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.95);
        }
        
        .flight-popup {
          user-select: none;
        }
        
        .popup-expand-btn {
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        
        .popup-expand-btn:hover {
          transform: scale(1.1);
        }
        
        .chevron {
          transition: transform 0.3s ease;
        }
        
        /* Animation phase indicators */
        .zoom-indicator {
          position: absolute;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid white;
          animation: zoom-pulse 1s infinite;
          pointer-events: none;
        }
        
        .drawing-indicator {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: white;
          animation: draw-move 2s infinite;
          pointer-events: none;
        }
        
        .flying-indicator {
          position: absolute;
          width: 40px;
          height: 10px;
          background: rgba(255, 255, 255, 0.6);
          filter: blur(4px);
          animation: fly-pulse 1s infinite;
          pointer-events: none;
        }
        
        @keyframes zoom-pulse {
          0%, 100% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
        
        @keyframes draw-move {
          0% { transform: translateX(0); opacity: 0.8; }
          100% { transform: translateX(100px); opacity: 0.2; }
        }
        
        @keyframes fly-pulse {
          0%, 100% { opacity: 0.4; width: 40px; }
          50% { opacity: 0.8; width: 60px; }
        }
        
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        /* Fix popup flickering */
        .leaflet-popup {
          pointer-events: auto !important;
        }
        
        .leaflet-popup-content-wrapper {
          pointer-events: auto !important;
        }
        
        .leaflet-popup-content {
          pointer-events: auto !important;
        }
        
        /* Only close popup when close button is clicked */
        .leaflet-popup-close-button {
          display: block !important;
        }
      `}</style>
    </>
  );
};

export default FlightPath;
